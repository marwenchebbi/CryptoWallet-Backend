import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsBoolean } from "class-validator";
import { Document } from "mongoose";
@Schema()
export class User extends Document{

    @Prop({ required: true })
    name : string;
    @Prop({ required: true ,unique:true})
    email:string;
    @Prop({ required: true })
    password : string;

    //this the tow verification authentication 
    @Prop({required  : true, default : false})
    TowFAEnabled :  boolean;

    @Prop({required : true, default :'0x00'})
    walletAddress  : string;

    @Prop({required : true,default : 0})
    prxBalance : number;

    @Prop({required : true,default : 0})
    usdtBalance : number;

    @Prop({required : true, default : new Date()})
    createdAt : Date;



}

export const UserSchema = SchemaFactory.createForClass(User);