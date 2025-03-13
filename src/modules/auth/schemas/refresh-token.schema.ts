import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";


@Schema({timestamps : true,versionKey: false})
export class  RefreshToken {
    @Prop({required : true })
    token : string;    
    @Prop({required : true , type : mongoose.Types.ObjectId})
    userId  : mongoose.Types.ObjectId
    @Prop({required : true})
    expiryDate : Date;


}

export const refreshTokenSchema = SchemaFactory.createForClass(RefreshToken);