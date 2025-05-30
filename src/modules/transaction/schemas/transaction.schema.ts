import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";
import { TransactionType } from "../dtos/transaction-type.dto";
import { PaymentType } from "../dtos/payment-type.dto";

@Schema({timestamps :true})
export class Transaction extends Document {
  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true }) // Amount given/spent
  amount: number;

  @Prop({ required: true, type: mongoose.Types.ObjectId }) // Currency of the given amount
  currency_id: mongoose.Types.ObjectId;

  @Prop({ required: false }) // Amount received (optional, only for trading)
  receivedAmount?: number;

  @Prop({ required: true })
  hashed_TX: string;

  @Prop({ required: true, type: mongoose.Types.ObjectId })
  sender_id: mongoose.Types.ObjectId;

  @Prop({ required: false, type: mongoose.Types.ObjectId })
  receiver_id?: mongoose.Types.ObjectId;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;

  
  @Prop({ required: false,enum: PaymentType  }) // Amount received (optional, only for trading)
  paymentType?: PaymentType;


}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);


// Index for sorting by createdAt
TransactionSchema.index({ createdAt: -1 });