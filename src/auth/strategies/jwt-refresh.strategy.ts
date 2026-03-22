import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt'; // 👈 import the type
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const options: StrategyOptionsWithRequest = { // 👈 explicitly typed
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const data = req?.cookies?.['refresh_token'];
          if (!data) return null;
          return data;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET!,
      passReqToCallback: true,
    };

    super(options);
  }

  validate(req: Request, payload: any) {
    const refreshToken = req?.cookies?.['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return { ...payload, refreshToken };
  }
}