import { Request } from 'express';
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { Observable } from "rxjs";
import { errors } from 'src/errors/errors.config';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private jwtservice: JwtService) { }
    canActivate(context: ExecutionContext):
        boolean | Promise<boolean> | Observable<boolean> {

        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenfromRequest(request)
        // check the token availability 
        if (!token) {
            throw new UnauthorizedException("Unauthorized ! ")
        }

        // verify the token (expiry date and ...)
        try {
            const payload = this.jwtservice.verify(token)
            //console.log(payload.UserId)
            request.UserId = payload.UserId;
            request.walletAddress = payload.walletAddress
            

        } catch (e) {
            Logger.error(e.message)
            throw new UnauthorizedException(errors.invalidToken);
        }

        return true
    }

    private extractTokenfromRequest(request: Request): string | undefined {
        const token = request.headers.authorization?.split(' ')[1];
        return token;
    }
}