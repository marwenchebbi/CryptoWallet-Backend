import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { SignupDto } from './dtos/signup.dto';
import { Body, Controller, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthService, Enable2FADTO } from './auth.service';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { LoginDto } from './dtos/login.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ChangePasswordDto } from './dtos/change-password.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';



@ApiTags('auth')
@ApiBadRequestResponse({
  description: 'Invalid credentials provided',
  schema: {
    example: {
      error: true,
      errorDetails: {
        statusCode: 400,
        message: 'message for for the user ',
        error: 'error',
        code: 'ERROR',
      },
      timeStamp: '2025-04-18T19:48:45.948Z',
    },
  },
})
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) { }

  // SignUP endpoint: POST /auth/signup
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',

  })

  async signUp(@Body() signupDto: SignupDto) {
    return this.authService.signUp(signupDto);
  }

  // Login endpoint: POST /auth/login
  @Post('login')
  @ApiOperation({ summary: 'Log in a user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        userId: '325655',
        walletAddress: '0x5md555866e58ff5f88e8563dd25ddd477DD'
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }



  // Refresh token: POST /auth/refresh
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.token);
  }

  // User details: GET /auth/me (protected)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('jwt')
  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user details' })
  @ApiResponse({
    status: 200,
    description: 'Details of the authenticated user',
    schema: {
      example: {
        userDetails: {
          username: 'JohnDoe',
          email: 'john.doe@example.com',
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          prxBalance: 100.50,
          usdtBalance: 200.75,
          isVerified: true,
        },
      },
    },
  })
  async me(@Req() request: any) {
    return this.authService.me(request);
  }

  // Logout: POST /auth/logout (protected)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Log out the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
    schema: { example: { message: 'Successfully logged out' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Req() req): Promise<{ message: string }> {
    const { UserId, walletAddress } = req; // Extract from JWT payload
    await this.authService.logout(UserId.toString(), walletAddress);
    return { message: 'Successfully logged out' };
  }

  // Update profile: PUT /auth/me (protected)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Put('me')
  @ApiOperation({ summary: 'Update authenticated user profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    schema: {
      example: {
        "userDetails": {
          "username": "samir",
          "email": "sami@gmail.com",
          "walletAddress": "0xA4Fd40dzzzzdzkdzdlkzdld6aC0cE2D4bc3f3ae",
          "prxBalance": 2871.286147774001,
          "usdtBalance": 6466.264667405334,
          "isVerified": true
        }
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateProfile(@Req() req, @Body() body: { name: string; email: string }) {
    return this.authService.updateUserProfile(req.UserId, body);
  }

  // Change password: POST /auth/change-password (protected)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  @ApiOperation({ summary: 'Change authenticated user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: { example: { message: 'Password changed successfully. Please login again.' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async changePassword(@Req() req, @Body() changePasswordDto: ChangePasswordDto) {
    await this.authService.changePassword(req.UserId, changePasswordDto);
    return { message: 'Password changed successfully. Please login again.' };
  }



  // Verify email: GET /auth/verify-email
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiQuery({ name: 'token', type: String, description: 'Email verification token' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: { example: { message: 'Email verified successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // Resend verification email: POST /auth/resend-verification
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { email: { type: 'string', example: 'john.doe@example.com' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email resent successfully',
    schema: { example: { message: 'Verification email sent' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid email' })
  async resendVerificationEmail(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }



  @Post('enable-2FA')
  async enable2FA(@Body() enableDTO: Enable2FADTO) {
    return this.authService.enable2FA(enableDTO.userId);
  }

  @Post('disable-2FA')
  async disable2FA(@Body() enableDTO: Enable2FADTO) {
    return this.authService.disable2FA(enableDTO.userId);
  }

  @UseGuards(AuthGuard)
  @Put('store-trello-token')
  async assignTrelloTokenToUser(@Req() req, @Body() body: { token: string }) {
    return this.authService.assignTrelloTokenToUser(req.UserId, body.token);
  }
}