import { Currency } from './../modules/currency/schemas/currency.schema';
import { TransactionService } from './../modules/transaction/transaction.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { PriceHistory } from './schema/price-history.schema';
import { errors } from 'src/errors/errors.config';

// Importing Web3 and contract configurations for blockchain interactions
const {
    web3,
    proxymContract,
    tradeContract,
    usdtContract,
    TRADE_CONTRACT_ADDRESS,
} = require('../config/contracts-config');


@Injectable()
export class PriceHistoryService {

    constructor(
        @InjectModel(PriceHistory.name) private priceHistoryModel: Model<PriceHistory>,
        @InjectModel(Currency.name) private currencyModel: Model<Currency>,


    ){}



    async createPriceHistory(){
        try {
            // Fetch the latest price
            const price = await this.getPrice();
            if (price === null) {
              throw new NotFoundException(errors.priceNotFound);
            }
      
            // Fetch the currency with symbol 'PRX'
            const currency = await this.currencyModel.findOne({ symbol: 'PRX' }).exec();
            if (!currency) {
              throw new NotFoundException(errors.currencyNotFound);
            }
      
            // Create price history record
            const priceHistory = await this.priceHistoryModel.create({
              price : Number(price),
              currencyId: currency._id,
              timestamp: new Date(), // Explicitly set timestamp
            });
      
            return priceHistory;
          } catch (error) {
            // Handle specific errors
            if (error instanceof NotFoundException) {
              throw error; // Re-throw NotFoundException
            }
            // Log and throw generic database error
            console.error('Error creating price history:', error);
            throw new Error('error while creating on the DataBase');
          }
        
    }

        // Function to get the current PRX/USDT exchange rate
        async getPrice(): Promise<number> {
            try {
                console.log('entering the get price function')
                // Fetching exchange rate from the trade contract
                const exchangeRate = await tradeContract.methods.getPrice().call();
                console.log('get price function fetched successfulmly')

                const formattedRate = Number(exchangeRate) / 1e18;
                console.log(`The exchange rate is: ${formattedRate}`);
                return Number(formattedRate);
            } catch (error) {
                console.error("Error fetching exchange rate:", error.message);
                throw error;
            }
        }


        async findAll(): Promise<PriceHistory[]> {
            try {
                // Fetch all price history records, populate currencyId for additional details
                const priceHistories = await this.priceHistoryModel
                    .find()
                    .populate('currencyId', 'symbol name') // Populate currency details (optional)
                    .sort({ timestamp: -1 }) // Sort by timestamp in descending order
                    .exec();
    
                if (!priceHistories || priceHistories.length === 0) {
                    throw new NotFoundException(errors.priceHistoryNotFound);
                }
    
                return priceHistories;
            } catch (error) {
                console.error('Error fetching price history:', error);
                if (error instanceof NotFoundException) {
                    throw error;
                }
                throw new Error('Error fetching price history from the database');
            }
        }
    
}
