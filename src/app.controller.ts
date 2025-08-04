import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './auth/local-auth.guard';

@Controller() //  route /
export class AppController {
  constructor(private readonly appService: AppService,
    private configService: ConfigService
  ) { }

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  handleLogin(@Request() req) {
    return req.user;
  }
}