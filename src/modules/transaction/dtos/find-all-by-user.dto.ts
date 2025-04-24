import { Transaction } from "../schemas/transaction.schema";
import { IsOptional, IsInt, Min, IsString, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { TransactionType } from "./transaction-type.dto";
import mongoose from "mongoose";
import { ApiProperty } from "@nestjs/swagger";


export class FindAllByUserQueryDto {
    @ApiProperty({
      description: 'Page number for pagination (minimum 1)',
      example: 1,
      type: Number,
      required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number;
  
    @ApiProperty({
      description: 'Number of transactions per page (minimum 1)',
      example: 10,
      type: Number,
      required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number;
  
    @ApiProperty({
      description: 'Field to sort by (e.g., "date", "-date" for descending)',
      example: '-date',
      type: String,
      required: false,
    })
    @IsOptional()
    @IsString()
    sort?: string;
  
    @ApiProperty({
      description: 'Type of transaction to filter by (trading or transfer)',
      enum: TransactionType,
      example: TransactionType.TRADING,
      required: false,
    })
    @IsOptional()
    @IsEnum(TransactionType)
    type?: TransactionType;
  
    @ApiProperty({
      description: 'Filter transactions by operation (buy, sell, send, receive)',
      example: 'buy',
      enum: ['buy', 'sell', 'send', 'receive'],
      required: false,
    })
    @IsOptional()
    @IsEnum(['buy', 'sell', 'send', 'receive'])
    filter?: 'buy' | 'sell' | 'send' | 'receive';
  }
// Swagger schema for FormattedTransaction interface
export class FormattedTransaction {
  @ApiProperty({
    description: "Type of the transaction",
    example: "trading",
    type: String,
  })
  type: string;

  @ApiProperty({
    description: "Amount of the transaction",
    example: 100.5,
    type: Number,
  })
  amount: number;

  @ApiProperty({
    description: "Received amount (if applicable)",
    example: 95.5,
    type: Number,
    required: false,
  })
  received_amount?: number;

  @ApiProperty({
    description: "Date of the transaction",
    example: "2025-04-18T12:00:00Z",
    type: String,
    format: "date-time",
  })
  date: Date;

  @ApiProperty({
    description: "Operation type (buy or sell)",
    example: "buy",
    enum: ["buy", "sell"],
    required: false,
  })
  operation?: "buy" | "sell";

  @ApiProperty({
    description: "ID of the sender",
    example: "507f1f77bcf86cd799439011",
    type: String,
  })
  sender_id: string;
}

// Swagger schema for FindAllByUserResponse interface
export class FindAllByUserResponse {
  @ApiProperty({
    description: "List of formatted transactions",
    type: [FormattedTransaction],
  })
  transactions: FormattedTransaction[];

  @ApiProperty({
    description: "Total number of transactions",
    example: 100,
    type: Number,
  })
  total: number;

  @ApiProperty({
    description: "Current page number",
    example: 1,
    type: Number,
  })
  page: number;

  @ApiProperty({
    description: "Number of transactions per page",
    example: 10,
    type: Number,
  })
  limit: number;

  @ApiProperty({
    description: "Total number of pages",
    example: 10,
    type: Number,
  })
  totalPages: number;
}