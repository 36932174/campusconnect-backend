import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtTwoFactorStrategy } from './strategies/jwt-two-factor.strategy';
import { SecurityService } from './security.service';
import { EncryptionService } from './encryption.service';
import { AuditService } from './audit.service';
import { RateLimitService } from './rate-limit.service';
import { SignatureGuard } from './guards/signature.guard';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { SecurityMiddleware } from './middleware/security.middleware';
import { AuditLog } from '../database/entities/audit-log.entity';
import { User } from '../database/entities/user.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRY') || '15m',
          issuer: config.get<string>('JWT_ISSUER') || 'CampusConnect',
          algorithm: 'HS512',
        },
      }),
    }),
  ],
  providers: [
    SecurityService,
    EncryptionService,
    AuditService,
    RateLimitService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtTwoFactorStrategy,
    SignatureGuard,
    AuditInterceptor,
    SecurityMiddleware,
  ],
  exports: [
    SecurityService,
    EncryptionService,
    AuditService,
    RateLimitService,
    JwtModule,
    PassportModule,
    SignatureGuard,
    AuditInterceptor,
  ],
})
export class SecurityModule {}
