import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { Body, Controller, Post } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('transfer/prx')
  async transferPRX(@Body() transactionDTO : CreateTransactionDto){
    return this.transactionService.transferToken(transactionDTO);
  }

  @Post('transfer/usdt')
  async transferUSDT(@Body() transactionDTO : CreateTransactionDto){
    return this.transactionService.transferUSDT(transactionDTO);

  }
  
  @Post('buy')
  async buyPRX(@Body() transactionDTO : CreateTransactionDto){
    return this.transactionService.buyPRX(transactionDTO);

  }

  @Post('sell')
  async sellPRX(@Body() transactionDTO : CreateTransactionDto){
    return this.transactionService.sellPRX(transactionDTO);

  }

}
