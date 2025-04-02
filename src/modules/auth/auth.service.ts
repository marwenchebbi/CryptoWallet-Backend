import { SignupDto } from './dtos/signup.dto';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt'
import { LoginDto } from './dtos/login.dto';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from './schemas/refresh-token.schema';
import { errors } from 'src/errors/errors.config';
import { WalletService } from '../user/wallet.service';


@Injectable()
export class AuthService {

    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshToken>,
        private walletService : WalletService,
        private jwtService: JwtService) { }



        async signUp(signupDto: SignupDto): Promise<Object> {
            const { name, email, password } = signupDto;
    
            // Create wallet before user registration
            const wallet = await this.walletService.createWallet(password)
    
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
            console.log(user)
            return(user)
        }

        async login(loginData: LoginDto): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
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
            const tokens = await this.generateUserTokens(user._id.toString());
    
            return {
                ...tokens,
                userId: user._id.toString(),
            };
        }

    //generate access token and refresh token 
    async generateUserTokens(UserId) {
        const accessToken = await this.jwtService.sign({ UserId }, { expiresIn: '1h' });
        const refreshToken = await uuidv4();
        await this.storeTokens(refreshToken, UserId);

        return {
            accessToken,
            refreshToken
        };
    }


    // store the refresh token in the DB
    async storeTokens(Token: string, UserId: any) {
        // the refresh token is valid for three days
        const ExpiryDate = new Date();
        ExpiryDate.setDate(ExpiryDate.getDate() + 3);
        await this.refreshTokenModel.updateOne(
            { userId: UserId },
            { $set: { token: Token, expiryDate: ExpiryDate } },
            { upsert: true }
        )


    }

    async refreshToken(Token) {
        const token = await this.refreshTokenModel.findOne({
            token: Token,
            expiryDate: { $gte: new Date() }
        });
        if (!token) {
            throw new UnauthorizedException(errors.sessionExpired);// i need to redirect the user from the frontend part to the login page to generate new tokens
        }
        return this.generateUserTokens(token.userId);

    }

    
    // this we will use it to fetch the informations of the current user  
    async me(request) {
        const user = await this.userModel.findOne({ _id: request.UserId });
        if (!user) throw new NotFoundException('User not found!');
        return {
            userDetails: {
                username: user.name,
                email: user.email,
                walletAddress: user.walletAddress,
                prxBalance: user.prxBalance,
                usdtBalance  :user.usdtBalance
            }
        };
    }




}


