import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Transaction } from './schemas/transaction.schema';
import { Currency } from '../currency/schemas/currency.schema';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { TransactionType } from './dtos/transaction-type.dto';
import { User } from '../auth/schemas/user.schema';
import { errors } from '../../errors/errors.config';

const {
    web3,
    proxymContract,
    tradeContract,
    usdtContract,
    TRADE_CONTRACT_ADDRESS,
} = require('../../config/contracts-config');

@Injectable()
export class TransactionService {
    constructor(
        @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
        @InjectModel(Currency.name) private currencyModel: Model<Currency>,
        @InjectModel(User.name) private userModel: Model<User>,
    ) {}

    async buyPRX(transactionDTO: CreateTransactionDto): Promise<void> {
        const { amount, inputCurrency   } = transactionDTO;
        let usdtAmountToSend = amount;
        let receivedPRXAmount: string | undefined;

        if (inputCurrency === 'PRX') {
            const prxBalanceWei = await proxymContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const usdtBalanceWei = await usdtContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const prxBalance = Number(web3.utils.fromWei(prxBalanceWei, 'ether'));
            const usdtBalance = Number(web3.utils.fromWei(usdtBalanceWei, 'ether'));

            const requiredUSDT = await this.calculateUSDTAmountToSend(prxBalance, usdtBalance, Number(amount));
            usdtAmountToSend = requiredUSDT.toString();
            receivedPRXAmount = amount; // PRX is the received amount
        } else if (inputCurrency !== 'USDT') {
            throw new BadRequestException(`Unsupported inputCurrency for buying: ${inputCurrency}`);
        } else {
            // If input is USDT, calculate received PRX
            const prxBalanceWei = await proxymContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const usdtBalanceWei = await usdtContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const prxBalance = Number(web3.utils.fromWei(prxBalanceWei, 'ether'));
            const usdtBalance = Number(web3.utils.fromWei(usdtBalanceWei, 'ether'));
            receivedPRXAmount = (await this.calculatePRXAmountToReceive(prxBalance, usdtBalance, Number(amount))).toString();
        }

        transactionDTO.amount = usdtAmountToSend;
        transactionDTO.receivedAmount = receivedPRXAmount;
        

        await this.transferTokenGeneric(
            transactionDTO,
            usdtContract,
            'USDT',
            (from, _, weiAmount) => tradeContract.methods.buyTokens(weiAmount),
            'PRX',
        );
    }

    async sellPRX(transactionDTO: CreateTransactionDto): Promise<void> {
        const { amount, inputCurrency } = transactionDTO;
        let prxAmountToSend = amount;
        let receivedUSDTAmount: string | undefined;

        if (inputCurrency === 'USDT') {
            const prxBalanceWei = await proxymContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const usdtBalanceWei = await usdtContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const prxBalance = Number(web3.utils.fromWei(prxBalanceWei, 'ether'));
            const usdtBalance = Number(web3.utils.fromWei(usdtBalanceWei, 'ether'));

            const requiredPRX = await this.calculatePRXAmountToSend(prxBalance, usdtBalance, Number(amount));
            prxAmountToSend = requiredPRX.toString();
            receivedUSDTAmount = amount; // USDT is the received amount
        } else if (inputCurrency !== 'PRX') {
            throw new BadRequestException(`Unsupported inputCurrency for selling: ${inputCurrency}`);
        } else {
            // If input is PRX, calculate received USDT
            const prxBalanceWei = await proxymContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const usdtBalanceWei = await usdtContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const prxBalance = Number(web3.utils.fromWei(prxBalanceWei, 'ether'));
            const usdtBalance = Number(web3.utils.fromWei(usdtBalanceWei, 'ether'));
            receivedUSDTAmount = (await this.calculateUSDTAmountToSend(prxBalance, usdtBalance, Number(amount))).toString();
        }

        transactionDTO.amount = prxAmountToSend;
        transactionDTO.receivedAmount = receivedUSDTAmount;
        

        await this.transferTokenGeneric(
            transactionDTO,
            proxymContract,
            'PRX',
            (from, _, weiAmount) => tradeContract.methods.sellTokens(weiAmount),
            'USDT',
        );
    }

    async transferToken(transactionDTO: CreateTransactionDto): Promise<void> {
        await this.transferTokenGeneric(
            transactionDTO,
            proxymContract,
            'PRX',
            (from, to, weiAmount) => tradeContract.methods.transferToken(from, to, weiAmount),
        );
    }

    async transferUSDT(transactionDTO: CreateTransactionDto): Promise<void> {
        await this.transferTokenGeneric(
            transactionDTO,
            usdtContract,
            'USDT',
            (from, to, weiAmount) => tradeContract.methods.transferUSDT(from, to, weiAmount),
        );
    }

    async transferTokenGeneric(
        transactionDTO: CreateTransactionDto,
        tokenContract: any,
        tokenSymbol: string,
        tradeMethod: (from: string, to: string | undefined, amount: string) => any,
        targetToken?: string,
    ): Promise<void> {
        const { senderAddress, amount, receiverAddress, receivedAmount, receivedCurrency } = transactionDTO;
        const weiAmount = web3.utils.toWei(amount, 'ether');

        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = 1000000;

        const balance = await web3.eth.getBalance(senderAddress);
        const upfrontCost = BigInt(gasPrice) * BigInt(gasLimit) * BigInt(2);
        if (BigInt(balance) < upfrontCost) {
            throw new BadRequestException({
                ...errors.insufficientFunds,
                message: `${errors.insufficientFunds.message}: ${web3.utils.fromWei(balance, 'ether')} ETH available`,
            });
        }

        await this.approveTransaction(senderAddress, tokenContract, TRADE_CONTRACT_ADDRESS, weiAmount);

        const allowance = await tokenContract.methods.allowance(senderAddress, tradeContract.options.address).call();
        if (Number(allowance) < Number(weiAmount)) {
            throw new BadRequestException(`${tokenSymbol} allowance too low even after approval.`);
        }

        const receipt = await tradeMethod(senderAddress, receiverAddress || tradeContract.options.address, weiAmount)
            .send({ from: senderAddress, gasPrice, gas: gasLimit });

        const effectiveSymbol = targetToken || tokenSymbol;
        const currency = await this.currencyModel.findOne({ symbol: effectiveSymbol });
        if (!currency) {
            throw new InternalServerErrorException({
                ...errors.currencyNotFound,
                message: `${errors.currencyNotFound.message}: ${effectiveSymbol} not found`,
            });
        }

        let receivedCurrencyId: mongoose.Types.ObjectId | undefined;
        if (receivedCurrency) {
            const receivedCurrencyDoc = await this.currencyModel.findOne({ symbol: receivedCurrency });
            if (!receivedCurrencyDoc) {
                throw new InternalServerErrorException({
                    ...errors.currencyNotFound,
                    message: `${errors.currencyNotFound.message}: ${receivedCurrency} not found`,
                });
            }
            receivedCurrencyId = receivedCurrencyDoc._id;
        }

        await this.createTransferTransaction(
            amount,
            currency._id,
            receivedAmount,
            receivedCurrencyId,
            receipt.transactionHash,
            senderAddress,
            receiverAddress,
            tokenContract,
            targetToken,
        );

        console.log(`Trade successful. ${tokenSymbol} -> ${targetToken || tokenSymbol}. Tx: ${receipt.transactionHash}`);
    }

    async approveTransaction(from: string, contractA: any, addressToApprove: string, weiAmount: string): Promise<void> {
        const gasPrice = await web3.eth.getGasPrice();
        await contractA.methods.approve(addressToApprove, weiAmount).send({
            from,
            gasPrice,
            gas: 1000000,
        });
    }

    async createTransferTransaction(
        amount: string,
        currencyId: mongoose.Types.ObjectId,
        receivedAmount: string | undefined,
        receivedCurrencyId: mongoose.Types.ObjectId | undefined,
        hashedTx: string,
        senderAddress: string,
        receiverAddress: string | undefined,
        contract: any,
        receivedCurrencySymbol?: string,
    ): Promise<Transaction> {
        const sender = await this.userModel.findOne({ walletAddress: senderAddress }).exec();
        if (!sender) {
            console.log('Sender not found in DB for walletAddress:', senderAddress);
            throw new NotFoundException(errors.userNotFound);
        }

        let receiver: User | null = null;
        if (receiverAddress) {
            receiver = await this.userModel.findOne({ walletAddress: receiverAddress });
            if (!receiver) {
                console.log('Receiver not found in DB for walletAddress:', receiverAddress);
                throw new NotFoundException(errors.userNotFound);
            }
        }

        const transaction = await this.transactionModel.create({
            type: receiverAddress ? TransactionType.TRANSFER : TransactionType.TRADING,
            amount: Number(amount),
            currency_id: currencyId,
            receivedAmount: receivedAmount ? Number(receivedAmount) : undefined,
            receivedCurrencyId,
            hashed_TX: hashedTx,
            sender_id: sender._id,
            receiver_id: receiver?._id,
        });

        if (!transaction) {
            throw new InternalServerErrorException(errors.transactionCreationFailed);
        }

        if (receivedCurrencySymbol) {
            const spentContract = contract === proxymContract ? proxymContract : usdtContract;
            const receivedContract = receivedCurrencySymbol === 'PRX' ? proxymContract : usdtContract;
            await this.updateWalletInfo(senderAddress, spentContract, spentContract === proxymContract ? 'prxBalance' : 'usdtBalance');
            await this.updateWalletInfo(senderAddress, receivedContract, receivedContract === proxymContract ? 'prxBalance' : 'usdtBalance');
        } else {
            await this.updateWalletInfo(senderAddress, contract, contract === proxymContract ? 'prxBalance' : 'usdtBalance');
            if (receiverAddress && receiver) {
                await this.updateWalletInfo(receiverAddress, contract, contract === proxymContract ? 'prxBalance' : 'usdtBalance');
            }
        }

        return transaction;
    }

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

    async getPrice(): Promise<number> {
        try {
            const exchangeRate = await tradeContract.methods.getPrice().call();
            const formattedRate = Number(exchangeRate) / 1e18;
            console.log(`The exchange rate is: ${formattedRate}`);
            return formattedRate;
        } catch (error) {
            console.error("Error fetching exchange rate:", error.message);
            throw error;
        }
    }


    //this function is used to calculate the the amount of usdt token when buiyn with inputcurrency is 'PRX'
    async calculateUSDTAmountToSend(prxBalance: number, usdtBalance: number, desiredPRX: number): Promise<number> {
        if (desiredPRX <= 0) throw new Error('Desired PRX must be > 0');
        const k = prxBalance * usdtBalance;
        const newPrxBalance = prxBalance - desiredPRX;
        const newUsdtBalance = k / newPrxBalance;
        return newUsdtBalance - usdtBalance;
    }

    async calculatePRXAmountToSend(prxBalance: number, usdtBalance: number, desiredUSDT: number): Promise<number> {
        if (desiredUSDT <= 0) throw new Error('Desired USDT must be > 0');
        const k = prxBalance * usdtBalance;
        const newUsdtBalance = usdtBalance - desiredUSDT;
        const newPrxBalance = k / newUsdtBalance;
        return newPrxBalance - prxBalance;
    }

    // New helper method to calculate received PRX when buying with USDT
    async calculatePRXAmountToReceive(prxBalance: number, usdtBalance: number, usdtGiven: number): Promise<number> {
        if (usdtGiven <= 0) throw new Error('USDT given must be > 0');
        const k = prxBalance * usdtBalance;
        const newUsdtBalance = usdtBalance + usdtGiven;
        const newPrxBalance = k / newUsdtBalance;
        return prxBalance - newPrxBalance;
    }
}