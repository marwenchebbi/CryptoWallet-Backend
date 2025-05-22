import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { LockWalletDTO, UnlockWalletDTO, WalletInfoDTO } from './dtos/wallet.dto';
import { IsString } from 'class-validator';
import { AuthGuard } from 'src/guards/auth.guard';


 @UseGuards(AuthGuard)
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