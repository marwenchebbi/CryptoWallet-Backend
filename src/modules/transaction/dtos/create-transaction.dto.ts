import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TransactionType } from './transaction-type.dto';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  senderAddress: string; 

  @IsString()
  @IsOptional()
  receiverAddress: string; 
}