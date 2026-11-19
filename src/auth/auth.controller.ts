import { Body, Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import {
  resendVerificationSchema,
  signInSchema,
  signUpSchema,
  type ResendVerificationDto,
  type SignInDto,
  type SignUpDto,
} from './auth.schemas.js';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('sign-up')
  @HttpCode(201)
  @ApiOperation({ summary: '注册并发送邮箱验证邮件' })
  signUp(@Body({ schema: signUpSchema }) dto: SignUpDto) {
    return this.auth.signUp(dto);
  }

  @Post('sign-in')
  @HttpCode(200)
  @ApiOperation({ summary: '邮箱密码登录' })
  signIn(@Body({ schema: signInSchema }) dto: SignInDto) {
    return this.auth.signIn(dto);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiOperation({ summary: '重新发送邮箱验证邮件' })
  resend(@Body({ schema: resendVerificationSchema }) dto: ResendVerificationDto) {
    return this.auth.resendVerification(dto);
  }

  @Get('verify')
  @ApiOperation({ summary: '验证邮箱并跳转前端' })
  async verify(
    @Query('token_hash') tokenHash: string,
    @Query('type') type: string,
    @Query('redirect_to') redirectTo: string,
    @Res() response: Response,
  ) {
    try {
      if (type !== 'signup' && type !== 'magiclink') {
        return response.redirect(this.frontendPage('/verify-mail-failed', '验证类型无效'));
      }
      await this.auth.verify(tokenHash, type);
      return response.redirect(this.safeRedirect(redirectTo));
    } catch {
      return response.redirect(
        this.frontendPage('/verify-mail-failed', '验证链接无效或已过期，请重新发送验证邮件'),
      );
    }
  }

  private frontendPage(path: string, message?: string) {
    const base = process.env.AUTH_VERIFICATION_REDIRECT ?? process.env.WEB_ORIGIN;
    const url = new URL(path, base ?? 'http://localhost');
    if (message) url.searchParams.set('message', message);
    return base ? url.toString() : `${url.pathname}${url.search}`;
  }

  private safeRedirect(value: string) {
    try {
      const allowed = process.env.AUTH_VERIFICATION_REDIRECT ?? process.env.WEB_ORIGIN;
      if (!allowed || !value) return this.frontendPage('/auth/verified');
      const origin = new URL(allowed);
      const target = new URL(value);
      return target.origin === origin.origin ? target.toString() : origin.toString();
    } catch {
      return this.frontendPage('/auth/verified');
    }
  }
}
