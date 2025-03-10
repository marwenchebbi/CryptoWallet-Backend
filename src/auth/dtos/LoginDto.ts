
import { IsEmail, IsString } from "class-validator";

export class LoginDto {

    @IsEmail()
    email : String;

    @IsString()
    password : string; 
}