import { Controller, Post, UseGuards, Req, Body, Res, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public, ResponseMessage, User } from 'src/decorator/customize';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterUserDto, UserLoginDto } from 'src/users/dto/create-user.dto';
import { Request, Response } from 'express';
import { IUser } from 'src/users/users.interface';
import { RolesService } from 'src/roles/roles.service';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller("auth")
export class AuthController {
    constructor(
        private authService: AuthService,
        private rolesService: RolesService

    ) { }

    @Public()
    @UseGuards(LocalAuthGuard)
    @UseGuards(ThrottlerGuard)
    @Throttle(5, 60) // Throttle requests to prevent abuse
    @ApiBody({ type: UserLoginDto, })

    @Post('/login')
    @ResponseMessage("User Login")
    handleLogin(
        @Req() req,
        @Res({ passthrough: true }) response: Response) {
        return this.authService.login(req.user, response);
    }

    @Public()
    @ResponseMessage("Register a new user")
    @Post('/register')
    handleRegister(@Body() registerUserDto: RegisterUserDto) {
        return this.authService.register(registerUserDto);
    }

    @ResponseMessage("Get user information")
    @Get('/account')
    async handleGetAccount(@User() user: IUser) {
        // Kiểm tra user.role có tồn tại không
        if (!user.role) {
            console.warn('User role is missing in JWT payload for user:', user._id);
            return {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: null,
                    permissions: user.permissions || []
                }
            };
        }

        // Kiểm tra user.role._id có tồn tại không
        const userRole = user.role as any;
        if (!userRole._id) {
            console.warn('User role._id is missing for user:', user._id);
            return {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions || []
                }
            };
        }

        try {
            const temp = await this.rolesService.findOne(userRole._id) as any;

            if (!temp) {
                console.warn('Role not found in database:', userRole._id);
                user.permissions = [];
            } else {
                user.permissions = temp.permissions || [];
            }

            return { user };
        } catch (error) {
            console.error('Error fetching role permissions:', error);
            return {
                user: {
                    ...user,
                    permissions: user.permissions || []
                }
            };
        }
    }

    @Public()
    @ResponseMessage("Get User by refresh token")
    @Get('/refresh')
    handleRefreshToken(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
        const refreshToken = request.cookies["refresh_token"];
        return this.authService.processNewToken(refreshToken, response);
    }

    @ResponseMessage("Logout User")
    @Post('/logout')
    handleLogout(
        @Res({ passthrough: true }) response: Response,
        @User() user: IUser
    ) {
        return this.authService.logout(response, user);
    }
}