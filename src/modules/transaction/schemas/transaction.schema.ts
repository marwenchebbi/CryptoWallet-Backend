import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";
import { TransactionType } from "../dtos/transaction-type.dto";

@Schema()
export class Transaction extends Document {
  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true }) // Amount given/spent
  amount: number;

  @Prop({ required: true, type: mongoose.Types.ObjectId }) // Currency of the given amount
  currency_id: mongoose.Types.ObjectId;

  @Prop({ required: false }) // Amount received (optional, only for trading)
  receivedAmount?: number;

  @Prop({ required: false, type: mongoose.Types.ObjectId }) // Currency of the received amount (optional, only for trading)
  receivedCurrencyId?: mongoose.Types.ObjectId;

  @Prop({ required: true })
  hashed_TX: string;

  @Prop({ required: true, type: mongoose.Types.ObjectId })
  sender_id: mongoose.Types.ObjectId;

  @Prop({ required: false, type: mongoose.Types.ObjectId })
  receiver_id?: mongoose.Types.ObjectId;

  @Prop({ required: true, default: new Date() })
  createdAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);