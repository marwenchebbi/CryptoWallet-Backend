import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { Body, Controller, Get, Param, Post, Query, ValidationPipe } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { FindAllByUserQueryDto, FindAllByUserResponse } from './dtos/find-all-by-user.dto';

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

  @Get('price')
  async getPrice(){
    return this.transactionService.getPrice()
  }

  // this endpoint get queries as input : localhost:PORT/transaction/user/userid?page=(Number of the dezired page)&limit=(nubmer of items per page(max))&sort=(field for sorting)
  @Get('user/:userId')
  async findAllByUser(
    @Param('userId') userId: string,
    @Query(ValidationPipe) query: FindAllByUserQueryDto,
  ): Promise<FindAllByUserResponse> {
    return this.transactionService.findAllByUserId(userId, query);
  }


}
