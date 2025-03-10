
import {  IsString } from "class-validator";

export class refreshTokenDto {


    @IsString()
    token : string; 
}