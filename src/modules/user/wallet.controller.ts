import { BadRequestException, Body, Controller, Get, Param, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletRequestDTO, WalletInfoDTO } from './dtos/wallet.dto';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly userService: WalletService,
  ) { }

  @Get('info')
  async walletInfo(@Query('address') address: string): Promise<WalletInfoDTO> {
    if (!address) {
      throw new BadRequestException('Address query parameter is required');
    }
    return this.userService.getWalletInfo(address);
  }





}
