
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";
import { TransactionType } from "../dtos/transaction-type.dto";

@Schema()
export class Transaction extends Document{
  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true})
  amount: number;

  @Prop({ required: true, type: mongoose.Types.ObjectId })
  currency_id: mongoose.Types.ObjectId;

  @Prop({ required: true })
  hashed_TX: string;

  @Prop({ required: true, type: mongoose.Types.ObjectId })
  sender_id: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Types.ObjectId })
  receiver_id: mongoose.Types.ObjectId;

  @Prop({ required: true, default: new Date() })
  createdAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);