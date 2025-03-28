import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { Logger, ValidationPipe, Get } from '@nestjs/common';
import { HttpExceptionFilter } from './exception-filters/http-exception-filter';
import googleOauthConfig from './config/google-oauth.config';


async function bootstrap() {

  console.log(googleOauthConfig)
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe(
    {
      whitelist : true,
      forbidNonWhitelisted : true
    }
  ))
  /*app.enableCors({
    origin: '*', // Allow all origins (for development only)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
  });*/


  const loggerInstance = app.get(Logger);
  // this is the exception filters (it handles only http exceptions)
  app.useGlobalFilters(new HttpExceptionFilter(loggerInstance))
  await app.listen(process.env.PORT ?? 3000);
 



}
bootstrap();
