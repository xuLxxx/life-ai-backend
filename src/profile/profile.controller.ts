import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SupabaseUser } from '../supabase/supabase-auth.js';
import { ProfileService } from './profile.service.js';
import { AccessToken } from './access-token.decorator.js';
import {
  avatarUploadSchema,
  updateProfileSchema,
  type AvatarUploadDto,
  type UpdateProfileDto,
} from './profile.schemas.js';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户资料' })
  get(@CurrentUser() user: SupabaseUser, @AccessToken() token: string) {
    return this.profile.get(user, token);
  }

  @Patch('me')
  @ApiOperation({ summary: '修改用户资料' })
  update(
    @CurrentUser() user: SupabaseUser,
    @AccessToken() token: string,
    @Body({ schema: updateProfileSchema }) dto: UpdateProfileDto,
  ) {
    return this.profile.update(user, token, dto);
  }

  @Post('avatar/upload-url')
  @ApiOperation({ summary: '创建头像直传地址' })
  createAvatarUpload(
    @CurrentUser() user: SupabaseUser,
    @Body({ schema: avatarUploadSchema }) dto: AvatarUploadDto,
  ) {
    return this.profile.createAvatarUpload(user, dto);
  }

  @Get('avatar/url')
  @ApiOperation({ summary: '获取头像临时访问地址' })
  avatarUrl(@CurrentUser() user: SupabaseUser, @Query('path') path: string) {
    return this.profile.avatarUrl(user, path);
  }
}
