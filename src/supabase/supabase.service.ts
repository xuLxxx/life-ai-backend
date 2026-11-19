import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

const options = { auth: { persistSession: false, autoRefreshToken: false } } as const;

@Injectable()
export class SupabaseService {
  readonly admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    options,
  );

  forUser(token: string) {
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { ...options, accessToken: async () => token },
    );
  }

  publicClient() {
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      options,
    );
  }
}
