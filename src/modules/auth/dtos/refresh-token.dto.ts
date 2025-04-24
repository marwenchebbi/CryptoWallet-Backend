import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiProperty({
    description: "The refresh token used to obtain a new access token",
    example: "549dzzd-zdzdz6d4zdz4d",
    type: String,
  })
  @IsString()
  token: string;
}