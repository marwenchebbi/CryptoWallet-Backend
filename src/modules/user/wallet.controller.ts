import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { User } from '../auth/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('user')
export class WalletController {
  constructor(
    private readonly userService: WalletService,
  ) { }


    /*@Get('restore-accounts')
    async restoreAccounts() {
      return this.userService.restoreWallets()
    }*/



}
