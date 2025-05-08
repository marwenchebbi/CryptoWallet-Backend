import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";



@Schema({ timestamps: true })
export class PriceHistory extends Document {
    _id: mongoose.Types.ObjectId;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true, type: mongoose.Types.ObjectId })
    currencyId: mongoose.Types.ObjectId

    @Prop({ required: false, })
    createdAt: Date;

    @Prop({ required: false,  })
    updatedAt: Date;




}

export const PriceHistorySchema = SchemaFactory.createForClass(PriceHistory);