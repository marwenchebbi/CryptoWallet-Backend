import { WalletModule } from './../user/wallet.module';

import { forwardRef, Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { CurrencyModule } from '../currency/currency.module';
import { Currency, CurrencySchema } from '../currency/schemas/currency.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { PriceHistoryModule } from 'src/price-history/price-history.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [MongooseModule.forFeature([
    {
      name: Transaction.name,
      schema: TransactionSchema
    }, {
      name: Currency.name,
      schema: CurrencySchema
    }, {
      name: User.name,
      schema: UserSchema
    },]
  ),
    CurrencyModule,
    PriceHistoryModule,
    WalletModule,
    forwardRef(() =>PaymentModule)
  ],


  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule { }
