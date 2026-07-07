import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { THROTTLE_KEY } from '../../common/decorators/throttle.decorator';
import { RateLimitService } from '../rate-limit.service';

@Injectable()
export class DynamicThrottleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const throttleConfig = this.reflector.getAllAndOverride<{ limit: number; ttl: number }>(THROTTLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!throttleConfig) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const key = req.user?.id || req.ip;

    const result = await this.rateLimitService.check(key, throttleConfig.limit, throttleConfig.ttl);

    if (!result.allowed) {
      const res = context.switchToHttp().getResponse();
      res.header('Retry-After', Math.ceil(result.resetIn / 1000).toString());
      res.header('X-RateLimit-Limit', throttleConfig.limit.toString());
      res.header('X-RateLimit-Remaining', result.remaining.toString());
    }

    return result.allowed;
  }
}
