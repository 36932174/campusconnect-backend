import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    const contentType = req.headers['content-type'];
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (contentType && !contentType.includes('multipart/form-data')) {
        if (!contentType.includes('application/json')) {
          res.status(415).json({ message: 'Unsupported Media Type' });
          return;
        }
      }
    }

    next();
  }
}
