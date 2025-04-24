import { IsEmail, IsString, IsUppercase } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CurrencyDto {
  @ApiProperty({
    description: "The name of the currency",
    example: "United States Dollar",
    type: String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Dinar Tounsi",
    example: "TND",
    type: String,
  })
  @IsString()
  @IsUppercase({ message: "Symbol must be uppercase !!" })
  symbol: string;
}