import { refreshTokenDto } from './dtos/refresh-token.dto';
import { SignupDto } from './dtos/signup.dto';
import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { LoginDto } from './dtos/login.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ChangePasswordDto } from './dtos/change-password.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, @InjectModel(User.name) private userModel: Model<User>) { }



  //SignUP endpoint : Post 

  @Post('signup')
  async signUp(@Body() signupDto: SignupDto) {

    return this.authService.signUp(signupDto);
  }

  //login endpoint : POST  : localhost:3000/auth/login    , body :{email: "hello@gmail.com",password : "hello123"} => access token and refresh token
  @Post('login')
  async login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }


  @Get('user')
  async getAllUsers() {
    const users = await this.userModel.find();
    return users;
  }

  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: refreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.token)
  }



  //user details endpoint (this endpoint is accessed only with token(secured by guard))
  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() request: any) {
    return this.authService.me(request);
  }


  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@Req() req): Promise<{ message: string }> {
    const { UserId, walletAddress } = req; // Extract from JWT payload
    await this.authService.logout(UserId.toString(), walletAddress);
    return { message: 'Successfully logged out' };
  }


  // update the user name
  @Put('me')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req, @Body() body: { name: string; email: string }) {
    return this.authService.updateUserProfile(req.UserId, body);
  }


  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePassword(@Req() req, @Body() changePasswordDto: ChangePasswordDto) {
    await this.authService.changePassword(req.UserId, changePasswordDto);
    return { message: 'Password changed successfully. Please login again.' };
  }



}
