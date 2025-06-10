import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { UserRole } from '@prisma/client'
import { prisma } from '@/config/database'
import { config } from '@/config/env'
import { ApiResponse, UserProfile } from '@/types/api'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile
      token?: string
    }
  }
}

interface JwtPayload {
  userId: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

// Verify JWT token and extract user info
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      throw new AuthError('Access token is required')
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload

    // Check if user still exists and is active
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

    if (!user) {
      throw new AuthError('User not found', 404)
    }

    if (!user.isActive) {
      throw new AuthError('Account is inactive', 403)
    }

    // Attach user to request
    req.user = user
    req.token = token

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid or expired',
      } as ApiResponse)
    }

    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        message: 'Authentication failed',
      } as ApiResponse)
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred during authentication',
    } as ApiResponse)
  }
}

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authenticate(req, res, next)
  } catch (error) {
    // Continue without authentication
    next()
  }
}

// Role-based authorization middleware
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      } as ApiResponse)
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      } as ApiResponse)
    }

    next()
  }
}

// Check if user owns the resource or has admin privileges
export const authorizeOwnerOrAdmin = (getUserId: (req: Request) => string | null) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      } as ApiResponse)
    }

    const resourceUserId = getUserId(req)
    const isOwner = resourceUserId === req.user.id
    const isAdmin = req.user.role === UserRole.ADMIN

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own resources or must be an admin',
      } as ApiResponse)
    }

    next()
  }
}

// Generate JWT token
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  })
}

// Generate refresh token
export const generateRefreshToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  })
}

// Verify refresh token
export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload
}

// Middleware to check if user can manage posts
export const canManagePosts = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'You must be logged in to manage posts',
    } as ApiResponse)
  }

  const allowedRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR]
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      message: 'You do not have permission to manage posts',
    } as ApiResponse)
  }

  next()
}

// Middleware to check if user can manage all content
export const canManageContent = authorize(UserRole.ADMIN, UserRole.EDITOR)

// Middleware to check if user can manage users
export const canManageUsers = authorize(UserRole.ADMIN)

// Middleware to check if user can manage settings
export const canManageSettings = authorize(UserRole.ADMIN)

// Create session record
export const createSession = async (userId: string, token: string, refreshToken: string, req: Request) => {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  return await prisma.userSession.create({
    data: {
      userId,
      token,
      refreshToken,
      expiresAt,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null,
    },
  })
}

// Invalidate session
export const invalidateSession = async (token: string) => {
  await prisma.userSession.updateMany({
    where: { token },
    data: { isActive: false },
  })
}

// Clean up expired sessions
export const cleanupExpiredSessions = async () => {
  await prisma.userSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isActive: false },
      ],
    },
  })
} 