import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Currency } from './schemas/currency.schema';
import { Model } from 'mongoose';
import { CurrencyDto } from './dtos/currency.dto';
import { error } from 'console';

@Injectable()
export class CurrencyService {

    constructor(@InjectModel(Currency.name) private currencyModel: Model<Currency>) { }


    // add a new currency 
    async createCurrency(currencyDto: CurrencyDto) {
        const { name, symbol } = currencyDto;
        // check if the currency exists or not
        const isPresent = await this.currencyModel.findOne({ 
            $or: [{ name: name }, { symbol: symbol }] 
        });
        
        if (isPresent) {
            throw new BadRequestException('Currency already exists !!')
        }

        const currency = await this.currencyModel.create({ name: name, symbol: symbol });
        if (!currency) {
            throw new error('Error while creating new currency ')

        }
    }
}
