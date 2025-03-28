import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { Body, Controller, Post } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('')
  async createTransaction(@Body() transactionDTO : CreateTransactionDto){
    return this.transactionService.transferToken(transactionDTO);

  }



}
