import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { Session } from '../../database/entities/session.entity';
import { SecurityModule } from '../../security/security.module';
import { EmailModule } from '../email/email.module';

function createStrategyProvider(
  name: string,
  StrategyClass: any,
  clientIdKey: string,
  clientSecretKey: string,
  callbackUrlKey: string,
) {
  return {
    provide: StrategyClass,
    useFactory: (configService: ConfigService, authService: AuthService) => {
      const clientID = configService.get<string>(clientIdKey);
      const clientSecret = configService.get<string>(clientSecretKey);
      const callbackURL = configService.get<string>(callbackUrlKey);
      if (!clientID || !clientSecret || !callbackURL || clientID === 'placeholder') {
        Logger.warn(`${name} OAuth not configured — skipping strategy registration`);
        return undefined;
      }
      return new StrategyClass(configService, authService);
    },
    inject: [ConfigService, AuthService],
  };
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, Session]),
    PassportModule,
    SecurityModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    createStrategyProvider('Google', GoogleStrategy, 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'),
    createStrategyProvider('GitHub', GithubStrategy, 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL'),
    createStrategyProvider('Microsoft', MicrosoftStrategy, 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'MICROSOFT_CALLBACK_URL'),
  ],
  exports: [AuthService],
})
export class AuthModule {}
