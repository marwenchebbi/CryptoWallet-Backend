import { ConfigModule, ConfigService } from '@nestjs/config';

import { Logger, Module} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import config from '../config/config';
import { JwtModule } from '@nestjs/jwt';
import googleOauthConfig from 'src/config/google-oauth.config';



@Module({
  imports: [
    AuthModule,
    // import the configmodule to access the .env variables and i set it global to use it whene i want without import it 
    ConfigModule.forRoot({ 
      isGlobal: true,
       cache: true,
        load: [config,googleOauthConfig]
       }),
    // import the mongoose module (DB managment) and this module use the config module 
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory : async (config)=> ({
        uri: config.get('database.connectionString')//load the connection string from the config file then the .env  
      }),
      inject : [ConfigService]//inject the service to use it in the use factory function
    }),

    // import the jwt module and use it globally 
    JwtModule.registerAsync({
      imports : [ConfigModule],
      global : true,
      useFactory  : async  (config)  => ({
        secret : config.get('jwt.secret')
      }),
      inject : [ConfigService]

    })
],
  controllers: [AppController],
  providers: [AppService,Logger],
})
export class AppModule { }
