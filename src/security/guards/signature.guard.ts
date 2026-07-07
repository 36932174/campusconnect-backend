import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class SignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    const body = JSON.stringify(req.body || {});

    if (!signature || !timestamp) {
      throw new ForbiddenException('Missing signature or timestamp');
    }

    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);

    if (now - requestTime > 300000) {
      throw new ForbiddenException('Request expired');
    }

    const secret = this.configService.get<string>('HMAC_SECRET');
    const expected = crypto
      .createHmac('sha512', secret)
      .update(`${timestamp}:${req.method}:${req.path}:${body}`)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!isValid) {
      throw new ForbiddenException('Invalid signature');
    }

    return true;
  }
}
