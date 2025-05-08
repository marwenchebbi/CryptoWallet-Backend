import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";



@Schema({ timestamps: true })
export class Action extends Document {

    @Prop({ required: true })
    desc: string;

    @Prop({ required: true, type: mongoose.Types.ObjectId })
    userId: mongoose.Types.ObjectId;


    @Prop({ type: Date })
    createdAt: Date;

    @Prop({ type: Date })
    updatedAt: Date;


}


export const  ActionSchema = SchemaFactory.createForClass(Action)
