import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CurrencyDto } from './dtos/currency.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';


 @UseGuards(AuthGuard)
@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Post('')
  @ApiOperation({ summary: 'Create a new currency' })
  @ApiBody({ type: CurrencyDto })
  @ApiResponse({
    status: 201,

  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createCurrency(@Body() currencyDTO: CurrencyDto) {
    return this.currencyService.createCurrency(currencyDTO);
  }
}