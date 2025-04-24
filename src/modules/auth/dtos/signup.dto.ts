import { IsEmail, IsString, Matches, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SignupDto {
  @ApiProperty({
    description: "The user's full name",
    example: "John Doe",
    type: String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "The user's email address",
    example: "john.doe@example.com",
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      "The user's password (minimum 6 characters, must contain at least one number)",
    example: "Password123",
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6)
  @Matches(/^(?=.*[0-9])/, {
    message: "Password must contain at least one number!",
  })
  password: string;
}