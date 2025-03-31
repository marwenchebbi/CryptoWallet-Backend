import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from './schemas/transaction.schema';
import { Currency } from '../currency/schemas/currency.schema';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { TransactionType } from './dtos/transaction-type.dto';
import { User } from '../auth/schemas/user.schema';
import { errors } from '../../errors/errors.config';

// Import contracts and web3 from a config module
const {
    web3,
    proxymContract,
    tradeContract,
    usdtContract,
    PROXYM_CONTRACT_ADDRESS,
    TRADE_CONTRACT_ADDRESS,
} = require('../../config/contracts-config');

@Injectable()
export class TransactionService {
    constructor(
        @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
        @InjectModel(Currency.name) private currencyModel: Model<Currency>,
        @InjectModel(User.name) private userModel: Model<User>,
    ) {}

    // Transfer PRX token
    async transferToken(transactionDTO: CreateTransactionDto): Promise<void> {
        await this.transferTokenGeneric(
            transactionDTO,
            proxymContract,
            'PRX',
            (from, to, weiAmount) => tradeContract.methods.transferToken(from, to, weiAmount),
        );
    }

    // Transfer USDT token
    async transferUSDT(transactionDTO: CreateTransactionDto): Promise<void> {
        await this.transferTokenGeneric(
            transactionDTO,
            usdtContract,
            'USDT',
            (from, to, weiAmount) => tradeContract.methods.transferUSDT(from, to, weiAmount),
        );
    }

    // Buy PRX tokens with USDT
    async buyPRX(transactionDTO: CreateTransactionDto): Promise<void> {
        await this.transferTokenGeneric(
            transactionDTO,
            usdtContract, // USDT is spent
            'USDT',
            (from, _, weiAmount) => tradeContract.methods.buyTokens(weiAmount),
            'PRX', // PRX is received
        );
    }

    // Sell PRX tokens for USDT
    async sellPRX(transactionDTO: CreateTransactionDto): Promise<void> {
        await this.transferTokenGeneric(
            transactionDTO,
            proxymContract, // PRX is spent
            'PRX',
            (from, _, weiAmount) => tradeContract.methods.sellTokens(weiAmount),
            'USDT', // USDT is received
        );
    }

    // Generic method to handle token transfers or trades
    private async transferTokenGeneric(
        transactionDTO: CreateTransactionDto,
        contract: any,
        currencySymbol: string,
        transferMethod: (from: string, to: string | undefined, weiAmount: string) => any,
        receivedCurrencySymbol?: string,
    ): Promise<void> {
        const { amount, senderAddress: from, receiverAddress: to } = transactionDTO;

        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = 1000000;
        const weiAmount = web3.utils.toWei(amount, 'ether');

        // Check sender ETH balance
        const balance = await web3.eth.getBalance(from);
        const upfrontCost = BigInt(gasPrice) * BigInt(gasLimit) * BigInt(2);
        if (BigInt(balance) < upfrontCost) {
            throw new BadRequestException({
                ...errors.insufficientFunds,
                message: `${errors.insufficientFunds.message}: ${web3.utils.fromWei(balance, 'ether')} ETH available`,
            });
        }

        // Approve the transaction
        await this.approveTransaction(from, contract, TRADE_CONTRACT_ADDRESS, weiAmount);

        // Send the transfer or trade transaction
        const tx = await transferMethod(from, to, weiAmount).send({
            from,
            gasPrice,
            gas: gasLimit,
        });

        const effectiveSymbol = receivedCurrencySymbol || currencySymbol;
        const currency = await this.currencyModel.findOne({ symbol: effectiveSymbol });
        if (!currency) {
            throw new InternalServerErrorException({
                ...errors.currencyNotFound,
                message: `${errors.currencyNotFound.message}: ${effectiveSymbol} not found`,
            });
        }

        await this.createTransferTransaction(amount, currency._id, tx.transactionHash, from, to, contract, receivedCurrencySymbol);
    }

    // Approve the trade contract to spend tokens from a given contract
    async approveTransaction(from: string, contract: any, addressToApprove: string, weiAmount: string): Promise<void> {
        const gasPrice = await web3.eth.getGasPrice();
        await contract.methods.approve(addressToApprove, weiAmount).send({
            from,
            gasPrice,
            gas: 1000000,
        });
    }

    // Store the transaction in the database
    async createTransferTransaction(
        amount: string,
        currencyId: any,
        hashedTx: string,
        senderAddress: string,
        receiverAddress: string | undefined,
        contract: any,
        receivedCurrencySymbol?: string,
    ): Promise<Transaction> {
        const sender = await this.userModel.findOne({ walletAddress: senderAddress });
        if (!sender) {
            throw new NotFoundException(errors.userNotFound);
        }

        let receiver: User | null = null;
        if (receiverAddress) {
            receiver = await this.userModel.findOne({ walletAddress: receiverAddress });
            if (!receiver) {
                throw new NotFoundException(errors.userNotFound);
            }
        }

        const transaction = await this.transactionModel.create({
            type: receiverAddress ? TransactionType.TRANSFER : TransactionType.TRADING,
            amount: Number(amount),
            currency_id: currencyId,
            hashed_TX: hashedTx,
            sender_id: sender._id,
            receiver_id: receiver?._id,
        });

        if (!transaction) {
            throw new InternalServerErrorException(errors.transactionCreationFailed);
        }

        // Update balances
        if (receivedCurrencySymbol) {
            // Trade scenario (buy or sell)
            const spentContract = contract === proxymContract ? proxymContract : usdtContract;
            const receivedContract = receivedCurrencySymbol === 'PRX' ? proxymContract : usdtContract;
            await this.updateWalletInfo(senderAddress, spentContract, spentContract === proxymContract ? 'prxBalance' : 'usdtBalance');
            await this.updateWalletInfo(senderAddress, receivedContract, receivedContract === proxymContract ? 'prxBalance' : 'usdtBalance');
        } else {
            // Transfer scenario
            await this.updateWalletInfo(senderAddress, contract, contract === proxymContract ? 'prxBalance' : 'usdtBalance');
            if (receiverAddress && receiver) {
                await this.updateWalletInfo(receiverAddress, contract, contract === proxymContract ? 'prxBalance' : 'usdtBalance');
            }
        }

        return transaction;
    }

    // Update user wallet info (balances) after a transaction
    async updateWalletInfo(userAddress: string, contract: any, field: 'prxBalance' | 'usdtBalance'): Promise<any> {
        const balanceWei = await contract.methods.balanceOf(userAddress).call();
        const balance = web3.utils.fromWei(balanceWei, 'ether');

        const user = await this.userModel.updateOne(
            { walletAddress: userAddress },
            { $set: { [field]: Number(balance) } },
        );

        if (!user.modifiedCount) {
            throw new InternalServerErrorException({
                ...errors.walletUpdateFailed,
                message: `${errors.walletUpdateFailed.message} for ${userAddress}`,
            });
        }

        return user;
    }
}