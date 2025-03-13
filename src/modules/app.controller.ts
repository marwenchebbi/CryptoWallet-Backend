import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { request } from 'express';


@UseGuards(AuthGuard)
@Controller('')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  
  getHello(): string {
    return 'hello'
  }
}
