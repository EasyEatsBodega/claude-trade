import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice(7);
    const secret = this.config.getOrThrow<string>('ADMIN_JWT_SECRET');

    try {
      const payload = jwt.verify(token, secret) as { role: string };
      if (payload.role !== 'admin') throw new UnauthorizedException();
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
