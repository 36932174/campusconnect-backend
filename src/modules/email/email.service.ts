import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<number>('SMTP_PORT') === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(to: string, token: string, username: string): Promise<void> {
    const verificationUrl = `${this.configService.get('CORS_ORIGIN')}/auth/verify-email?token=${token}`;

    await this.sendEmail({
      to,
      subject: 'Verify your CampusConnect account',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to CampusConnect, ${username}!</h2>
          <p>Click the button below to verify your email address:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Verify Email
          </a>
          <p>Or copy this link: ${verificationUrl}</p>
          <p>This link expires in 24 hours.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string, username: string): Promise<void> {
    const resetUrl = `${this.configService.get('CORS_ORIGIN')}/auth/reset-password?token=${token}`;

    await this.sendEmail({
      to,
      subject: 'Reset your CampusConnect password',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${username}, click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Reset Password
          </a>
          <p>Or copy this link: ${resetUrl}</p>
          <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendTwoFactorCode(to: string, code: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Your CampusConnect verification code',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verification Code</h2>
          <p>Your two-factor authentication code is:</p>
          <div style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; padding: 16px; background: #F3F4F6; border-radius: 8px; margin: 16px 0;">
            ${code}
          </div>
          <p>This code expires in 5 minutes.</p>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(to: string, username: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Welcome to CampusConnect!',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to CampusConnect, ${username}! 🎉</h2>
          <p>Your account is all set up. Start connecting with classmates, sharing resources, and learning together.</p>
          <a href="${this.configService.get('CORS_ORIGIN')}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Get Started
          </a>
        </div>
      `,
    });
  }

  private async sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"CampusConnect" <${this.configService.get('SMTP_FROM')}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      this.logger.log(`Email sent to ${params.to}: ${params.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${params.to}: ${error.message}`);
    }
  }
}
