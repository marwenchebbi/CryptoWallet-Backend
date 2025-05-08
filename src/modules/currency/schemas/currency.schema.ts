import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";



@Schema({timestamps :true})
export class Currency  extends Document{

        @Prop({ required: true ,unique:true})
        name: string;

        @Prop({ required: true })
        symbol : string;
    
        @Prop({required : true, default : new Date()})
        createdAt : Date;
        @Prop({required : true, default : new Date()})
        updatedAt : Date;

        @Prop({required : true })
        price : number;


}

export const CurrencySchema = SchemaFactory.createForClass(Currency);