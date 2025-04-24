import { IsEmail, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    description: "The user's email address",
    example: "user@example.com",
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "The user's password",
    example: "Password123!",
    type: String,
  })
  @IsString()
  password: string;
}