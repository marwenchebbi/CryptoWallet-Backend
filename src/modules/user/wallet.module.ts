import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/schemas/user.schema';


//this module will manage the blockchain wallets (unlocking the accounts importing them and sving the address .... )
@Module({
  imports: [MongooseModule.forFeature([
    {
      name: User.name,
      schema: UserSchema
    },]
  )],

  controllers: [WalletController],
  providers: [WalletService],
  exports : [WalletService]
})
export class WalletModule { }
