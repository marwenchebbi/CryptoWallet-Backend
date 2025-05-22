import { Body, Controller, Post, Get, Param, UseGuards, Req } from '@nestjs/common';
import { TransactionService } from '../transaction/transaction.service';
import { PaymentService } from './payment.service';
import { IsNumber, IsString, IsOptional, isEnum, isString, isObject, IsObject } from 'class-validator';
import { AuthGuard } from 'src/guards/auth.guard';
import { ConfirmPaymentDto, ConfirmSellDto, CreatePaymentDto, SellCryptoDto } from './dtos/payment.dtos';





@Controller('payment')
@UseGuards(AuthGuard)
export class PaymentController {
  constructor(
    private transactionService: TransactionService,
  ) {}
@Post('create-payment-intent')
  async createPaymentIntent(@Req() request :any,
    @Body() body: CreatePaymentDto,
    
  ) {
    return this.transactionService.buyCryptosWithStripe(
      request,
      body
    );
  }

  @Post('confirm-payment')
  async confirmPayment(
    @Body() body: ConfirmPaymentDto,
  ) {
    await this.transactionService.confirmStripePayment(
      body
    );
    return { message: 'Payment confirmed and tokens transferred' };
  }

   @Post('sell-crypto')
  async sellCrypto(
    @Req() request: any,
    @Body() body: SellCryptoDto,
  ) {
    return this.transactionService.sellCryptoForFiat(
      request,
      body
    );
  }
  
  @Post('confirm-sell')
  async confirmSell(
    @Body() body: ConfirmSellDto,
  ) {
    await this.transactionService.confirmSellTransaction(
      body
    );
    return { message: 'Crypto sale confirmed and fiat transfer initiated' };
  }
}