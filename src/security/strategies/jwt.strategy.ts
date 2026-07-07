import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
      issuer: configService.get<string>('JWT_ISSUER') || 'CampusConnect',
      algorithms: ['HS512'],
    });
  }

  async validate(payload: { sub: string; email: string; role: string; twoFactorVerified?: boolean }) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['profile'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is suspended or banned');
    }

    if (user.twoFactorEnabled && !payload.twoFactorVerified) {
      throw new UnauthorizedException('Two-factor authentication required');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      profile: user.profile,
    };
  }
}
