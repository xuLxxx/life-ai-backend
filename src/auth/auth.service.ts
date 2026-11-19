import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Mailer } from "@nestjs/mail";
import { VerificationMail } from "../mail/verification.mail.js";
import type { SupabaseService } from "../supabase/supabase.service.js";
import type {
  ResendVerificationDto,
  SignInDto,
  SignUpDto,
} from "./auth.schemas.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly mailer: Mailer,
  ) {}

  async signUp(dto: SignUpDto) {
    const redirectTo = `${process.env.AUTH_VERIFICATION_REDIRECT ?? process.env.WEB_ORIGIN}/auth/verified`;
    const { data, error } = await this.supabase.admin.auth.admin.generateLink({
      type: "signup",
      email: dto.email,
      password: dto.password,
      options: { data: { display_name: dto.displayName }, redirectTo },
    });
    if (error) {
      if (
        error.status === 422 ||
        error.message.toLowerCase().includes("already")
      ) {
        throw new ConflictException("该邮箱已注册");
      }
      throw new BadRequestException(error.message);
    }

    const actionLink = this.buildVerificationLink(
      data.properties.hashed_token,
      redirectTo,
    );
    await this.mailer.send(VerificationMail, {
      to: { name: dto.displayName, address: dto.email },
      data: { displayName: dto.displayName, verificationUrl: actionLink },
      idempotencyKey: `signup-${data.user.id}`,
    });

    return { message: "注册成功，请检查邮箱完成验证" };
  }

  async signIn(dto: SignInDto) {
    const client = this.supabase.publicClient();
    const { data, error } = await client.auth.signInWithPassword(dto);
    if (error || !data.session || !data.user) {
      throw new UnauthorizedException("邮箱或密码错误");
    }
    if (!data.user.email_confirmed_at) {
      await client.auth.signOut();
      throw new UnauthorizedException("请先验证邮箱");
    }
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      tokenType: data.session.token_type,
      user: this.publicUser(data.user),
    };
  }

  async verify(tokenHash: string, type: "signup" | "magiclink") {
    const { data, error } = await this.supabase.publicClient().auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error || !data.user)
      throw new BadRequestException("验证链接无效或已过期");
    return { message: "邮箱验证成功", user: this.publicUser(data.user) };
  }

  async resendVerification({ email }: ResendVerificationDto) {
    const redirectTo = `${process.env.AUTH_VERIFICATION_REDIRECT ?? process.env.WEB_ORIGIN}/auth/verified`;
    const { data, error } = await this.supabase.admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (error) return { message: "如果该邮箱已注册，验证邮件已发送" };
    const name = String(
      data.user.user_metadata?.display_name ?? email.split("@")[0],
    );
    const actionLink = this.buildVerificationLink(
      data.properties.hashed_token,
      redirectTo,
      "magiclink",
    );
    await this.mailer.send(VerificationMail, {
      to: { name, address: email },
      data: { displayName: name, verificationUrl: actionLink },
    });
    return { message: "如果该邮箱已注册，验证邮件已发送" };
  }

  async refreshAccessToken(refreshToken: string) {
    if (!refreshToken)
      throw new UnauthorizedException("登录状态已过期，请重新登录");

    const { data, error } = await this.supabase
      .publicClient()
      .auth.refreshSession({
        refresh_token: refreshToken,
      });
    if (error || !data.session || !data.user) {
      throw new UnauthorizedException("登录状态已过期，请重新登录");
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      tokenType: data.session.token_type,
      user: this.publicUser(data.user),
    };
  }

  private buildVerificationLink(
    tokenHash: string,
    redirectTo: string,
    type = "signup",
  ) {
    const base = process.env.APP_URL;
    if (!base) throw new InternalServerErrorException("APP_URL 未配置");
    const url = new URL("/auth/verify", base);
    url.searchParams.set("token_hash", tokenHash);
    url.searchParams.set("type", type);
    url.searchParams.set("redirect_to", redirectTo);
    return url.toString();
  }

  private publicUser(user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name,
    };
  }
}
