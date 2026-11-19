import { Public } from "@nestjs/authentication";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import {
  type ResendVerificationDto,
  resendVerificationSchema,
  type SignInDto,
  type SignUpDto,
  signInSchema,
  signUpSchema,
} from "./auth.schemas.js";
import type { AuthService } from "./auth.service.js";

@ApiTags("auth")
@Public()
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("sign-up")
  @HttpCode(201)
  @ApiOperation({ summary: "注册并发送邮箱验证邮件" })
  signUp(@Body({ schema: signUpSchema }) dto: SignUpDto) {
    return this.auth.signUp(dto);
  }

  @Post("sign-in")
  @HttpCode(200)
  @ApiOperation({ summary: "邮箱密码登录" })
  async signIn(
    @Body({ schema: signInSchema }) dto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...result } = await this.auth.signIn(dto);
    this.setRefreshTokenCookie(response, refreshToken);
    return result;
  }

  @Post("refresh-token")
  @HttpCode(200)
  @ApiOperation({ summary: "使用 Cookie 中的 refresh token 刷新 access token" })
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.readRefreshTokenCookie(request);
    if (!refreshToken) {
      this.clearRefreshTokenCookie(response);
      return this.auth.refreshAccessToken("");
    }

    try {
      const { refreshToken: nextRefreshToken, ...result } =
        await this.auth.refreshAccessToken(refreshToken);
      this.setRefreshTokenCookie(response, nextRefreshToken);
      return result;
    } catch (error) {
      this.clearRefreshTokenCookie(response);
      throw error;
    }
  }

  @Post("resend-verification")
  @HttpCode(200)
  @ApiOperation({ summary: "重新发送邮箱验证邮件" })
  resend(
    @Body({ schema: resendVerificationSchema }) dto: ResendVerificationDto,
  ) {
    return this.auth.resendVerification(dto);
  }

  @Get("verify")
  @ApiOperation({ summary: "验证邮箱并跳转前端" })
  async verify(
    @Query("token_hash") tokenHash: string,
    @Query("type") type: string,
    @Query("redirect_to") redirectTo: string,
    @Res() response: Response,
  ) {
    try {
      if (type !== "signup" && type !== "magiclink") {
        return response.redirect(
          this.frontendPage("/auth/verify-mail-failed", "验证类型无效"),
        );
      }
      await this.auth.verify(tokenHash, type);
      return response.redirect(this.safeRedirect(redirectTo));
    } catch {
      return response.redirect(
        this.frontendPage(
          "/auth/verify-mail-failed",
          "验证链接无效或已过期，请重新发送验证邮件",
        ),
      );
    }
  }

  private frontendPage(path: string, message?: string) {
    const base =
      process.env.AUTH_VERIFICATION_REDIRECT ?? process.env.WEB_ORIGIN;
    const url = new URL(path, base ?? "http://localhost");
    if (message) url.searchParams.set("message", message);
    return base ? url.toString() : `${url.pathname}${url.search}`;
  }

  private safeRedirect(value: string) {
    try {
      const allowed =
        process.env.AUTH_VERIFICATION_REDIRECT ?? process.env.WEB_ORIGIN;
      if (!allowed || !value) return this.frontendPage("/auth/verified");
      const origin = new URL(allowed);
      const target = new URL(value);
      return target.origin === origin.origin
        ? target.toString()
        : origin.toString();
    } catch {
      return this.frontendPage("/auth/verified");
    }
  }

  private readonly refreshTokenCookie =
    process.env.AUTH_REFRESH_TOKEN_COOKIE ?? "refresh_token";

  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie(this.refreshTokenCookie, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth/refresh-token",
    });
  }

  private clearRefreshTokenCookie(response: Response) {
    response.clearCookie(this.refreshTokenCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth/refresh-token",
    });
  }

  private readRefreshTokenCookie(request: Request) {
    const header = request.headers.cookie;
    if (!header) return undefined;

    for (const part of header.split(";")) {
      const separator = part.indexOf("=");
      if (separator < 0) continue;
      const name = part.slice(0, separator).trim();
      if (name !== this.refreshTokenCookie) continue;
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
