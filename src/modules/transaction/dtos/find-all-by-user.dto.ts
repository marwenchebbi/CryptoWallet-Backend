import { Transaction } from "../schemas/transaction.schema";
import { IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';


export class FindAllByUserQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number) // Transforms string to number
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number) // Transforms string to number
  limit?: number;

  @IsOptional()
  @IsString()
  sort?: string;
}


// Interface for response structure
export interface FindAllByUserResponse {
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}