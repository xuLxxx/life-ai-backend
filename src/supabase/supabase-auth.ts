import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';

export interface SupabaseUser {
  id: string;
  email?: string;
  role?: string;
}

@Injectable()
export class SupabaseAuth extends JwtBearerProvider<SupabaseUser> {
  constructor(registry: AuthenticationRegistry) {
    super({
      jwks: `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });
    registry.registerProvider(this);
  }

  protected validate(claims: JwtClaims): SupabaseUser | null {
    if (!claims.sub) return null;
    const { email, app_metadata } = claims as JwtClaims & {
      email?: string;
      app_metadata?: { role?: string };
    };
    return { id: claims.sub, email, role: app_metadata?.role };
  }
}
