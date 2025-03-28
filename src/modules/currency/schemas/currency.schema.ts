import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";



@Schema()
export class Currency {

        @Prop({ required: true ,unique:true})
        name: string;

        @Prop({ required: true })
        symbol : string;
    
        @Prop({required : true, default : new Date()})
        createdAt : Date;


}

export const CurrencySchema = SchemaFactory.createForClass(Currency);