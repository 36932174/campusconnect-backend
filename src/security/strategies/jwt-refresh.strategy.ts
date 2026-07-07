import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.refreshToken || req?.headers?.['x-refresh-token'] as string,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      issuer: configService.get<string>('JWT_ISSUER') || 'CampusConnect',
      algorithms: ['HS512'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string; email: string; tokenId: string }) {
    const refreshToken = req?.cookies?.refreshToken || req?.headers?.['x-refresh-token'] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return {
      id: payload.sub,
      email: payload.email,
      tokenId: payload.tokenId,
      refreshToken,
    };
  }
}
