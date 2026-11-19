import { BadRequestException, Injectable } from "@nestjs/common";
import type { SupabaseService } from "../supabase/supabase.service.js";
import type { SupabaseUser } from "../supabase/supabase-auth.js";
import type { AvatarUploadDto, UpdateProfileDto } from "./profile.schemas.js";

@Injectable()
export class ProfileService {
  constructor(private readonly supabase: SupabaseService) {}

  async get(user: SupabaseUser, token: string) {
    const { data, error } = await this.supabase
      .forUser(token)
      .from("profiles")
      .select("id, display_name, bio, avatar_path, created_at, updated_at")
      .eq("id", user.id)
      .single();
    if (error) throw new BadRequestException(error.message);
    return this.mapProfile(data);
  }

  async update(user: SupabaseUser, token: string, dto: UpdateProfileDto) {
    const update = {
      ...(dto.displayName !== undefined && { display_name: dto.displayName }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.avatarPath !== undefined && { avatar_path: dto.avatarPath }),
      updated_at: new Date().toISOString(),
    };
    if (dto.avatarPath) this.assertOwnAvatarPath(user.id, dto.avatarPath);

    const { data, error } = await this.supabase
      .forUser(token)
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select("id, display_name, bio, avatar_path, created_at, updated_at")
      .single();
    if (error) throw new BadRequestException(error.message);

    if (dto.displayName !== undefined) {
      const { error: authError } =
        await this.supabase.admin.auth.admin.updateUserById(user.id, {
          user_metadata: { display_name: dto.displayName },
        });
      if (authError) throw new BadRequestException(authError.message);
    }
    return this.mapProfile(data);
  }

  async createAvatarUpload(user: SupabaseUser, dto: AvatarUploadDto) {
    const path = `${user.id}/avatar-${Date.now()}.${dto.extension}`;
    const { data, error } = await this.supabase.admin.storage
      .from("avatars")
      .createSignedUploadUrl(path, { upsert: true });
    if (error) throw new BadRequestException(error.message);
    return { path, token: data.token, bucket: "avatars" };
  }

  async avatarUrl(user: SupabaseUser, path: string) {
    this.assertOwnAvatarPath(user.id, path);
    const { data, error } = await this.supabase.admin.storage
      .from("avatars")
      .createSignedUrl(path, 3600);
    if (error) throw new BadRequestException(error.message);
    return { url: data.signedUrl, expiresIn: 3600 };
  }

  private assertOwnAvatarPath(userId: string, path: string) {
    if (!path.startsWith(`${userId}/`) || path.includes("..")) {
      throw new BadRequestException("头像路径无效");
    }
  }

  private mapProfile(profile: Record<string, unknown>) {
    return {
      id: profile.id,
      displayName: profile.display_name,
      bio: profile.bio,
      avatarPath: profile.avatar_path,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }
}
