import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ActionService } from './action.service';
import { actionDTO } from './dtos/action.dto';
import { Action } from './schema/action.schema';
import { FormattedAction } from './dtos/foramtted-action.dto';

@Controller('action')
export class ActionController {
  constructor(private readonly actionService: ActionService) { }


  @Post()
  async createAction(@Body() action: actionDTO): Promise<Action> {
    return await this.actionService.createAction(action);

  }

  @Get(':userId')

  async getUserActions(@Param('userId') userId: string): Promise<FormattedAction[]> {
    return await this.actionService.findAllByUserId(userId);
  }
}
