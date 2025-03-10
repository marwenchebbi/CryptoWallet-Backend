import { SignupDto } from './dtos/SignupDto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt'
import { LoginDto } from './dtos/LoginDto';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from './schemas/refresh-token.schema';


@Injectable()
export class AuthService {

    constructor(
        @InjectModel(User.name) private UserModel: Model<User>,
        @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshToken>,
        private jwtService: JwtService) { }



    async signUp(signupDto: SignupDto) {

        // i need to call the blockchain network when i create a new user !!!

        const { name, email, password } = signupDto;
        const userInUSe = await this.UserModel.findOne({ email: email })
        //Check the availability of the username 
        if (userInUSe) {
            throw new BadRequestException('Email already in use!!!')
        }
        // hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // add new user 
        const user = await this.UserModel.create({ name: name, email: email, password: hashedPassword })
        console.log(user)



    }



    async login(loginData: LoginDto) {
        // check if the user exists in the DB or not
        const { email, password } = loginData;
        const user = await this.UserModel.findOne({ email: email });
        if (!user) {
            throw new UnauthorizedException('wrong credentials !!')
        }
        //Verify the credentials 
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new UnauthorizedException('wrong credentials !!')
        }
        //generate a access token 



        const tokens = await this.generateUserTokens(user._id);
        return {
            ...tokens,
            userId : user._id,
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
        await this.refreshTokenModel.create({ token: Token, userId: UserId, expiryDate: ExpiryDate })


    }

    async refreshToken(Token){
        const token = await this.refreshTokenModel.findOneAndDelete({
            token : Token,
            expiryDate : {$gte :  new Date()}
        });
        if (!token){
            throw new UnauthorizedException('refresh token is invalid ...') // i need to redirect the user from the frontend part to the login page to generate new tokens
        }
        return this.generateUserTokens(token.userId)

    }
}
