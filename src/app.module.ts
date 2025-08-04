
import { Inject, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose'; // Assuming you have a MongoDB connection setup
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';


@Module({
  imports: [
    // imports: [MongooseModule.forRoot('mongodb+srv://BulkyMike:E3ooLx2M9HnPwfBd@cluster0.wlzqjty.mongodb.net/'),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URL'),
      }),
      inject: [ConfigService],
    }),

    ConfigModule.forRoot({
      isGlobal: true
    }),

    UsersModule,

    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }