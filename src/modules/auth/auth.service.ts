import { SignupDto } from './dtos/signup.dto';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
        private userService : WalletService,
        private jwtService: JwtService) { }




    async signUp(signupDto: SignupDto) {
        const { name, email, password } = signupDto;

        //register the user in the blockchain 
        const wallet = await this.userService.createWallet(password)
        if (!wallet) {
            throw new BadRequestException(errors.errorCreatingWallet)
        }


        //Check the availability of the username 
        const userInUSe = await this.userModel.findOne({ email: email })
        if (userInUSe) {
            throw new BadRequestException(errors.emailInUse)
        }

        // hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // add new user 
        const user = await this.userModel.create({ 
            name: name,
            email: email,
            password: hashedPassword,
            walletAddress: wallet?.address,
            balance : wallet?.balance,

            })
        console.log(user)
    }

    async login(loginData: LoginDto) {
        // check if the user exists in the DB or not
        const { email, password } = loginData;
        const user = await this.userModel.findOne({ email: email });
        if (!user) {
            throw new UnauthorizedException(errors.wrongCredentials)
        }
        //Verify the credentials 
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new UnauthorizedException(errors.wrongCredentials)
        }
        //generate an access token 
        const tokens = await this.generateUserTokens(user._id);
        return {
            ...tokens,
            userId: user._id,
        }

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
                wallet_Address: user.walletAddress,
                prxBalance: user.prxBalance,
                usdtBalance  :user.usdtBalance
            }
        };
    }




}


