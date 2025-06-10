import { z } from 'zod'
import { UserRole } from '@prisma/client'

// User creation validation
export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(UserRole).optional().default('VIEWER'),
  isActive: z.boolean().optional().default(true)
})

// User update validation
export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(1000).optional(),
  avatar: z.string().url().optional(),
  isActive: z.boolean().optional(),
  role: z.nativeEnum(UserRole).optional()
})

// User list query validation
export const userListQuerySchema = z.object({
  search: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'name', 'email', 'lastLoginAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Password change validation
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128)
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Password reset request validation
export const requestPasswordResetSchema = z.object({
  email: z.string().email()
})

// Password reset validation
export const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128)
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Email verification validation
export const verifyEmailSchema = z.object({
  token: z.string().min(1)
})

// User profile update validation
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(1000).optional(),
  avatar: z.string().url().optional()
})

// Bulk user action validation
export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['activate', 'deactivate', 'delete']),
  confirm: z.boolean().default(false)
})

export type CreateUserData = z.infer<typeof createUserSchema>
export type UpdateUserData = z.infer<typeof updateUserSchema>
export type UserListQuery = z.infer<typeof userListQuerySchema>
export type ChangePasswordData = z.infer<typeof changePasswordSchema>
export type RequestPasswordResetData = z.infer<typeof requestPasswordResetSchema>
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>
export type VerifyEmailData = z.infer<typeof verifyEmailSchema>
export type UpdateProfileData = z.infer<typeof updateProfileSchema>
export type BulkUserAction = z.infer<typeof bulkUserActionSchema> 