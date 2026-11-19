import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(1).max(80),
});
export type SignUpDto = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(72),
});
export type SignInDto = z.infer<typeof signInSchema>;

export const resendVerificationSchema = z.object({ email: z.email().max(254) });
export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
