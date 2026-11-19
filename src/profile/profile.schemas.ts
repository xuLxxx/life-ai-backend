import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  avatarPath: z.string().max(500).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, '至少需要修改一个字段');
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const avatarUploadSchema = z.object({
  extension: z.enum(['jpg', 'jpeg', 'png', 'webp']),
});
export type AvatarUploadDto = z.infer<typeof avatarUploadSchema>;
