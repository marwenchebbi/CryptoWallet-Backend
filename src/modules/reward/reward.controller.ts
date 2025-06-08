import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RewardService } from './reward.service';
import { AuthGuard } from 'src/guards/auth.guard';


@Controller('reward')
@UseGuards(AuthGuard)
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get('/assign-now')
  async assignNow(@Req() request:any) {
    await this.rewardService.handleCron(request);
    return { message: 'Manual reward check executed.' };
  }

  @Get('')
  async findAllByUser(@Req() request : any){
    return this.rewardService.findAllByUser(request?.UserId.toString())
  }



}
