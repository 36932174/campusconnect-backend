import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { User } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { Session } from '../../database/entities/session.entity';
import { SecurityService } from '../../security/security.service';
import { AuditService } from '../../security/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly securityService: SecurityService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });

    if (existingUser) {
      throw new ConflictException(
        existingUser.email === dto.email
          ? 'Email already registered'
          : 'Username already taken',
      );
    }

    const passwordValidation = this.securityService.isPasswordStrong(dto.password);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.errors.join('. '));
    }

    const passwordHash = await this.securityService.hashPassword(dto.password);
    const verificationToken = this.securityService.generateSecureToken(32);

    const user = this.userRepository.create({
      username: dto.username.toLowerCase(),
      email: dto.email.toLowerCase(),
      passwordHash,
      emailVerified: true,
      emailVerificationToken: verificationToken,
      status: 'active' as any,
    });

    const savedUser = await this.userRepository.save(user);

    const profile = this.profileRepository.create({
      user: savedUser as any,
      displayName: dto.displayName || dto.username,
      bio: dto.bio || '',
    });

    await this.profileRepository.save(profile);

    await this.emailService.sendVerificationEmail(dto.email, verificationToken, dto.username);

    await this.auditService.log({
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: (savedUser as any).id,
      severity: 'info',
    });

    return {
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(dto: LoginDto, deviceInfo?: { ip: string; userAgent: string; fingerprint: string }) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
      select: [
        'id', 'email', 'username', 'passwordHash', 'role', 'status',
        'emailVerified', 'twoFactorEnabled', 'twoFactorSecret',
        'loginAttempts', 'lockoutUntil',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minutes`);
    }

    const isPasswordValid = await this.securityService.verifyPassword(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.loginAttempts = 0;

        await this.auditService.log({
          action: 'ACCOUNT_LOCKED',
          entityType: 'user',
          entityId: user.id,
          severity: 'critical',
          metadata: { reason: 'Too many failed login attempts' },
        });
      }

      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid email or password');
    }

    user.loginAttempts = 0;
    user.lockoutUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = deviceInfo?.ip || '';
    await this.userRepository.save(user);

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    if (user.twoFactorEnabled) {
      return {
        requiresTwoFactor: true,
        userId: user.id,
        message: 'Two-factor authentication required',
      };
    }

    const tokens = await this.generateTokens(user, deviceInfo);

    await this.auditService.log({
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      severity: 'info',
      metadata: { ip: deviceInfo?.ip, userAgent: deviceInfo?.userAgent },
    });

    return tokens;
  }

  async verifyTwoFactor(userId: string, token: string, deviceInfo?: any) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'twoFactorSecret', 'twoFactorEnabled', 'email', 'username', 'role'],
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Two-factor authentication not configured');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid two-factor token');
    }

    return this.generateTokens(user, deviceInfo, true);
  }

  async setupTwoFactor(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'twoFactorEnabled'],
    });

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = speakeasy.generateSecret({
      name: `${this.configService.get('TOTP_ISSUER')}:${user.email}`,
      length: 20,
    });

    user.twoFactorSecret = secret.base32;
    await this.userRepository.save(user);

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    await this.auditService.log({
      action: 'TWO_FACTOR_SETUP',
      entityType: 'user',
      entityId: userId,
      severity: 'warning',
    });

    return {
      secret: secret.base32,
      qrCode,
      message: 'Scan the QR code with your authenticator app',
    };
  }

  async enableTwoFactor(userId: string, token: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'twoFactorSecret'],
    });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new BadRequestException('Invalid token. Please try again.');
    }

    user.twoFactorEnabled = true;
    await this.userRepository.save(user);

    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disableTwoFactor(userId: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    });

    const isValid = await this.securityService.verifyPassword(user.passwordHash, password);
    if (!isValid) {
      throw new BadRequestException('Invalid password');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.userRepository.save(user);

    return { message: 'Two-factor authentication disabled' };
  }

  async refreshTokens(refreshToken: string, deviceInfo?: any) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const session = await this.sessionRepository.findOne({
        where: { id: payload.tokenId, isActive: true },
        relations: ['user'],
      });

      if (!session) {
        throw new UnauthorizedException('Session not found or expired');
      }

      if (session.expiresAt < new Date()) {
        session.isActive = false;
        await this.sessionRepository.save(session);
        throw new UnauthorizedException('Session expired');
      }

      await this.sessionRepository.delete(session.id);

      const user = session.user;
      return this.generateTokens(user, deviceInfo);

    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId?: string, allDevices = false) {
    if (allDevices) {
      await this.sessionRepository.delete({ user: { id: userId } });
      return { message: 'Logged out from all devices' };
    }

    if (sessionId) {
      await this.sessionRepository.delete(sessionId);
    }

    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.status = 'active' as any;
    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = this.securityService.generateSecureToken(32);
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await this.userRepository.save(user);

    await this.emailService.sendPasswordResetEmail(email, resetToken, user.username);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
      select: ['id', 'passwordResetToken', 'passwordResetExpires', 'passwordHash'],
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordValidation = this.securityService.isPasswordStrong(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.errors.join('. '));
    }

    user.passwordHash = await this.securityService.hashPassword(newPassword);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await this.sessionRepository.delete({ user: { id: user.id } });
    await this.userRepository.save(user);

    return { message: 'Password reset successful. Please login with your new password.' };
  }

  async getSessions(userId: string) {
    return this.sessionRepository.find({
      where: { user: { id: userId } },
      select: ['id', 'deviceInfo', 'ip', 'userAgent', 'lastActivityAt', 'createdAt', 'isActive'],
      order: { createdAt: 'DESC' },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    });

    const isValid = await this.securityService.verifyPassword(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordValidation = this.securityService.isPasswordStrong(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.errors.join('. '));
    }

    user.passwordHash = await this.securityService.hashPassword(newPassword);
    await this.userRepository.save(user);

    await this.sessionRepository.delete({ user: { id: userId } });

    return { message: 'Password changed successfully. Please login again.' };
  }

  private async generateTokens(
    user: User,
    deviceInfo?: { ip: string; userAgent: string; fingerprint: string },
    twoFactorVerified = false,
  ) {
    const refreshTokenValue = this.securityService.generateSecureToken(64);

    const session = this.sessionRepository.create({
      user,
      refreshToken: refreshTokenValue,
      deviceInfo: deviceInfo?.userAgent || 'unknown',
      deviceFingerprint: deviceInfo?.fingerprint,
      ip: deviceInfo?.ip,
      userAgent: deviceInfo?.userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const savedSession = await this.sessionRepository.save(session);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      twoFactorVerified,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRY') || '15m',
    });

    const refreshPayload = {
      sub: user.id,
      email: user.email,
      tokenId: savedSession.id,
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRY') || '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  async handleOAuthLogin(
    provider: string,
    profile: any,
    deviceInfo?: any,
  ): Promise<any> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new BadRequestException('Email is required from OAuth provider');
    }

    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });

    if (!user) {
      const username = `${profile.displayName?.replace(/\s+/g, '').toLowerCase()}_${Math.random().toString(36).slice(2, 6)}`;

      user = this.userRepository.create({
        username,
        email,
        emailVerified: true,
        passwordHash: await this.securityService.hashPassword(this.securityService.generateSecureToken(32)),
        status: 'active' as any,
      });

      user = await this.userRepository.save(user);

      const userProfile = this.profileRepository.create({
        user,
        displayName: profile.displayName || username,
        avatarUrl: profile.photos?.[0]?.value,
        bio: '',
      });

      await this.profileRepository.save(userProfile);

      await this.auditService.log({
        action: 'USER_REGISTERED_OAUTH',
        entityType: 'user',
        entityId: user.id,
        severity: 'info',
        metadata: { provider },
      });
    }

    return this.generateTokens(user, deviceInfo);
  }
}
