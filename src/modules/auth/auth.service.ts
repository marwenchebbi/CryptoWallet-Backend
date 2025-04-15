import { SignupDto } from './dtos/signup.dto';
import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dtos/login.dto';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from './schemas/refresh-token.schema';
import { errors } from 'src/errors/errors.config';
import { WalletService } from '../user/wallet.service';
import { Request } from 'express';
import { ChangePasswordDto } from './dtos/change-password.dto';

const { web3 } = require('../../config/contracts-config');

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshToken>,
    private walletService: WalletService,
    private jwtService: JwtService,
  ) {}

  async signUp(signupDto: SignupDto): Promise<Object> {
    const { name, email, password } = signupDto;

    // Create wallet before user registration
    const wallet = await this.walletService.createWallet(password);

    // Check if email is already in use
    const userInUse = await this.userModel.findOne({ email });
    if (userInUse) {
      throw new BadRequestException(errors.emailInUse);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with wallet details
    const user = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      walletAddress: wallet.address,
      encryptedPrivateKey: wallet.encryptedPrivateKey,
    });

    if (!user) {
      throw new InternalServerErrorException(errors.errorCreatingWallet);
    }
    return user;
  }

  async login(loginData: LoginDto): Promise<{ accessToken: string; refreshToken: string; userId: string; walletAddress: string }> {
    const { email, password } = loginData;

    // Check if the user exists
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException(errors.wrongCredentials);
    }

    // Verify the password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException(errors.wrongCredentials);
    }

    // Unlock the user's wallet
    await this.walletService.unlockUserWallet(user._id.toString(), password);

    // Generate tokens
    const tokens = await this.generateUserTokens(user._id.toString(), user.walletAddress.toString());

    return {
      ...tokens,
      userId: user._id.toString(),
      walletAddress: user.walletAddress.toString(),
    };
  }

  async generateUserTokens(UserId: string, walletAddress: string) {
    const accessToken = await this.jwtService.sign({ UserId, walletAddress }, { expiresIn: '1h' });
    const refreshToken = await uuidv4();
    await this.storeTokens(refreshToken, UserId);

    return {
      accessToken,
      refreshToken,
    };
  }

  async storeTokens(Token: string, UserId: any) {
    const ExpiryDate = new Date();
    ExpiryDate.setDate(ExpiryDate.getDate() + 3);
    await this.refreshTokenModel.updateOne(
      { userId: UserId },
      { $set: { token: Token, expiryDate: ExpiryDate } },
      { upsert: true },
    );
  }

  async refreshToken(Token: string) {
    const token = await this.refreshTokenModel.findOne({
      token: Token,
      expiryDate: { $gte: new Date() },
    });

    const user = await this.userModel.findOne({ _id: token?.userId });
    if (!user) {
      throw new UnauthorizedException(errors.wrongCredentials);
    }

    if (!token) {
      throw new UnauthorizedException(errors.sessionExpired);
    }
    return this.generateUserTokens(token.userId.toString(), user.walletAddress);
  }





  async me(request: any) {
    const user = await this.userModel.findOne({ _id: request.UserId });
    if (!user) throw new NotFoundException('User not found!');
    return {
      userDetails: {
        username: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        prxBalance: user.prxBalance,
        usdtBalance: user.usdtBalance,
      },
    };
  }

  

  async logout(userId: string, walletAddress: string): Promise<void> {
    try {
      await web3.eth.personal.lockAccount(walletAddress);
      await this.refreshTokenModel.deleteOne({ userId });
      console.log(`User ${userId} logged out, wallet ${walletAddress} locked, and refresh token invalidated`);
    } catch (error) {
      console.error('Error during logout:', error);
      throw new InternalServerErrorException({
        ...errors.walletLockFailed,
        message: `Failed to lock wallet or invalidate session: ${error.message}`,
      });
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { oldPassword, newPassword } = changePasswordDto;
    
    // Find user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(errors.userNotFound);
    }

    // Verify old password
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException(errors.wrongCredentials);
    }

    // Re-encrypt private key with new password
    try {
      const walletUpdate = await this.walletService.updateWalletPassword(
        userId,
        oldPassword,
        newPassword
      );

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await this.userModel.findByIdAndUpdate(userId, {
        password: hashedNewPassword,
        encryptedPrivateKey: walletUpdate.encryptedPrivateKey,
      });

      // Lock wallet and invalidate tokens
      await web3.eth.personal.lockAccount(user.walletAddress);
      await this.refreshTokenModel.deleteOne({ userId });

    } catch (error) {
      throw new InternalServerErrorException({
        ...errors.passwordUpdateFailed,
        message: `Password update failed: ${error.message}`,
      });
    }
  }

  async updateUserProfile(userId: string, data: { name: string}) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(errors.userNotFound);
    }


    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { name: data.name},
      { new: true }
    );

    if (!updatedUser) {
      throw new InternalServerErrorException(errors.walletUpdateFailed);
    }

    return {
      userDetails: {
        username: updatedUser.name,
        email: updatedUser.email,
        walletAddress: updatedUser.walletAddress,
        prxBalance: updatedUser.prxBalance,
        usdtBalance: updatedUser.usdtBalance,
      },
    };
  }
}