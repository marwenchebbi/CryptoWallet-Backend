import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class Reward extends Document {
  @Prop({required : true , type : mongoose.Types.ObjectId})
   userId  : mongoose.Types.ObjectId

  @Prop({ required: true })
  cardId: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  rewardPoints: number;

  @Prop({ required: true })
  completedOnTime: boolean;

  @Prop({ default: Date.now })
  rewardedAt: Date;

  @Prop({required : true, default:false })
  isClaimed : boolean
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
