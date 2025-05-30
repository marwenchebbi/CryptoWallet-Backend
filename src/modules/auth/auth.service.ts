import { SignupDto } from './dtos/signup.dto';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dtos/login.dto';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from './schemas/refresh-token.schema';
import { errors } from 'src/errors/errors.config';
import { WalletService } from '../user/wallet.service';
import { Request } from 'express';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { MailService } from '../../services/mail.service';
import { ActionService } from '../action/action.service';
import * as geoip from 'geoip-lite'; // For geolocation
import { IsNotEmpty, IsString } from 'class-validator';
import { decryptPrivateKey } from 'src/utilities/encryption-keys';
//import UAParser from 'ua-parser-js'; // For parsing user-agent


export class Enable2FADTO {
  @IsString()
  @IsNotEmpty()
  userId: string;

}


const { web3 } = require('../../config/contracts-config');
const UAParser = require('ua-parser-js');
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshToken>,
    private walletService: WalletService,
    private jwtService: JwtService,
    private mailService: MailService,
    private actionService: ActionService, // Inject ActionService
  ) {}


// crreate a new user
  async signUp(signupDto: SignupDto): Promise<Object> {
    const { name, email, password } = signupDto;

    // Check if email is already in use
    const userInUse = await this.userModel.findOne({ email });
    if (userInUse) {
      throw new BadRequestException(errors.emailInUse);
    }

    // Create wallet before user registration
    const wallet = await this.walletService.createWallet(password);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // Token expires in 24 hours

    // Create new user with wallet details and verification fields
    const user = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      walletAddress: wallet.address,
      encryptedPrivateKey: wallet.encryptedPrivateKey,
      isVerified: false,
      verificationToken,
      verificationTokenExpiry,
    });

    if (!user) {
      throw new InternalServerErrorException(errors.errorCreatingWallet);
    }

    // Send verification email
    await this.mailService.sendVerificationEmail(user.email, verificationToken);

    return {
      message: 'You registered successfully. Please verify your email to activate your account.',
      userId: user._id.toString(),
    };
  }


  async verifyEmail(token: string): Promise<{ message: string }> {
    // Find user by verification token
    const user = await this.userModel.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gte: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Update user to mark as verified
    user.isVerified = true;
    user.verificationToken = undefined; // Clear token
    user.verificationTokenExpiry = undefined; // Clear expiry
    await user.save();

    // Log the action
    await this.actionService.createAction({
      desc: 'You verified email',
      userId: user._id.toString(),
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }


// resend the verification email
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new verification token
    const verificationToken = uuidv4();
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 1);

    // Update user with new token
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = verificationTokenExpiry;
    await user.save();

    // Send verification email
    await this.mailService.sendVerificationEmail(email, verificationToken);

    return { message: 'Verification email resent successfully' };
  }



  async login(loginData: LoginDto): Promise<{ accessToken: string; refreshToken: string; userId: string; walletAddress: string ; isWalletLocked : boolean ;TowFAEnabled : boolean }> {
    const { email, password } = loginData;

    // Check if the user exists
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException(errors.wrongCredentials);
    }

    // Check if email is verified
    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    // Verify the password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException(errors.wrongCredentials);
    }

    // Unlock the user's wallet
    await this.walletService.unlockUserWallet(user._id.toString(), password);
    //decrypt the user wallet
    const  privatekey = await decryptPrivateKey(user.encryptedPrivateKey)

    //unlock the wallet 
    await this.walletService.importAndUnlockWallet(privatekey,password)

    // Generate tokens
    const tokens = await this.generateUserTokens(user._id.toString(), user.walletAddress.toString(),user.isWalletLocked);

    await this.actionService.createAction({
      desc: 'you logged In ',
      userId : user._id.toString(),
    });

    return {
      ...tokens,
      userId: user._id.toString(),
      walletAddress: user.walletAddress.toString(),
      isWalletLocked : user.isWalletLocked,
      TowFAEnabled : user.TowFAEnabled
    };
  }


// generate the access token and the refresh token
  async generateUserTokens(UserId: string, walletAddress: string,isWalletLocked:boolean) {
    const accessToken = await this.jwtService.sign({ UserId, walletAddress,isWalletLocked }, { expiresIn: '15m' });
    const refreshToken = await uuidv4();
    await this.storeTokens(refreshToken, UserId);

    return {
      accessToken,
      refreshToken,
    };
  }



// store the tokens generated in the database
  async storeTokens(Token: string, UserId: any) {
    const ExpiryDate = new Date();
    ExpiryDate.setDate(ExpiryDate.getDate() + 3);
    await this.refreshTokenModel.updateOne(
      { userId: UserId },
      { $set: { token: Token, expiryDate: ExpiryDate } },
      { upsert: true },
    );
  }



// refresh the tokens  
  async refreshToken(Token: string) {
    console.log(Token)
    const token = await this.refreshTokenModel.findOne({
      token: Token,
      expiryDate: { $gte: new Date() },
    });
    console.log(token)

    const user = await this.userModel.findOne({ _id: token?.userId });
    if (!user) {
      throw new UnauthorizedException(errors.wrongCredentials);
    }

    if (!token) {
      throw new UnauthorizedException(errors.sessionExpired);
    }
    return this.generateUserTokens(token.userId.toString(), user.walletAddress, user.isWalletLocked);
  }




// fetch the user details using the accesstoken extracted in the authguard
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
        isVerified: user.isVerified,
        isWalletLocked :user.isWalletLocked
      },
    };
  }




// logout the user and lock the wallet and delete the refresh token
async logout(userId: string, walletAddress: string): Promise<void> {
  try {

    await this.refreshTokenModel.deleteOne({ userId });

    // Log the action
    await this.actionService.createAction({
      desc: 'You logged out and locked your wallet',
      userId,
    });

    console.log(`User ${userId} logged out, wallet ${walletAddress} locked, and refresh token invalidated`);
  } catch (error) {
    console.error('Error during logout:', error);
    throw new InternalServerErrorException({
      ...errors.walletLockFailed,
      message: `Failed to lock wallet or invalidate session: ${error.message}`,
    });
  }
}



//change the password by another password
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
      newPassword,
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

    // Log the action
    await this.actionService.createAction({
      desc: 'User changed password',
      userId,
    });
  } catch (error) {
    throw new InternalServerErrorException({
      ...errors.passwordUpdateFailed,
      message: `Password update failed: ${error.message}`,
    });
  }
}



//update the user profile (in this case the name only)
async updateUserProfile(userId: string, data: { name: string }) {
  const user = await this.userModel.findById(userId);
  if (!user) {
    throw new NotFoundException(errors.userNotFound);
  }

  const updatedUser = await this.userModel.findByIdAndUpdate(
    userId,
    { name: data.name },
    { new: true },
  );

  if (!updatedUser) {
    throw new InternalServerErrorException(errors.walletUpdateFailed);
  }

  // Log the action
  await this.actionService.createAction({
    desc: 'User updated profile',
    userId,
  });

  return {
    userDetails: {
      username: updatedUser.name,
      email: updatedUser.email,
      walletAddress: updatedUser.walletAddress,
      prxBalance: updatedUser.prxBalance,
      usdtBalance: updatedUser.usdtBalance,
      isVerified: updatedUser.isVerified,
    },
  };
}

async enable2FA(userId: string): Promise<{ success: boolean }> {
  // Validate userId as a valid ObjectId
  if (!Types.ObjectId.isValid(userId)) {
    throw new NotFoundException(errors.userNotFound);
  }

  // Update the user's TowFAEnabled field
  const result = await this.userModel.updateOne(
    { _id: new Types.ObjectId(userId) },
    { $set: { TowFAEnabled: true } },
  );

  // Check if the user was found
  if (result.matchedCount === 0) {
    throw new NotFoundException(errors.errorEnabling2FA);
  }

  return { success: true };
}

async disable2FA(userId: string): Promise<{ success: boolean }> {
  // Validate userId as a valid ObjectId
  if (!Types.ObjectId.isValid(userId)) {
    throw new NotFoundException(errors.userNotFound);
  }

  // Update the user's TowFAEnabled field
  const result = await this.userModel.updateOne(
    { _id: new Types.ObjectId(userId) },
    { $set: { TowFAEnabled: false } },
  );

  // Check if the user was found
  if (result.matchedCount === 0) {
    throw new NotFoundException(errors.errorDisabling2FA);
  }

  return { success: true };
}



}