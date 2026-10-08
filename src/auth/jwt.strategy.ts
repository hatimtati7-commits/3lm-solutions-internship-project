import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

// Reprend exactement la configuration du Core (Module 1) : même secret partagé,
// même format de payload. Un token émis par le Core est donc accepté tel quel ici.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', ''),
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
