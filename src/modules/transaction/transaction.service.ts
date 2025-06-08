import { Type } from 'class-transformer';
import { WalletService } from './../user/wallet.service';

import { PriceHistoryService } from './../../price-history/price-history.service';
import { CurrencyService } from './../currency/currency.service';
import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { Transaction } from './schemas/transaction.schema';
import { Currency } from '../currency/schemas/currency.schema';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { TransactionType } from './dtos/transaction-type.dto';
import { User } from '../auth/schemas/user.schema';
import { errors } from '../../errors/errors.config';
import { FindAllByUserQueryDto, FindAllByUserResponse, FormattedTransaction } from './dtos/find-all-by-user.dto';
import { PaymentService } from '../payment/payment.service';
import { ConfirmPaymentDto, ConfirmSellDto, CreatePaymentDto, SellCryptoDto } from '../payment/dtos/payment.dtos';
import { PaymentType } from './dtos/payment-type.dto';


// Importing Web3 and contract configurations for blockchain interactions
const {
    web3,
    proxymContract,
    tradeContract,
    usdtContract,
    TRADE_CONTRACT_ADDRESS,
} = require('../../config/contracts-config');

// Marking the class as a provider that can be injected into other components
@Injectable()
export class TransactionService {
    // Injecting Mongoose models for Transaction, Currency, and User schemas
    constructor(
        @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
        @InjectModel(Currency.name) private currencyModel: Model<Currency>,
        @InjectModel(User.name) private userModel: Model<User>,
        private priceHistoryService: PriceHistoryService,
        private paymentService: PaymentService,
        private walletService: WalletService
    ) { }


    // Function to handle buying PRX tokens with either USDT or PRX as input currency
    async buyPRX(transactionDTO: CreateTransactionDto): Promise<void> {
        const { amount, inputCurrency } = transactionDTO;
        let usdtAmountToSend = amount;
        let receivedPRXAmount: string | undefined;

        // Handling case where input currency is PRX
        if (inputCurrency === 'PRX') {
            // Fetching PRX and USDT balances from the trade contract
            const prxBalanceWei = await proxymContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const usdtBalanceWei = await usdtContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const prxBalance = Number(web3.utils.fromWei(prxBalanceWei, 'ether'));
            const usdtBalance = Number(web3.utils.fromWei(usdtBalanceWei, 'ether'));

            // Calculating required USDT to buy the desired PRX amount
            const requiredUSDT = await this.calculateUSDTAmountToSend(prxBalance, usdtBalance, Number(amount));
            usdtAmountToSend = requiredUSDT.toString();
            receivedPRXAmount = amount; // PRX is the received amount
        } else if (inputCurrency !== 'USDT') {
            // Throwing an error for unsupported input currencies
            throw new BadRequestException(`Unsupported inputCurrency for buying: ${inputCurrency}`);
        } else {
            // Handling case where input currency is USDT
            const prxBalanceWei = await proxymContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const usdtBalanceWei = await usdtContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const prxBalance = Number(web3.utils.fromWei(prxBalanceWei, 'ether'));
            const usdtBalance = Number(web3.utils.fromWei(usdtBalanceWei, 'ether'));
            // Calculating PRX amount to receive for given USDT
            receivedPRXAmount = (await this.calculatePRXAmountToReceive(prxBalance, usdtBalance, Number(amount))).toString();
        }

        // Updating transaction DTO with calculated amounts
        transactionDTO.amount = usdtAmountToSend;
        transactionDTO.receivedAmount = receivedPRXAmount;

        // Executing the token transfer for buying PRX
        await this.transferTokenGeneric(
            transactionDTO,
            usdtContract,
            'USDT',
            (from, _, weiAmount) => tradeContract.methods.buyTokens(weiAmount),
            'PRX',
        );
        // store the new price in the databse
        try {
            await this.priceHistoryService.createPriceHistory()
        } catch (error) {
            console.log(error)
        }

    }

    // Function to handle selling PRX tokens for USDT
    async sellPRX(transactionDTO: CreateTransactionDto): Promise<void> {
        const { amount, inputCurrency } = transactionDTO;
        let prxAmountToSend = amount;
        let receivedUSDTAmount: string | undefined;

        // Handling case where input currency is USDT
        if (inputCurrency === 'USDT') {
            const prxBalanceWei = await proxymContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const usdtBalanceWei = await usdtContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const prxBalance = Number(web3.utils.fromWei(prxBalanceWei, 'ether'));
            const usdtBalance = Number(web3.utils.fromWei(usdtBalanceWei, 'ether'));

            // Calculating required PRX to get desired USDT
            const requiredPRX = await this.calculatePRXAmountToSend(prxBalance, usdtBalance, Number(amount));
            prxAmountToSend = requiredPRX.toString();
            receivedUSDTAmount = amount; // USDT is the received amount
        } else if (inputCurrency !== 'PRX') {
            // Throwing an error for unsupported input currencies
            throw new BadRequestException(`Unsupported inputCurrency for selling: ${inputCurrency}`);
        } else {
            // Handling case where input currency is PRX
            const prxBalanceWei = await proxymContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const usdtBalanceWei = await usdtContract.methods.balanceOf(TRADE_CONTRACT_ADDRESS).call();
            const prxBalance = Number(web3.utils.fromWei(prxBalanceWei, 'ether'));
            const usdtBalance = Number(web3.utils.fromWei(usdtBalanceWei, 'ether'));
            // Calculating USDT amount to receive for given PRX
            receivedUSDTAmount = (await this.calculateUSDTAmountToSend(prxBalance, usdtBalance, Number(amount))).toString();
        }

        // Updating transaction DTO with calculated amounts
        transactionDTO.amount = prxAmountToSend;
        transactionDTO.receivedAmount = receivedUSDTAmount;

        // Executing the token transfer for selling PRX
        await this.transferTokenGeneric(
            transactionDTO,
            proxymContract,
            'PRX',
            (from, _, weiAmount) => tradeContract.methods.sellTokens(weiAmount),
            'USDT',
        );

        // store the new price in the databse
        try {
            await this.priceHistoryService.createPriceHistory()
        } catch (error) {
            console.log(error)
        }


    }

    // Function to handle direct PRX token transfers
    async transferToken(transactionDTO: CreateTransactionDto): Promise<void> {
        const {amount , senderAddress,receiverAddress} = transactionDTO
        if(senderAddress ===receiverAddress){
            throw new BadRequestException('You cannot send tokens to your wallet')
        }
        await this.transferTokenGeneric(
            transactionDTO,
            proxymContract,
            'PRX',
            (from, to, weiAmount) => tradeContract.methods.transferToken(from, to, weiAmount),
        );
    }

    // Function to handle direct USDT transfers
    async transferUSDT(transactionDTO: CreateTransactionDto): Promise<void> {
                const {amount , senderAddress,receiverAddress} = transactionDTO
        if(senderAddress ===receiverAddress){
            throw new BadRequestException('You cannot send tokens to your wallet')
        }
        await this.transferTokenGeneric(
            transactionDTO,
            usdtContract,
            'USDT',
            (from, to, weiAmount) => tradeContract.methods.transferUSDT(from, to, weiAmount),
        );
    }


    // Generic function to handle token transfers (buy, sell, or direct transfer)
    async transferTokenGeneric(
        transactionDTO: CreateTransactionDto,
        tokenContract: any,
        tokenSymbol: string,
        tradeMethod: (from: string, to: string | undefined, amount: string) => any,
        targetToken?: string,
    ): Promise<void> {
        const { senderAddress, amount, receiverAddress, receivedAmount, receivedCurrency } = transactionDTO;
        // Converting amount to Wei for blockchain transaction
        const weiAmount = web3.utils.toWei(amount, 'ether');
        //check the wallet satus 
        const user = await this.userModel.findOne({ walletAddress: senderAddress })
        if (user?.isWalletLocked) {
            throw new BadRequestException(errors.walletLocked);


        }


        // Fetching gas price and setting gas limit for the transaction
        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = 1000000;

        // Checking if sender has enough ETH to cover gas costs
        const balance = await web3.eth.getBalance(senderAddress);
        const upfrontCost = BigInt(gasPrice) * BigInt(gasLimit) * BigInt(2);
        if (BigInt(balance) < upfrontCost) {
            throw new BadRequestException({
                ...errors.insufficientFunds,
                message: `${errors.insufficientFunds.message}: ${web3.utils.fromWei(balance, 'ether')} ETH available`,
            });
        }



        // Approving the trade contract to spend tokens on behalf of the sender
        await this.approveTransaction(senderAddress, tokenContract, TRADE_CONTRACT_ADDRESS, weiAmount);

        // Verifying allowance for the trade contract
        const allowance = await tokenContract.methods.allowance(senderAddress, tradeContract.options.address).call();
        if (Number(allowance) < Number(weiAmount)) {
            throw new BadRequestException(`${tokenSymbol} allowance too low even after approval.`);
        }
        //check the sender balances
        const senderTokenBalanceWei = await tokenContract.methods.balanceOf(senderAddress).call();
        const senderTokenBalance = Number(web3.utils.fromWei(senderTokenBalanceWei, 'ether'));
        if (Number(senderTokenBalance) < Number(amount)) {
            throw new BadRequestException({
                ...errors.insufficientFunds,
                message: `Insufficient ${tokenSymbol} balance `,
            });
        }


        const receipt = await tradeMethod(senderAddress, receiverAddress || tradeContract.options.address, weiAmount)
            .send({ from: senderAddress, gasPrice, gas: gasLimit });




        // Determining the effective token symbol (target token or input token)
        const effectiveSymbol = targetToken || tokenSymbol;
        // Fetching currency details from the database
        const currency = await this.currencyModel.findOne({ symbol: effectiveSymbol });
        if (!currency) {
            throw new InternalServerErrorException({
                ...errors.currencyNotFound,
                message: `${errors.currencyNotFound.message}: ${effectiveSymbol} not found`,
            });
        }

        // Creating a transaction record in the database
        await this.createTransferTransaction(
            amount,
            currency._id as mongoose.Types.ObjectId,
            receivedAmount,
            receipt.transactionHash,
            senderAddress,
            receiverAddress,
            tokenContract,
            targetToken,
        );

        // Logging the successful transaction
        console.log(`Trade successful. ${tokenSymbol} -> ${targetToken || tokenSymbol}. Tx: ${receipt.transactionHash}`);
    }

    // Function to approve a contract to spend tokens on behalf of the sender
    async approveTransaction(from: string, contractA: any, addressToApprove: string, weiAmount: string): Promise<void> {
        const gasPrice = await web3.eth.getGasPrice();
        await contractA.methods.approve(addressToApprove, weiAmount).send({
            from,
            gasPrice,
            gas: 1000000,
        });
    }

    // Generic function to create a transaction record in the database
    async createTransferTransaction(
        amount: string,
        currencyId: mongoose.Types.ObjectId,
        receivedAmount: string | undefined,
        hashedTx: string,
        senderAddress: string,
        receiverAddress: string | undefined,
        contract: any,
        receivedCurrencySymbol?: string,

    ): Promise<Transaction> {
        // Fetching sender details from the database
        const sender = await this.userModel.findOne({ walletAddress: senderAddress }).exec();
        if (!sender) {
            console.log('Sender not found in DB for walletAddress:', senderAddress);
            throw new NotFoundException(errors.userNotFound);
        }

        // Fetching receiver details if applicable
        let receiver: User | null = null;
        if (receiverAddress) {
            receiver = await this.userModel.findOne({ walletAddress: receiverAddress });
            if (!receiver) {
                console.log('Receiver not found in DB for walletAddress:', receiverAddress);
                throw new NotFoundException(errors.userNotFound);
            }
        }

        // Creating a new transaction record
        const transaction = await this.transactionModel.create({
            type: receiverAddress ? TransactionType.TRANSFER : TransactionType.TRADING,
            amount: Number(amount),
            currency_id: currencyId,
            receivedAmount: receivedAmount ? Number(receivedAmount) : undefined,
            hashed_TX: hashedTx,
            sender_id: sender._id,
            receiver_id: receiver?._id,

        });

        // Verifying transaction creation
        if (!transaction) {
            throw new InternalServerErrorException(errors.transactionCreationFailed);
        }

        // Updating wallet balances for sender and receiver
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

    // Function to update wallet balance information for a user
    async updateWalletInfo(userAddress: string, contract: any, field: 'prxBalance' | 'usdtBalance'): Promise<any> {
        // Fetching token balance from the blockchain
        const balanceWei = await contract.methods.balanceOf(userAddress).call();
        const balance = web3.utils.fromWei(balanceWei, 'ether');

        // Updating user balance in the database
        const user = await this.userModel.updateOne(
            { walletAddress: userAddress },
            { $set: { [field]: Number(balance) } },
        );

        // Verifying update success
        if (!user.modifiedCount) {
            throw new InternalServerErrorException({
                ...errors.walletUpdateFailed,
                message: `${errors.walletUpdateFailed.message} for ${userAddress}`,
            });
        }

        return user;
    }

    // Function to get the current PRX/USDT exchange rate
    async getPrice(): Promise<number> {
        try {
            // Ensure tradeContract is properly initialized
            if (!tradeContract) {
                throw new Error('Trade contract is not initialized');
            }

            // Log the contract address for debugging
            console.log('Calling getPrice on contract at:', tradeContract.options.address);

            // Fetch exchange rate from the trade contract
            const exchangeRate = await tradeContract.methods.getPrice().call({
                from: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57', // Replace with a valid Ethereum account
                gas: 6000000, // Specify gas limit to avoid out-of-gas errors
            });

            // Convert the result from wei (assuming uint256 return type)
            const formattedRate = Number(exchangeRate) / 1e18;
            console.log(`The exchange rate is: ${formattedRate}`);
            return formattedRate;
        } catch (error: any) {
            console.error('Error fetching exchange rate:', {
                message: error.message,
                stack: error.stack,
                code: error.code,
                data: error.data,
            });
            throw new Error(`Failed to fetch price: ${error.message}`);
        }
    }

    // Function to calculate USDT required to buy a given amount of PRX store the equivalent amount in the database
    async calculateUSDTAmountToSend(prxBalance: number, usdtBalance: number, desiredPRX: number): Promise<number> {
        if (desiredPRX <= 0) throw new Error('Desired PRX must be > 0');
        // Using constant product formula (k = x * y) for AMM
        const k = prxBalance * usdtBalance;
        const newPrxBalance = prxBalance - desiredPRX;
        const newUsdtBalance = k / newPrxBalance;
        return newUsdtBalance - usdtBalance;
    }

    // Function to calculate PRX required to get a given amount of USDT
    async calculatePRXAmountToSend(prxBalance: number, usdtBalance: number, desiredUSDT: number): Promise<number> {
        if (desiredUSDT <= 0) throw new Error('Desired USDT must be > 0');
        const k = prxBalance * usdtBalance;
        const newUsdtBalance = usdtBalance - desiredUSDT;
        const newPrxBalance = k / newUsdtBalance;
        return newPrxBalance - prxBalance;
    }

    // Function to calculate PRX received when buying with a given amount of USDT
    async calculatePRXAmountToReceive(prxBalance: number, usdtBalance: number, usdtGiven: number): Promise<number> {
        if (usdtGiven <= 0) throw new Error('USDT given must be > 0');
        const k = prxBalance * usdtBalance;
        const newUsdtBalance = usdtBalance + usdtGiven;
        const newPrxBalance = k / newUsdtBalance;
        return prxBalance - newPrxBalance;
    }

    //this function is used only for transactions with type trading and transfering
    async findAllByUserId(
        request: any,
        query: FindAllByUserQueryDto = {}
    ): Promise<FindAllByUserResponse> {
        try {

            const userId = request?.UserId
            console.log(userId)
            // Validate userId
            if (!Types.ObjectId.isValid(userId)) {
                throw new BadRequestException({
                    ...errors.userNotFound,
                    message: 'Invalid user ID format',
                });
            }

            // Set default pagination values
            const page = Math.max(1, query.page || 1);
            const limit = Math.min(100, Math.max(1, query.limit || 10));
            const skip = (page - 1) * limit;

            // Configure sorting
            const sort = query.sort || '-createdAt';

            // Build the base query conditions
            const conditions: any = {
                $or: [
                    { sender_id: new Types.ObjectId(userId as string) },
                    { receiver_id: new Types.ObjectId(userId as string) },
                ],

                type: { $in: ['trading', 'transfer'] },



            };

            // Add type filter if provided
            if (query.type) {
                conditions.type = query.type;
            }


            const prxCurrency = await this.currencyModel.findOne({ symbol: 'PRX' })
            const usdtCurrency = await this.currencyModel.findOne({ symbol: 'USDT' })

            // Add filter based on operation or sender/receiver
            if (query.filter) {
                if (query.filter === 'buy') {
                    // For buy/sell, filter by operation
                    conditions.currency_id = prxCurrency?._id
                }
                else if (query.filter === 'sell') {
                    conditions.currency_id = usdtCurrency?._id
                }
                else if (query.filter === 'send') {
                    // For send, filter by sender_id
                    conditions.sender_id = new Types.ObjectId(userId);
                    delete conditions.$or; // Remove $or to avoid conflicting conditions
                } else if (query.filter === 'receive') {
                    // For receive, filter by receiver_id
                    conditions.receiver_id = new Types.ObjectId(userId);
                    delete conditions.$or; // Remove $or to avoid conflicting conditions
                }
            }

            // Build the query to find transactions
            const transactionQuery = this.transactionModel
                .find(conditions)
                .populate([
                    { path: 'currency_id', select: 'name symbol' },
                    { path: 'sender_id', select: 'walletAddress' },
                    { path: 'receiver_id', select: 'walletAddress' },
                ])
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean();

            // Execute queries in parallel
            const [transactions, total] = await Promise.all([
                transactionQuery.exec(),
                this.transactionModel.countDocuments(conditions).exec(),
            ]);

            // Format transactions
            const formattedTransactions = await this.formatTransactionResponse(transactions);

            // Calculate total pages
            const totalPages = Math.ceil(total / limit);

            return {
                transactions: formattedTransactions,
                total,
                page,
                limit,
                totalPages,
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException({
                ...errors.transactionFetchFailed,
                message: `Failed to fetch transactions for the user : ${error.message}`,
            });
        }
    }

    //used for findallByuser
    async formatTransactionResponse(transactions: Transaction[]): Promise<FormattedTransaction[]> {
        const formattedTransactions: FormattedTransaction[] = [];

        for (const transaction of transactions) {
            // Fetch currency from database
            const currency = await this.currencyModel
                .findById(transaction.currency_id)
                .select('symbol')
                .lean()
                .exec();

            // Determine operation based on transaction type and currency this operation is used also in the frontend to detrmine the currency transfereed
            let operation: 'buy' | 'sell' | undefined;
            if (transaction.type === TransactionType.TRADING) {
                operation = currency?.symbol === 'PRX' ? 'buy' : 'sell';
            }
            else {
                operation = currency?.symbol === 'PRX' ? 'buy' : 'sell';
            }
            // For transfers, operation remains undefined

            formattedTransactions.push({
                type: transaction.type,
                amount: transaction.amount,
                received_amount: transaction.receivedAmount || undefined,
                date: transaction.createdAt,
                operation, //j'ai l'utiliser (coté client) pour connaitre le type de token transferer "sell"==PRX  buy=="USDT"!!!!!!!!!!!!!!!!!!!!!!!!!!!
                sender_id: transaction.sender_id.toString(),//used for detremin the operation either send or receive
                paymentType: transaction.paymentType || undefined,
            });
        }

        return formattedTransactions;
    }

    //this function is used buy usdt and prx with real money using card 
    async buyCryptosWithStripe(
        request: any,
        payment: CreatePaymentDto,

    ): Promise<{ clientSecret: string }> {

        const { amount, senderAddress, currency } = payment
        const userId = request?.UserId
        console.log(userId, senderAddress)

        // Fetch USDT price of PRX from trade contract
        const prxPrice = await this.getPrice(); // PRX/USDT rate
        const usdtAmount = amount * prxPrice;


        // Validate user
        const user = await this.userModel.findById(userId);
        if (!user || user.walletAddress !== senderAddress) {
            throw new BadRequestException(errors.userNotFound);
        }
        const usdAmount = (currency === 'PRX') ? usdtAmount : amount
        // Create payment intent
        const paymentIntent = await this.paymentService.createPaymentIntent(
            usdAmount,
            'usd',
            {
                userId,
                amount: amount.toString(),
                senderAddress,
                currency,
                usdtAmount
            },
        );

        if (!paymentIntent) {
            throw new BadRequestException('intent creating failed')
        }

        return paymentIntent;
    }


    // confirm the payment of the buy tokens
    async confirmStripePayment(confirmation: ConfirmPaymentDto): Promise<void> {

        const paymentIntent = await this.paymentService.confirmPaymentIntent(confirmation.paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            throw new BadRequestException('Payment not successful');
        }

        const { userId, amount, senderAddress, currency ,usdtAmount} = paymentIntent.metadata;
        const accounts = await web3.eth.getAccounts();

        const PrincipalAddress = accounts[0] // used to feed the pool
        try {
            if (currency === 'PRX') {
                await this.transferContractPRX(senderAddress, amount, userId)
                await this.transferUSDTFromUser(PrincipalAddress, TRADE_CONTRACT_ADDRESS, usdtAmount.toString(), userId);//feed the pool with equivalent amount USDT when ytyhe user buy prx to 
            } else {
                await this.transferContractUSDT(senderAddress, amount, userId)
            }
           



        } catch (error) {

        }



    }

    //transfer usdt  tokens from the trade contract to the user 
    async transferContractUSDT(to: string, amount: string, userId: string) {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = 1000000;
            const weiAmount = web3.utils.toWei(amount, "ether");
            await this.approveTransaction(to, usdtContract, TRADE_CONTRACT_ADDRESS, weiAmount);
            const Tx = await tradeContract.methods.transferContractUSDT(to, weiAmount).send({ from: to, gasPrice, gas: gasLimit });
            console.log(`✅ Transfer successful to ${to}`);
            const currency = await this.currencyModel.findOne({ symbol: 'USDT' })

            const transaction = await this.transactionModel.create({
                type: TransactionType.PAYMENT,
                amount: Number(amount),
                currency_id: currency?._id,
                hashed_TX: Tx.transactionHash,
                sender_id: new Types.ObjectId(userId),
                paymentType: PaymentType.DEBIT
            });
            await this.priceHistoryService.createPriceHistory()
            await this.updateWalletInfo(to, usdtContract, 'usdtBalance');
        } catch (error) {
            console.error("❌ Transfer failed:", error);
        }
    }
    //transfer prx tokens from the trade contract to the user 
    async transferContractPRX(to: string, amount: string, userId: string) {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = 1000000;
            const weiAmount = web3.utils.toWei(amount, "ether");
            await this.approveTransaction(to, usdtContract, TRADE_CONTRACT_ADDRESS, weiAmount);
            const Tx = await tradeContract.methods.transferContractPRX(to, weiAmount).send({ from: to, gasPrice, gas: gasLimit });
            console.log(`✅ Transfer successful to ${to}`);
            const currency = await this.currencyModel.findOne({ symbol: 'PRX' })

            const transaction = await this.transactionModel.create({
                type: TransactionType.PAYMENT,
                amount: Number(amount),
                currency_id: currency?._id,
                hashed_TX: Tx.transactionHash,
                sender_id: new Types.ObjectId(userId),
                paymentType: PaymentType.DEBIT


            });
            await this.priceHistoryService.createPriceHistory()
            await this.updateWalletInfo(to, proxymContract, 'prxBalance');
        } catch (error) {
            console.error("❌ Transfer failed:", error);
        }
    }


    // thsi function is used to sell ur cryptos to get $ in ur card
    async sellCryptoForFiat(
        request: any,
        sellData: SellCryptoDto,
    ): Promise<{ clientSecret: string | null }> {
        const { amount, userAddress, currency, cardDetails } = sellData;
        const userId = request?.UserId;

        // Validate user
        const user = await this.userModel.findById(userId);
        if (!user || user.walletAddress !== userAddress) {
            throw new BadRequestException(errors.userNotFound);
        }

        // For PRX, convert to USD equivalent
        let usdAmount = amount;
        if (currency === 'PRX') {
            // Fetch USDT price of PRX from trade contract
            const prxPrice = await this.getPrice(); // PRX/USDT rate
            usdAmount = amount * prxPrice;
        }

        try {
            // First, transfer the crypto from user to contract
            if (currency === 'PRX') {
                await this.transferTokenFromUser(userAddress, TRADE_CONTRACT_ADDRESS, amount.toString(), userId, currency);
            } else {
                await this.transferUSDTFromUser(userAddress, TRADE_CONTRACT_ADDRESS, amount.toString(), userId);
            }
            // store the new price in the databse
            await this.priceHistoryService.createPriceHistory()

            // Create a payment intent for the payout
            const payoutIntent = await this.paymentService.createPayoutIntent(
                usdAmount,
                'usd',
                {
                    userId,
                    amount: amount.toString(),
                    userAddress,
                    currency,
                    operation: 'sell'
                },
                cardDetails
            );

            return payoutIntent;
        } catch (error) {
            throw new BadRequestException(`Failed to process crypto sell: ${error.message}`);
        }
    }


    // confirm the sell tokens
    async confirmSellTransaction(confirmation: ConfirmSellDto): Promise<void> {
        // Verify the payout was successful
        const payoutIntent = await this.paymentService.confirmPayoutIntent(confirmation.payoutIntentId);
// handle the case  of  unseccussfull payment like Electricity cut off 
        if (payoutIntent.status !== 'succeeded') {
            // If payout failed, reverse the crypto transfer back to user
            const { userId, amount, userAddress, currency } = payoutIntent.metadata;

            try {
                if (currency === 'PRX') {
                    await this.reverseTransferPRX(userAddress, amount);
                } else {
                    await this.reverseTransferUSDT(userAddress, amount);
                }

                throw new BadRequestException('Payout not successful. Crypto has been returned to your wallet.');
            } catch (error) {
                throw new InternalServerErrorException('Payout failed and reversal operation failed. Please contact support.');
            }
        }

        // Record the successful transaction
        const { userId, amount, userAddress, currency } = payoutIntent.metadata;


        try {
            const currencyDoc = await this.currencyModel.findOne({ symbol: currency });

            await this.transactionModel.create({
                type: TransactionType.PAYMENT,
                amount: Number(amount),
                currency_id: currencyDoc?._id, //j'ai l'utilisé pour connaitre le type de token transferee!!!!!!!!!!!!!!!!!!!!!!!!!!!
                hashed_TX: payoutIntent.id, // Using Stripe payout ID as reference
                sender_id: new Types.ObjectId(userId),
                paymentType: PaymentType.CREDIT


            });
        } catch (error) {
            console.error("❌ Transaction recording failed:", error);
            // The payout succeeded but recording failed - this should be logged for admin review
        }
    }

    // Transfer crypto from user wallet to trade contract
    async transferTokenFromUser(from: string, to: string, amount: string, userId?: string, currencySymbol?: string) {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = 1000000;
            const weiAmount = web3.utils.toWei(amount, "ether");

            await this.approveTransaction(from, proxymContract, TRADE_CONTRACT_ADDRESS, weiAmount);
            // Execute the transfer
            const Tx = await tradeContract.methods.transferToken(from, to, weiAmount).send({
                from: from,
                gasPrice,
                gas: gasLimit
            });

            // store the new price in the databse
            await this.priceHistoryService.createPriceHistory()

            console.log(`✅ ${currencySymbol} transferred from ${from} to contract`);

            // Record the transfer in the transaction log
            const currency = await this.currencyModel.findOne({ symbol: currencySymbol });



            await this.updateWalletInfo(from, proxymContract, 'prxBalance');


            return Tx;
        } catch (error) {
            console.error(`❌ Transfer of ${currencySymbol} failed:`, error);
            throw new BadRequestException(`Failed to transfer ${currencySymbol}: ${error.message}`);
        }
    }

    async transferUSDTFromUser(from: string, to: string, amount: string, userId: string) {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = 1000000;
            const weiAmount = web3.utils.toWei(amount, "ether");

            await this.approveTransaction(from, usdtContract, TRADE_CONTRACT_ADDRESS, weiAmount);
            // Execute the transfer
            const Tx = await tradeContract.methods.transferUSDT(from, to, weiAmount).send({
                from: from,
                gasPrice,
                gas: gasLimit
            });
            // store the new price in the databse

            await this.priceHistoryService.createPriceHistory()

            console.log(`✅ USDT transferred from ${from} to contract`);

            // Record the transfer in the transaction log
            const currency = await this.currencyModel.findOne({ symbol: 'USDT' });


            await this.updateWalletInfo(from, usdtContract, 'usdtBalance');

            return Tx;
        } catch (error) {
            console.error("❌ USDT Transfer failed:", error);
            throw new BadRequestException(`Failed to transfer USDT: ${error.message}`);
        }
    }

    // Reverse transfers if payout fails
    async reverseTransferPRX(to: string, amount: string) {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = 1000000;
            const weiAmount = web3.utils.toWei(amount, "ether");



            await tradeContract.methods.transferContractPRX(to, weiAmount).send({
                from: to,
                gasPrice,
                gas: gasLimit
            });

            console.log(`✅ PRX returned to ${to}`);
            return true;
        } catch (error) {
            console.error("❌ PRX return transfer failed:", error);
            throw error;
        }
    }

    async reverseTransferUSDT(to: string, amount: string) {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = 1000000;
            const weiAmount = web3.utils.toWei(amount, "ether");

            await tradeContract.methods.transferContractUSDT(to, weiAmount).send({
                from: to,
                gasPrice,
                gas: gasLimit
            });

            console.log(`✅ USDT returned to ${to}`);
            return true;
        } catch (error) {
            console.error("❌ USDT return transfer failed:", error);
            throw error;
        }
    }
}