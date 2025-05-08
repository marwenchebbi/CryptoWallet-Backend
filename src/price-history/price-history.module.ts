import { Module } from '@nestjs/common';
import { PriceHistoryService } from './price-history.service';
import { PriceHistoryController } from './price-history.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { PriceHistory, PriceHistorySchema } from './schema/price-history.schema';
import { TransactionModule } from 'src/modules/transaction/transaction.module';
import { Currency, CurrencySchema } from 'src/modules/currency/schemas/currency.schema';
import { TransactionService } from 'src/modules/transaction/transaction.service';

@Module({
  imports: [MongooseModule.forFeature([
    {
      name: PriceHistory.name,
      schema: PriceHistorySchema
    }, {
      name: Currency.name,
      schema: CurrencySchema
    }])
    ],
  controllers: [PriceHistoryController],
  providers: [PriceHistoryService],
  exports: [PriceHistoryService]
})
export class PriceHistoryModule { }
