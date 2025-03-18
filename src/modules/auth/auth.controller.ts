import { refreshTokenDto } from './dtos/refreshTokenDto';
import { SignupDto } from './dtos/SignupDto';
import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { LoginDto } from './dtos/LoginDto';
import { AuthGuard } from 'src/guards/auth.guard';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, @InjectModel(User.name) private userModel: Model<User>) { }

  //user details endpoint 
  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() request) {
    return this.authService.me(request);
  }

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
  @Get('hello')
  async hello(){
    return await this.authService.hello();
  }


}
