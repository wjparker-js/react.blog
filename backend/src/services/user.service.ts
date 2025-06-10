import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/utils/prisma'
import { redis } from '@/utils/redis'
import { config } from '@/config/env'
import type { User, UserRole, Prisma } from '@prisma/client'
import { sendEmail } from '@/utils/email'

export interface UserCreateOptions {
  name: string
  email: string
  password: string
  role?: UserRole
  isActive?: boolean
}

export interface UserUpdateOptions {
  name?: string
  email?: string
  bio?: string
  avatar?: string
  isActive?: boolean
  role?: UserRole
}

export interface UserSearchOptions {
  search?: string
  role?: UserRole
  isActive?: boolean
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'name' | 'email' | 'lastLoginAt'
  sortOrder?: 'asc' | 'desc'
}

export interface PasswordResetOptions {
  email: string
  token: string
  newPassword: string
}

export interface UserProfileResponse extends Omit<User, 'password'> {
  _count?: {
    posts: number
    comments: number
    media: number
  }
}

class UserService {
  async createUser(options: UserCreateOptions): Promise<UserProfileResponse> {
    const { name, email, password, role = 'VIEWER', isActive = true } = options

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isActive
      }
    })

    // Clear user cache
    await this.clearUserCache()

    // Return user without password
    const { password: _, ...userProfile } = user
    return userProfile
  }

  async getUserById(
    id: string, 
    options: { includeStats?: boolean; trackActivity?: boolean } = {}
  ): Promise<UserProfileResponse | null> {
    const { includeStats = false, trackActivity = false } = options

    const cacheKey = `user:${id}${includeStats ? ':with-stats' : ''}`
    
    // Try cache first
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const user = JSON.parse(cached)
        if (trackActivity) {
          await this.trackUserActivity(id, 'profile_view')
        }
        return user
      }
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: includeStats ? {
        _count: {
          select: {
            posts: true,
            comments: true,
            media: true
          }
        }
      } : undefined
    })

    if (!user) return null

    // Remove password from response
    const { password: _, ...userProfile } = user

    // Cache result
    if (redis) {
      await redis.setex(cacheKey, 3600, JSON.stringify(userProfile)) // 1 hour
    }

    if (trackActivity) {
      await this.trackUserActivity(id, 'profile_view')
    }

    return userProfile
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const cacheKey = `user:email:${email}`
    
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (user && redis) {
      await redis.setex(cacheKey, 1800, JSON.stringify(user)) // 30 minutes
    }

    return user
  }

  async getUserList(options: UserSearchOptions = {}): Promise<{
    users: UserProfileResponse[]
    pagination: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }> {
    const {
      search,
      role,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options

    const cacheKey = `users:list:${JSON.stringify(options)}`
    
    // Try cache for non-search results
    if (redis && !search) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    const where: Prisma.UserWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      where.role = role
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          avatar: true,
          bio: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          emailVerifiedAt: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              media: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    const result = {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }

    // Cache non-search results
    if (redis && !search) {
      await redis.setex(cacheKey, 1800, JSON.stringify(result)) // 30 minutes
    }

    return result
  }

  async updateUser(id: string, data: UserUpdateOptions): Promise<UserProfileResponse> {
    // Validate email uniqueness if changing email
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id }
        }
      })

      if (existingUser) {
        throw new Error('Email is already in use by another user')
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    // Clear caches
    await this.clearUserCache(id)

    // Return without password
    const { password: _, ...userProfile } = user
    return userProfile
  }

  async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      throw new Error('Current password is incorrect')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    })

    // Track activity
    await this.trackUserActivity(id, 'password_change')
  }

  async requestPasswordReset(email: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Don't reveal if email exists for security
      return 'If the email exists, a reset link has been sent'
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Store reset token (expires in 1 hour)
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    })

    // Send email (implement based on your email service)
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        template: 'password-reset',
        data: {
          name: user.name,
          resetUrl: `${config.cors.origin}/reset-password?token=${resetToken}`,
          expiryTime: '1 hour'
        }
      })
    } catch (error) {
      console.error('Failed to send password reset email:', error)
      // Don't throw error to avoid revealing email existence
    }

    return 'If the email exists, a reset link has been sent'
  }

  async resetPassword(options: PasswordResetOptions): Promise<void> {
    const { email, token, newPassword } = options

    // Hash the provided token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Find valid reset token
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        expiresAt: { gt: new Date() },
        usedAt: null
      },
      include: {
        user: true
      }
    })

    if (!resetRecord || resetRecord.user.email !== email) {
      throw new Error('Invalid or expired reset token')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password and mark token as used
    await Promise.all([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() }
      })
    ])

    // Clear user caches
    await this.clearUserCache(resetRecord.userId)

    // Track activity
    await this.trackUserActivity(resetRecord.userId, 'password_reset')
  }

  async sendEmailVerification(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (user.emailVerifiedAt) {
      throw new Error('Email is already verified')
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Store verification token in Redis (expires in 24 hours)
    if (redis) {
      await redis.setex(
        `email_verification:${verificationToken}`,
        24 * 60 * 60, // 24 hours
        userId
      )
    }

    // Send verification email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email Address',
        template: 'email-verification',
        data: {
          name: user.name,
          verificationUrl: `${config.cors.origin}/verify-email?token=${verificationToken}`
        }
      })
    } catch (error) {
      console.error('Failed to send verification email:', error)
      throw new Error('Failed to send verification email')
    }
  }

  async verifyEmail(token: string): Promise<void> {
    if (!redis) {
      throw new Error('Email verification not available')
    }

    const userId = await redis.get(`email_verification:${token}`)
    if (!userId) {
      throw new Error('Invalid or expired verification token')
    }

    // Update user's email verification status
    await prisma.user.update({
      where: { id: userId },
      data: { 
        emailVerifiedAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Remove verification token
    await redis.del(`email_verification:${token}`)

    // Clear user cache
    await this.clearUserCache(userId)

    // Track activity
    await this.trackUserActivity(userId, 'email_verified')
  }

  async deleteUser(id: string): Promise<void> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Delete user (this will cascade to related records based on schema)
    await prisma.user.delete({
      where: { id }
    })

    // Clear caches
    await this.clearUserCache(id)
  }

  async updateLastLogin(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() }
    })

    // Track activity
    await this.trackUserActivity(id, 'login')
  }

  async trackUserActivity(userId: string, action: string, metadata?: any): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action,
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      })
    } catch (error) {
      console.error('Failed to track user activity:', error)
      // Don't throw error as this is not critical
    }
  }

  async getUserStats(): Promise<{
    totalUsers: number
    activeUsers: number
    newUsersToday: number
    newUsersThisMonth: number
    usersByRole: Record<string, number>
    verifiedUsers: number
  }> {
    const cacheKey = 'users:stats'
    
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisMonth,
      usersByRole,
      verifiedUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
      }),
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } })
    ])

    const roleStats: Record<string, number> = {}
    usersByRole.forEach(stat => {
      roleStats[stat.role] = stat._count.id
    })

    const stats = {
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisMonth,
      usersByRole: roleStats,
      verifiedUsers
    }

    if (redis) {
      await redis.setex(cacheKey, 1800, JSON.stringify(stats)) // 30 minutes
    }

    return stats
  }

  private async clearUserCache(userId?: string): Promise<void> {
    if (!redis) return

    if (userId) {
      const patterns = [
        `user:${userId}*`,
        `user:email:*`,
        'users:list:*',
        'users:stats'
      ]
      
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }
    } else {
      const keys = await redis.keys('user*')
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }
  }

  async cleanupExpiredTokens(): Promise<{ deletedTokens: number }> {
    const result = await prisma.passwordReset.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } }
        ]
      }
    })

    return { deletedTokens: result.count }
  }
}

export const userService = new UserService() 