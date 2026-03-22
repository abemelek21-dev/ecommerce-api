import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { Request } from 'express';

@Injectable()

export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor() {
        const options: StrategyOptionsWithoutRequest = {
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    let data = req?.cookies?.['auth_token'];
                    if (!data) {
                        return null
                    }
                    return data
                }
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_ACCESS_SECRET!
        }
        super(options)
    }

    async validate(payloas: any) {
        return {
            userId: payloas.sub,
            email: payloas.email,
            role: payloas.role
        }
    }
}