import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletInfoDTO } from './dtos/wallet.dto';
import { IsString } from 'class-validator';

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

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('info')
  async walletInfo(@Query('address') address: string): Promise<WalletInfoDTO> {
    if (!address) {
      throw new BadRequestException('Address query parameter is required');
    }
    return this.walletService.getWalletInfo(address);
  }

  @Post('lock')
  async lockWallet(@Body() lockWalletDTO: LockWalletDTO): Promise<{ isWalletLocked: boolean }> {
    const {userId, walletAddress} = lockWalletDTO
    return this.walletService.lockUserWallet(userId, walletAddress);
  }

  @Post('unlock')
  async unlockWallet(@Body() unlockWalletDTO: UnlockWalletDTO): Promise<{ address: string; message: string }> {
    // Call the service to unlock the wallet
    const {userId, walletAddress , password} = unlockWalletDTO
    return this.walletService.unlockUserWallet(userId, password);
  }
}