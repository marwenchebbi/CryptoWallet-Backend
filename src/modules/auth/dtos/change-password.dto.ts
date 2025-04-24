import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({
    description: "The user's current password (minimum 6 characters)",
    example: "Old `OldPass123",
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6, { message: "Old password must be at least 6 characters" })
  oldPassword: string;

  @ApiProperty({
    description: "The user's new password (minimum 6 characters)",
    example: "NewPass456",
    minLength: 6,
    type: String,
  })
  @IsString()
  @MinLength(6, { message: "New password must be at least 6 characters" })
  newPassword: string;
}