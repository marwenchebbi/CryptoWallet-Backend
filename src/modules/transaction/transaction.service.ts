import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { Transaction } from './schemas/transaction.schema';
import { Currency } from '../currency/schemas/currency.schema';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { TransactionType } from './dtos/transaction-type.dto';
import { User } from '../auth/schemas/user.schema';
import { errors } from '../../errors/errors.config';
import {  FindAllByUserQueryDto, FindAllByUserResponse, FormattedTransaction } from './dtos/find-all-by-user.dto';

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
    }

    // Function to handle direct PRX token transfers
    async transferToken(transactionDTO: CreateTransactionDto): Promise<void> {
        await this.transferTokenGeneric(
            transactionDTO,
            proxymContract,
            'PRX',
            (from, to, weiAmount) => tradeContract.methods.transferToken(from, to, weiAmount),
        );
    }

    // Function to handle direct USDT transfers
    async transferUSDT(transactionDTO: CreateTransactionDto): Promise<void> {
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
        // Executing the trade or transfer method on the blockchain
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
            currency._id,
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
            // Fetching exchange rate from the trade contract
            const exchangeRate = await tradeContract.methods.getPrice().call();
            const formattedRate = Number(exchangeRate) / 1e18;
            console.log(`The exchange rate is: ${formattedRate}`);
            return formattedRate;
        } catch (error) {
            console.error("Error fetching exchange rate:", error.message);
            throw error;
        }
    }

    // Function to calculate USDT required to buy a given amount of PRX
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

    //this function is used to fetch the user transction history with pagination and filtered by operation type
    async findAllByUserId(
        userId: string,
        query: FindAllByUserQueryDto = {},
      ): Promise<FindAllByUserResponse> {
        try {
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
              { sender_id: new Types.ObjectId(userId) },
              { receiver_id: new Types.ObjectId(userId) },
            ],
          };
    
          // Add type filter if provided
          if (query.type) {
            conditions.type = query.type;
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
            this.transactionModel
              .countDocuments(conditions)
              .exec(),
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
            message: `Failed to fetch transactions for user ${userId}: ${error.message}`,
          });
        }
      }


      /**
   * Formats transaction response to include only specified fields and computed operation
   * @param transactions Array of transactions to format
   * @returns Array of formatted transactions
   */
  async formatTransactionResponse(transactions: Transaction[]): Promise<FormattedTransaction[]> {
    const formattedTransactions: FormattedTransaction[] = [];

    for (const transaction of transactions) {
      // Fetch currency from database
      const currency = await this.currencyModel
        .findById(transaction.currency_id)
        .select('symbol')
        .lean()
        .exec();

      // Determine operation based on currency symbol NB : this condition handle also the transfering operations 
      const operation = currency?.symbol === 'PRX' ? 'buy' : 'sell';

      formattedTransactions.push({
        type: transaction.type,
        amount: transaction.amount,
        received_amount: transaction.receivedAmount || undefined, // Handle case where receivedAmount might be undefined
        date: transaction.createdAt, // createdAt is available from MongoDB document
        operation :operation || undefined,
        sender_id :transaction.sender_id.toString()
      });
    }

    return formattedTransactions;
  }
}