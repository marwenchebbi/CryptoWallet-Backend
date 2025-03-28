import { Body, Controller, Post } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CurrencyDto } from './dtos/currency.dto';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}


  @Post('')
  async createCurrency(@Body() currencyDTO : CurrencyDto ){
    return this.currencyService.createCurrency(currencyDTO);

  }
}
