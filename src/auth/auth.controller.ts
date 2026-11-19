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
    if (type !== 'signup' && type !== 'magiclink') {
      return response.status(400).json({ message: '验证类型无效' });
    }
    await this.auth.verify(tokenHash, type);
    const target = this.safeRedirect(redirectTo);
    return response.redirect(target);
  }

  private safeRedirect(value: string) {
    const allowed = process.env.WEB_ORIGIN;
    if (!allowed || !value) return '/';
    const origin = new URL(allowed);
    const target = new URL(value);
    return target.origin === origin.origin ? target.toString() : origin.toString();
  }
}
