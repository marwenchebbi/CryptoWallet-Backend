import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTransactionDto {
  @ApiProperty({
    description: "The amount given or spent in the transaction",
    example: "100.50",
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: "The address of the sender",
    example: "0x1234567890abcdef1234567890abcdef12345678",
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  senderAddress: string;

  @ApiProperty({
    description: "The address of the receiver (optional for trading operations)",
    example: "0xabcdef1234567890abcdef1234567890abcdef12",
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  receiverAddress?: string;

  @ApiProperty({
    description: "The input currency for the transaction (optional for transfers)",
    example: "USDT",
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  inputCurrency?: string;

  @ApiProperty({
    description: "The amount received in the transaction (optional for trading)",
    example: "95.25",
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  receivedAmount?: string;

  @ApiProperty({
    description: "The currency of the received amount (optional for trading)",
    example: "BTC",
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  receivedCurrency?: string;

  @IsString()
  @IsOptional()
  adminAddress?: string;

}