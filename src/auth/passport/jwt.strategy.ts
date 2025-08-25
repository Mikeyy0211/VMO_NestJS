import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUser } from 'src/users/users.interface';
import { RolesService } from 'src/roles/roles.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private rolesService: RolesService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("JWT_ACCESS_TOKEN_SECRET"),
        });
    }

    async validate(payload: IUser) {
        try {
            // Kiểm tra payload có đầy đủ thông tin không
            if (!payload || !payload._id) {
                throw new UnauthorizedException('Invalid token payload');
            }

            const { _id, name, email, role } = payload;

            // Kiểm tra role có tồn tại và có _id không
            if (!role) {
                console.warn('Role is missing in JWT payload for user:', _id);
                return {
                    _id,
                    name,
                    email,
                    role,
                    permissions: []
                };
            }

            // Type assertion an toàn hơn
            const userRole = role as any;

            if (!userRole._id) {
                console.warn('Role _id is missing for user:', _id);
                return {
                    _id,
                    name,
                    email,
                    role,
                    permissions: []
                };
            }

            // Tìm role và xử lý trường hợp không tìm thấy
            const roleDoc = await this.rolesService.findOne(userRole._id);

            if (!roleDoc) {
                console.warn('Role not found in database:', userRole._id);
                return {
                    _id,
                    name,
                    email,
                    role,
                    permissions: []
                };
            }

            // Kiểm tra roleDoc có method toObject() không
            const roleData = roleDoc.toObject ? roleDoc.toObject() : roleDoc;

            // Trả về user data với permissions
            return {
                _id,
                name,
                email,
                role,
                permissions: roleData?.permissions ?? []
            };

        } catch (error) {
            console.error('Error in JWT validation:', error);
            throw new UnauthorizedException('Token validation failed');
        }
    }
}