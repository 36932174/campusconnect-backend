import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

@Injectable()
export class RateLimitService {
  private readonly store = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly configService: ConfigService) {}

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetIn: windowMs };
    }

    record.count++;

    if (record.count > limit) {
      return { allowed: false, remaining: 0, resetIn: record.resetAt - now };
    }

    return { allowed: true, remaining: limit - record.count, resetIn: record.resetAt - now };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}
