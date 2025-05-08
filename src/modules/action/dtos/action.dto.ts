import { IsString } from "class-validator";



export class actionDTO{
     @IsString()
    desc : string;
    @IsString()
    userId  : string;


} 