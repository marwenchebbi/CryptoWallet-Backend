import { Controller, Get } from '@nestjs/common';
import { PriceHistoryService } from './price-history.service';

@Controller('price-history')
export class PriceHistoryController {
  constructor(private readonly priceHistoryService: PriceHistoryService) {}



  @Get('')
  async findall(){
    return this.priceHistoryService.findAll()
  }
}
