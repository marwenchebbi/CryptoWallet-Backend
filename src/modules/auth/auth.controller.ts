import { refreshTokenDto } from './dtos/refresh-token.dto';
import { SignupDto } from './dtos/signup.dto';
import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { LoginDto } from './dtos/login.dto';
import { AuthGuard } from 'src/guards/auth.guard';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, @InjectModel(User.name) private userModel: Model<User>) { }



  //SignUP endpoint : Post 
  @Post('signup')
  async signUp(@Body() signupDto: SignupDto) {

    return this.authService.signUp(signupDto);
  }

  //login endpoint : POST  : localhost:3000/auth/login    , body :{email: "hello@gmail.com",password : "0000"} => access token and refresh token
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
  async me(@Req() request) {
    return this.authService.me(request);
  }



}
