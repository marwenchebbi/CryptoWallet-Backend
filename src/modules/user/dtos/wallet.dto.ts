import { IsNumber, IsString } from "class-validator";

export class WalletInfoDTO {
    @IsString()
    address: string;

    @IsString()
    encryptedPrivateKey?: string; //not returned when fetching the wallet info

    @IsNumber()
    prxBalance: number;

    @IsNumber()
    usdtBalance: number;

}


// DTO for locking the wallet
export class LockWalletDTO {
  @IsString()
  userId: string;
  @IsString()
  walletAddress: string;
}

// DTO for unlocking the wallet
export class UnlockWalletDTO {
  @IsString()
  userId: string;
   @IsString()
   walletAddress: string;
   @IsString()
   password: string;
}

