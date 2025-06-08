import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ActionService } from './action.service';
import { actionDTO } from './dtos/action.dto';
import { Action } from './schema/action.schema';
import { FormattedAction } from './dtos/foramtted-action.dto';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('action')
@UseGuards(AuthGuard)
export class ActionController {
  constructor(private readonly actionService: ActionService) { }


  @Post()
  async createAction(@Body() action: actionDTO,@Req() request : any): Promise<Action> {
    const userId = request?.UserId
    return await this.actionService.createAction(action,userId);

  }

  @Get('findById')
  async getUserActions(@Req() request : any): Promise<FormattedAction[]> {
    const userId = request?.UserId
  
    return await this.actionService.findAllByUserId(userId);
  }
}