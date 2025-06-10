import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { UserRole } from '@prisma/client'
import { prisma } from '@/config/database'
import { config } from '@/config/env'
import { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  createSession,
  invalidateSession 
} from '@/middleware/auth'
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  UserProfile,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest 
} from '@/types/api'

export class AuthService {
  
  // User registration
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, username, password, firstName, lastName } = data
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    })
    
    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error('A user with this email already exists')
      }
      if (existingUser.username === username) {
        throw new Error('A user with this username already exists')
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds)
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role: UserRole.VIEWER, // Default role for new registrations
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        bio: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    
    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }
    
    const token = generateToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)
    
    return {
      user,
      token,
      refreshToken,
      expiresIn: 3600, // 1 hour
    }
  }
  
  // User login
  static async login(data: LoginRequest, req: any): Promise<AuthResponse> {
    const { email, password } = data
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        bio: true,
        isActive: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    
    if (!user) {
      throw new Error('Invalid email or password')
    }
    
    if (!user.isActive) {
      throw new Error('Account is inactive. Please contact support.')
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }
    
    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }
    
    const token = generateToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)
    
    // Create session record
    await createSession(user.id, token, refreshToken, req)
    
    // Remove password from response
    const { password: _, ...userProfile } = user
    
    return {
      user: userProfile,
      token,
      refreshToken,
      expiresIn: 3600, // 1 hour
    }
  }
  
  // Refresh access token
  static async refreshToken(refreshToken: string, req: any): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken)
      
      // Check if session exists and is active
      const session = await prisma.userSession.findFirst({
        where: {
          refreshToken,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      })
      
      if (!session) {
        throw new Error('Invalid or expired refresh token')
      }
      
      // Get current user data
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
          bio: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive')
      }
      
      // Generate new tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      }
      
      const newToken = generateToken(tokenPayload)
      const newRefreshToken = generateRefreshToken(tokenPayload)
      
      // Update session with new tokens
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || req.connection.remoteAddress || null,
        },
      })
      
      return {
        user,
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600,
      }
    } catch (error) {
      throw new Error('Invalid or expired refresh token')
    }
  }
  
  // User logout
  static async logout(token: string): Promise<void> {
    await invalidateSession(token)
  }
  
  // Change password
  static async changePassword(userId: string, data: ChangePasswordRequest): Promise<void> {
    const { currentPassword, newPassword } = data
    
    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    })
    
    if (!user) {
      throw new Error('User not found')
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect')
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds)
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    })
    
    // Invalidate all existing sessions for this user
    await prisma.userSession.updateMany({
      where: { userId },
      data: { isActive: false },
    })
  }
  
  // Forgot password - generate reset token
  static async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    const { email } = data
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true },
    })
    
    if (!user) {
      // Don't reveal if email exists or not
      return
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    
    // Store reset token
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetTokenHash,
        expiresAt,
      },
    })
    
    // TODO: Send email with reset token
    // For development, log the token
    if (config.env === 'development') {
      console.log(`Password reset token for ${email}: ${resetToken}`)
    }
  }
  
  // Reset password with token
  static async resetPassword(data: ResetPasswordRequest): Promise<void> {
    const { token, newPassword } = data
    
    // Hash the provided token to match stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    
    // Find valid reset token
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token: tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: true },
    })
    
    if (!resetRecord) {
      throw new Error('Invalid or expired reset token')
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds)
    
    // Update user password and mark reset token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { 
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ])
    
    // Invalidate all existing sessions for this user
    await prisma.userSession.updateMany({
      where: { userId: resetRecord.userId },
      data: { isActive: false },
    })
  }
  
  // Get user profile
  static async getProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        bio: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return user
  }
  
  // Update user profile
  static async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const allowedFields = ['firstName', 'lastName', 'bio', 'avatar']
    const updateData: any = {}
    
    // Only allow specific fields to be updated
    for (const field of allowedFields) {
      if (data[field as keyof UserProfile] !== undefined) {
        updateData[field] = data[field as keyof UserProfile]
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update')
    }
    
    updateData.updatedAt = new Date()
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        bio: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    
    return user
  }
  
  // Get active sessions for user
  static async getUserSessions(userId: string) {
    return await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }
  
  // Revoke specific session
  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: {
        id: sessionId,
        userId,
      },
      data: { isActive: false },
    })
  }
  
  // Revoke all sessions except current
  static async revokeAllSessions(userId: string, currentToken?: string): Promise<void> {
    const whereClause: any = { userId, isActive: true }
    
    if (currentToken) {
      whereClause.token = { not: currentToken }
    }
    
    await prisma.userSession.updateMany({
      where: whereClause,
      data: { isActive: false },
    })
  }
} 