import { forwardRef, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { TransactionModule } from '../transaction/transaction.module';


@Module({
  imports : [forwardRef(() =>TransactionModule)],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports :[PaymentService]
})
export class PaymentModule {}
