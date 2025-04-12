import { ArgumentsHost, Catch, ExceptionFilter, HttpException, InternalServerErrorException, Logger } from "@nestjs/common";
import { timeStamp } from "console";
import { Request, Response } from "express";


//this class will catch every http exception and throw it to the user using this business logic
@Catch(HttpException,InternalServerErrorException)
export class HttpExceptionFilter implements ExceptionFilter {

    constructor(private logger: Logger) { }

    catch(exception: HttpException, host: ArgumentsHost) {

        //get the http context 
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        //get the exeption details
        const status = exception.getStatus();
        const errorDetails = exception.getResponse();
        //log errors
        this.logger.error(
            `${request.method} ${request.originalUrl} ${status} cause : ${exception.message}`
        )


        response.status(status).json({
            error: true,
            errorDetails,
            timeStamp: new Date()
        }
        );


    }



}