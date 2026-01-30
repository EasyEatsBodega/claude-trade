import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

export interface JwtPayload {
  sub: string;
  email?: string;
  aud: string;
  azp?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  constructor(configService: ConfigService) {
    const clerkDomain = configService.getOrThrow<string>('CLERK_ISSUER_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        jwksUri: `${clerkDomain}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
      }),
      issuer: clerkDomain,
      algorithms: ['RS256'],
      ignoreExpiration: false,
    });
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: 'authenticated',
    };
  }
}
