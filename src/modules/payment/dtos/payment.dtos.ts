import { IsNumber, IsObject, IsString } from "class-validator";




export class SellCryptoDto {
  @IsNumber()
  amount: number;

  @IsString()
  userAddress: string;

  @IsString()
  currency: string;

  @IsObject()
  cardDetails: {

    name: string;

    email: string;

    paymentMethodId: string;
  };
}

export class ConfirmSellDto {
  @IsString()
  payoutIntentId: string;
}
export class CreatePaymentDto {
  @IsNumber()
  amount: number; 

  @IsString()
  senderAddress: string;

  @IsString()
  @IsString()
  currency : string;


  
}

export class ConfirmPaymentDto {
  @IsString()
  paymentIntentId: string;
}

export class CheckPaymentStatusDto {
  @IsString()
  paymentIntentId: string;
}