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

