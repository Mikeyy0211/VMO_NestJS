import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { IUser } from 'src/users/users.interface';
import { RegisterUserDto } from 'src/users/dto/create-user.dto';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import { Response } from 'express';
import { RolesService } from 'src/roles/roles.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private rolesService: RolesService
    ) { }

    //ussername/ pass là 2 tham số thư viện passport nó ném về
    async validateUser(username: string, pass: string): Promise<any> {
        console.log('=== LOGIN DEBUG ===', username);

        const user = await this.usersService.findOneByUsername(username);
        console.log('User found:', user ? 'YES' : 'NO');

        if (!user) {
            console.log('User not found');
            return null;
        }

        const isValid = this.usersService.isValidPassword(pass, user.password);
        console.log('Password valid:', isValid);

        if (isValid === true) {
            console.log('Processing user role...');

            // Kiểm tra user.role tồn tại
            if (!user.role) {
                console.log('User role is null/undefined - assigning default role or rejecting');

                // OPTION 1: Gán default role
                // const defaultRole = await this.rolesService.findDefaultRole(); // cần tạo method này
                // return {
                //     ...user.toObject(),
                //     role: defaultRole,
                //     permissions: defaultRole?.permissions ?? []
                // };

                // OPTION 2: Trả về với role null (cần handle trong JWT)
                return {
                    ...user.toObject(),
                    role: null,
                    permissions: []
                };

                // OPTION 3: Từ chối login nếu không có role
                // throw new BadRequestException('User must have a role assigned');
            }

            const userRole = user.role as unknown as { _id: string; name: string };

            // Kiểm tra userRole._id tồn tại
            if (!userRole._id) {
                console.log('User role _id is null/undefined');
                return {
                    ...user.toObject(),
                    role: null,
                    permissions: []
                };
            }

            const temp = await this.rolesService.findOne(userRole._id);
            console.log('Role found:', temp ? 'YES' : 'NO');

            const objUser = {
                ...user.toObject(),
                permissions: temp?.permissions ?? []
            }

            return objUser;
        }

        return null;
    }

    async login(user: IUser, response: Response) {
        const { _id, name, email, role, permissions } = user;

        // Xử lý role an toàn
        const safeRole = role || null;

        const payload = {
            sub: "token login",
            iss: "from server",
            _id,
            name,
            email,
            role: safeRole  // Sử dụng safeRole
        };

        const refresh_token = this.createRefreshToken(payload);

        //update user with refresh token
        await this.usersService.updateUserToken(refresh_token, _id);

        //set refresh_token as cookies
        response.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            maxAge: ms(this.configService.get<string>("JWT_REFRESH_EXPIRE"))
        })

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                _id,
                name,
                email,
                role: safeRole,
                permissions
            },
        };
    }

    async register(user: RegisterUserDto) {
        let newUser = await this.usersService.register(user);

        return {
            _id: newUser?._id,
            createdAt: newUser?.createdAt
        };
    }

    createRefreshToken = (payload: any) => {
        const refresh_token = this.jwtService.sign(payload, {
            secret: this.configService.get<string>("JWT_REFRESH_TOKEN_SECRET"),
            expiresIn: ms(this.configService.get<string>("JWT_REFRESH_EXPIRE")) / 1000
        });
        return refresh_token;
    }

    processNewToken = async (refreshToken: string, response: Response) => {
        try {
            this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>("JWT_REFRESH_TOKEN_SECRET")
            })
            let user = await this.usersService.findUserByToken(refreshToken);
            if (user) {
                const { _id, name, email, role } = user;

                // Xử lý role an toàn
                const safeRole = role || null;

                const payload = {
                    sub: "token refresh",
                    iss: "from server",
                    _id,
                    name,
                    email,
                    role: safeRole  // Sử dụng safeRole
                };

                const refresh_token = this.createRefreshToken(payload);

                //update user with refresh token
                await this.usersService.updateUserToken(refresh_token, _id.toString());

                //fetch user's role - với xử lý an toàn
                let permissions = [];
                if (role) {
                    const userRole = role as unknown as { _id: string; name: string };
                    if (userRole && userRole._id) {
                        const temp = await this.rolesService.findOne(userRole._id);
                        permissions = temp?.permissions ?? [];
                    }
                }

                //set refresh_token as cookies
                response.clearCookie("refresh_token");

                response.cookie('refresh_token', refresh_token, {
                    httpOnly: true,
                    maxAge: ms(this.configService.get<string>("JWT_REFRESH_EXPIRE"))
                })

                return {
                    access_token: this.jwtService.sign(payload),
                    user: {
                        _id,
                        name,
                        email,
                        role: safeRole,
                        permissions
                    }
                };
            } else {
                throw new BadRequestException(`Refresh token không hợp lệ. Vui lòng login.`)
            }
        } catch (error) {
            throw new BadRequestException(`Refresh token không hợp lệ. Vui lòng login.`)
        }
    }

    logout = async (response: Response, user: IUser) => {
        await this.usersService.updateUserToken("", user._id);
        response.clearCookie("refresh_token");
        return "ok";
    }
}