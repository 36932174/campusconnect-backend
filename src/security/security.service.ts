import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly pepper: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.pepper = this.configService.get<string>('HMAC_SECRET') || 'default-pepper';
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
      saltLength: 32,
      hashLength: 32,
    });
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  generateSalt(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateSecureToken(length: number = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  encrypt(text: string, key?: string): { iv: string; encrypted: string } {
    const encryptionKey = key || this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-32-chars-long!!';
    const keyBuffer = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { iv: iv.toString('hex'), encrypted: encrypted + ':' + authTag };
  }

  decrypt(data: { iv: string; encrypted: string }, key?: string): string {
    const encryptionKey = key || this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-32-chars-long!!';
    const keyBuffer = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = Buffer.from(data.iv, 'hex');
    const parts = data.encrypted.split(':');
    const encrypted = parts[0];
    const authTag = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  generateHMAC(data: string): string {
    return crypto.createHmac('sha512', this.pepper).update(data).digest('hex');
  }

  verifyHMAC(data: string, signature: string): boolean {
    const expected = this.generateHMAC(data);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  generateDeviceFingerprint( userAgent: string, acceptLanguage: string, ip: string ): string {
    const raw = `${userAgent}:${acceptLanguage}:${ip}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  isPasswordStrong(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < 12) errors.push('Password must be at least 12 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain a number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
      errors.push('Password must contain a special character');
    if (/(.)\1{2,}/.test(password)) errors.push('Password must not contain repeated characters');
    return { valid: errors.length === 0, errors };
  }
}
