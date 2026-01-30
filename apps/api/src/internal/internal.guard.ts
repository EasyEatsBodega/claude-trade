import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-internal-token'];
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');

    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('Invalid internal service token');
    }

    return true;
  }
}
