import { Controller, Get, Post, Put, Delete, Render } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

@Controller() //  route /
export class AppController {
  constructor(private readonly appService: AppService,
    private configService: ConfigService
  ) { }

  @Get() /// route " "  /=> api (restful)
  @Render("home")
  handleHomePage() {
    //port form .env
    console.log(">> check port: ", this.configService.get<string>('PORT'));
    const message1 = this.appService.getHello();

    return {
      message: message1
    }
  }


  @Get("abc") /// route " "  /
  getHello1(): string {
    return "this.appService.getHello() abc";
  }
}