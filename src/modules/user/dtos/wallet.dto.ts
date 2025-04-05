import { IsNumber, IsString } from "class-validator";

export class WalletInfoDTO {
    @IsString()
    address: string;

    @IsNumber()
    prxBalance: number;

    @IsNumber()
    usdtBalance: number;

}

export class  WalletRequestDTO{

    @IsString()
    address: string;
}
