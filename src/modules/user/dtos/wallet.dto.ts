import { IsString } from "class-validator";

export class WalletDto {
    @IsString()
    address: string;

    @IsString()
    balance: string;

    @IsString()
    balanceWei: string;

    @IsString()
    network: string;
}
