import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '@mychristiancounselor/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Load user from database to ensure they still exist and are active
    const user = await this.authService.getUserById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // If this is a morphed session, attach morph metadata to the user object
    // This allows controllers to access morph info via req.user
    if (payload.isMorphed && payload.originalAdminId && payload.morphSessionId) {
      return {
        ...user,
        isMorphed: true,
        originalAdminId: payload.originalAdminId,
        morphSessionId: payload.morphSessionId,
      };
    }

    return user; // This becomes req.user
  }
}
