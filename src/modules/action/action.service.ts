import { BadRequestException, Injectable, NotFoundException, Req } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { actionDTO } from './dtos/action.dto';
import { Action } from './schema/action.schema';
import { errors } from 'src/errors/errors.config';
import { FormattedAction } from './dtos/foramtted-action.dto';


@Injectable()
export class ActionService {
  constructor(
    @InjectModel(Action.name) private actionModel: Model<Action>,
  ) {}

  async createAction(action: actionDTO,userId : string): Promise<Action> {
    const { desc} = action;
    try {
      // Create and save the action
      const storedAction = await this.actionModel.create({
        desc,
        userId,
      });

      return storedAction;
    } catch (error) {
      throw new BadRequestException(errors.errorCreateAction);
    }
  }

  async findAllByUserId(userId : string): Promise<FormattedAction[]> {
    try {
      // Validate userId
      if (!userId) {
        throw new BadRequestException(errors.userNotFound);
      }

      // Find all actions for the user
      const actions = await this.actionModel
        .find({ userId })
        .sort({ createdAt: -1 }) // Sort by newest first
        .exec();

      // Map actions to FormattedAction DTO
      const formattedActions: FormattedAction[] = actions.map((action) => ({
        description: action.desc, // Assuming desc is the field in Action schema
        date : action.createdAt
      }));

      return formattedActions;
    } catch (error) {

      throw new BadRequestException(errors.errorFetchingActions);
    }
  }
}