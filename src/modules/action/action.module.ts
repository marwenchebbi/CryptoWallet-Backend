import { Module } from '@nestjs/common';
import { ActionService } from './action.service';
import { ActionController } from './action.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Action, ActionSchema } from './schema/action.schema';

@Module({
  imports: [MongooseModule.forFeature([
    {
      name: Action.name,
      schema: ActionSchema
    },])],

  controllers: [ActionController],
  providers: [ActionService],
  exports : [ActionService]
})
export class ActionModule { }
