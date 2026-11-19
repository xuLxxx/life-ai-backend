import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthenticationModule } from '@nestjs/authentication';
import { FileMailTransport, FileTemplateEngine, MailModule, MailTransport, SmtpTransport } from '@nestjs/mail';
import { join } from 'node:path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { createObserveModule } from '@nestjs/observe';
import { SupabaseAuth } from './supabase/supabase-auth.js';
import { SupabaseService } from './supabase/supabase.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { ProfileController } from './profile/profile.controller.js';
import { ProfileService } from './profile/profile.service.js';
import { VerificationMail } from './mail/verification.mail.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule({
  skipInstrumentation: (instance) => instance instanceof MailTransport,
});

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthenticationModule.forRoot({}),
    MailModule.forRootAsync({
      useFactory: () => ({
        transport: process.env.SMTP_URL
          ? new SmtpTransport({ url: process.env.SMTP_URL })
          : process.env.NODE_ENV === 'production'
            ? (() => { throw new Error('SMTP_URL is required in production'); })()
            : new FileMailTransport({ directory: 'var/mail' }),
        templates: new FileTemplateEngine({
          dir: join(import.meta.dirname, 'mail/templates'),
          layout: 'layout',
          cache: process.env.NODE_ENV === 'production',
        }),
        from: process.env.MAIL_FROM ?? 'Life AI <no-reply@life-ai.local>',
      }),
    }),
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY,
      appSecret: process.env.OBSERVE_APP_SECRET,
      serviceId: 'liveai-dev',
    }),
  ],
  controllers: [AppController, AuthController, ProfileController],
  providers: [AppService, SupabaseAuth, SupabaseService, AuthService, ProfileService, VerificationMail],
})
export class AppModule {}
