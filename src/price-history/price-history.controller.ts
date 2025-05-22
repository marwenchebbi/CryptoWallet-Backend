import { Controller, Get, UseGuards } from '@nestjs/common';
import { PriceHistoryService } from './price-history.service';
import { AuthGuard } from 'src/guards/auth.guard';



 @UseGuards(AuthGuard)
@Controller('price-history')
export class PriceHistoryController {
  constructor(private readonly priceHistoryService: PriceHistoryService) {}



  @Get('')
  async findall(){
    return this.priceHistoryService.findAll()
  }
}
