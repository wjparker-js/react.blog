import { Router } from 'express'
import { authMiddleware } from '@/middleware/auth'
import { permissionMiddleware } from '@/middleware/permissions'
import { validateRequest } from '@/middleware/validation'
import { userService } from '@/services/user.service'
import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
  bulkUserActionSchema,
  type CreateUserData,
  type UpdateUserData,
  type UserListQuery,
  type ChangePasswordData,
  type RequestPasswordResetData,
  type ResetPasswordData,
  type VerifyEmailData,
  type UpdateProfileData,
  type BulkUserAction
} from '@/validation/user.validation'
import { asyncHandler } from '@/utils/asyncHandler'
import { ApiResponse } from '@/types/api'

const router = Router()

// Get user list (admin only)
router.get('/',
  authMiddleware,
  permissionMiddleware(['admin']),
  validateRequest({ query: userListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as UserListQuery
    const result = await userService.getUserList(query)
    
    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination,
      message: `Found ${result.users.length} users`
    } satisfies ApiResponse)
  })
)

// Get user statistics (admin only)
router.get('/stats',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const stats = await userService.getUserStats()
    
    res.json({
      success: true,
      data: stats,
      message: 'User statistics retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Create new user (admin only)
router.post('/',
  authMiddleware,
  permissionMiddleware(['admin']),
  validateRequest({ body: createUserSchema }),
  asyncHandler(async (req, res) => {
    const userData = req.body as CreateUserData
    const user = await userService.createUser(userData)
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    } satisfies ApiResponse)
  })
)

// Get current user profile
router.get('/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.user.id, { includeStats: true })
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      } satisfies ApiResponse)
    }

    res.json({
      success: true,
      data: user,
      message: 'Profile retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Update current user profile
router.put('/me',
  authMiddleware,
  validateRequest({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const profileData = req.body as UpdateProfileData
    const user = await userService.updateUser(req.user.id, profileData)
    
    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    } satisfies ApiResponse)
  })
)

// Change password
router.put('/me/password',
  authMiddleware,
  validateRequest({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as ChangePasswordData
    
    await userService.updatePassword(req.user.id, currentPassword, newPassword)
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    } satisfies ApiResponse)
  })
)

// Request password reset (public)
router.post('/password-reset/request',
  validateRequest({ body: requestPasswordResetSchema }),
  asyncHandler(async (req, res) => {
    const { email } = req.body as RequestPasswordResetData
    const message = await userService.requestPasswordReset(email)
    
    res.json({
      success: true,
      message
    } satisfies ApiResponse)
  })
)

// Reset password (public)
router.post('/password-reset/confirm',
  validateRequest({ body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    const resetData = req.body as ResetPasswordData
    await userService.resetPassword(resetData)
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    } satisfies ApiResponse)
  })
)

// Send email verification
router.post('/email-verification/send',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await userService.sendEmailVerification(req.user.id)
    
    res.json({
      success: true,
      message: 'Verification email sent'
    } satisfies ApiResponse)
  })
)

// Verify email (public)
router.post('/email-verification/verify',
  validateRequest({ body: verifyEmailSchema }),
  asyncHandler(async (req, res) => {
    const { token } = req.body as VerifyEmailData
    await userService.verifyEmail(token)
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    } satisfies ApiResponse)
  })
)

// Get specific user by ID (admin or own profile)
router.get('/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    
    // Check if user can access this profile
    if (id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only access your own profile'
      } satisfies ApiResponse)
    }
    
    const includeStats = req.query.includeStats === 'true'
    const user = await userService.getUserById(id, { includeStats })
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      } satisfies ApiResponse)
    }

    res.json({
      success: true,
      data: user,
      message: 'User retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Update user by ID (admin only)
router.put('/:id',
  authMiddleware,
  permissionMiddleware(['admin']),
  validateRequest({ body: updateUserSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const updateData = req.body as UpdateUserData
    
    const user = await userService.updateUser(id, updateData)
    
    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    } satisfies ApiResponse)
  })
)

// Delete user by ID (admin only)
router.delete('/:id',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    
    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'You cannot delete your own account'
      } satisfies ApiResponse)
    }
    
    await userService.deleteUser(id)
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    } satisfies ApiResponse)
  })
)

// Bulk user actions (admin only)
router.post('/bulk/action',
  authMiddleware,
  permissionMiddleware(['admin']),
  validateRequest({ body: bulkUserActionSchema }),
  asyncHandler(async (req, res) => {
    const bulkAction = req.body as BulkUserAction
    const { userIds, action, confirm } = bulkAction

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation Required',
        message: `Bulk ${action} requires confirmation`
      } satisfies ApiResponse)
    }

    // Prevent actions on current user
    if (userIds.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'You cannot perform bulk actions on your own account'
      } satisfies ApiResponse)
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[]
    }

    for (const userId of userIds) {
      try {
        switch (action) {
          case 'activate':
            await userService.updateUser(userId, { isActive: true })
            break
          case 'deactivate':
            await userService.updateUser(userId, { isActive: false })
            break
          case 'delete':
            await userService.deleteUser(userId)
            break
        }
        results.success.push(userId)
      } catch (error) {
        results.failed.push({
          id: userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Bulk ${action} completed. ${results.success.length} successful, ${results.failed.length} failed`
    } satisfies ApiResponse)
  })
)

// Cleanup expired tokens (admin only, manual trigger)
router.post('/cleanup/tokens',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const result = await userService.cleanupExpiredTokens()
    
    res.json({
      success: true,
      data: result,
      message: `Cleanup completed. ${result.deletedTokens} expired tokens removed`
    } satisfies ApiResponse)
  })
)

export { router as userRoutes } 