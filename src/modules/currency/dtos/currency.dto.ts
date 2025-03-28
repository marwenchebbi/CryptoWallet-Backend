
import { IsEmail, IsString, IsUppercase } from "class-validator";

export class CurrencyDto {

    @IsString()
    name : String;

    @IsString()
    @IsUppercase({message : 'Symbol must be uppercase !!'})
    symbol : string; 
}