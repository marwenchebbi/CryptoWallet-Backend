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
        const { amount, senderAddress: from, receiverAddress: to } = transactionDTO;

        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = 1000000;
        const weiAmount = web3.utils.toWei(amount, 'ether');

        // Check sender balance
        const balance = await web3.eth.getBalance(from);
        const upfrontCost = BigInt(gasPrice) * BigInt(gasLimit) * BigInt(2); // Approve + transfer
        if (BigInt(balance) < upfrontCost) {
            throw new BadRequestException({
                ...errors.insufficientFunds,
                message: `${errors.insufficientFunds.message}: ${web3.utils.fromWei(balance, 'ether')} ETH available`,
            });
        }

        // Approve the transaction
        await this.approveTransaction(from, proxymContract, TRADE_CONTRACT_ADDRESS, weiAmount);

        // Send the transfer transaction
        const tx = await tradeContract.methods.transferToken(from, to, weiAmount).send({
            from,
            gasPrice,
            gas: gasLimit,
        });

        const currency = await this.currencyModel.findOne({ symbol: 'PRX' });
        if (!currency) {
            throw new InternalServerErrorException(errors.currencyNotFound);
        }

        await this.createTransferTransaction(amount, currency._id, tx.transactionHash, from, to);
    }

    // Approve the trade contract to spend tokens from the proxym contract
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
        receiverAddress: string,
    ): Promise<Transaction> {
        const sender = await this.userModel.findOne({ walletAddress: senderAddress });
        const receiver = await this.userModel.findOne({ walletAddress: receiverAddress });

        if (!sender || !receiver) {
            throw new NotFoundException(errors.userNotFound);
        }

        const transaction = await this.transactionModel.create({
            type: TransactionType.TRANSFER,
            amount: Number(amount),
            currency_id: currencyId,
            hashed_TX: hashedTx,
            sender_id: sender._id,
            receiver_id: receiver._id,
        });

        if (!transaction) {
            throw new InternalServerErrorException(errors.transactionCreationFailed);
        }

        await this.updateWalletInfo(senderAddress);
        await this.updateWalletInfo(receiverAddress);

        return transaction;
    }

    // Update user wallet info (balances) after a transaction
    async updateWalletInfo(userAddress: string): Promise<any> {
        const balanceWei = await proxymContract.methods.balanceOf(userAddress).call();
        const balance = web3.utils.fromWei(balanceWei, 'ether');

        const user = await this.userModel.updateOne(
            { walletAddress: userAddress },
            { $set: { prxBalance: Number(balance) } },
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