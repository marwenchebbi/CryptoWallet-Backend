import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TransactionType } from './transaction-type.dto';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  amount: string; // Amount given/spent

  @IsString()
  @IsNotEmpty()
  senderAddress: string;

  @IsString()
  @IsOptional()
  receiverAddress?: string; // Optional for trading operations

  @IsString()
  @IsOptional()
  inputCurrency?: string; // Optional for transfers

  @IsString()
  @IsOptional()
  receivedAmount?: string; // Amount received (for trading)

  @IsString()
  @IsOptional()
  receivedCurrency?: string; // Currency of the received amount (for trading)
}