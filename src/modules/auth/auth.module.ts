import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule, Schema } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { RefreshToken, refreshTokenSchema } from './schemas/refresh-token.schema';
import { WalletModule } from '../user/wallet.module';

@Module({
  imports: [MongooseModule.forFeature([
    {
      name: User.name,
      schema: UserSchema
    },
    {
      name: RefreshToken.name,
      schema: refreshTokenSchema
    }])
    ,
    WalletModule],
    
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule { }
