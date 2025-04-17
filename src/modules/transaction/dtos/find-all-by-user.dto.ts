import { Transaction } from "../schemas/transaction.schema";
import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from "./transaction-type.dto";
import mongoose from "mongoose";


export class FindAllByUserQueryDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number;
  
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number;
  
    @IsOptional()
    @IsString()
    sort?: string;
  
    @IsOptional()
    @IsEnum(TransactionType)
    type?: TransactionType;
  }
  
  // Interface for query structure
  export interface FindAllByUserResponse {
      transactions: FormattedTransaction[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
  }

  // Interface for formatted transaction
export interface FormattedTransaction {
    type: string;
    amount: number;
    received_amount?: number;
    date: Date;
    operation?: 'buy' | 'sell';
    sender_id:  string
  }