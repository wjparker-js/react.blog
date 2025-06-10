import { Request, Response, NextFunction } from 'express'
import { verify } from 'jsonwebtoken'
import { redis } from '@/config/redis'
import { prisma } from '@/prisma/client'

interface SecurityConfig {
  maxConcurrentSessions: number
  sessionTimeout: number
  requireStrongPasswords: boolean
  enable2FA: boolean
  ipWhitelist?: string[]
}

const securityConfig: SecurityConfig = {
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600'), // 1 hour
  requireStrongPasswords: process.env.REQUIRE_STRONG_PASSWORDS === 'true',
  enable2FA: process.env.ENABLE_2FA === 'true',
  ipWhitelist: process.env.IP_WHITELIST?.split(',').map(ip => ip.trim())
}

// Enhanced authentication middleware
export const enhancedAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' })
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`)
    if (isBlacklisted) {
      return res.status(401).json({ success: false, error: 'Token has been revoked' })
    }

    // Verify JWT
    const decoded = verify(token, process.env.JWT_SECRET!) as any
    
    // Check session in database
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' })
    }

    // Check if user is still active
    if (!session.user.isActive) {
      return res.status(401).json({ success: false, error: 'Account has been deactivated' })
    }

    // IP whitelist check (if configured)
    if (securityConfig.ipWhitelist && !securityConfig.ipWhitelist.includes(req.ip)) {
      console.warn('IP not whitelisted:', { ip: req.ip, userId: session.user.id })
      return res.status(403).json({ success: false, error: 'Access denied from your IP' })
    }

    // Check for session hijacking (IP change detection)
    if (session.ipAddress && session.ipAddress !== req.ip) {
      console.warn('Potential session hijacking detected:', {
        userId: session.user.id,
        originalIP: session.ipAddress,
        currentIP: req.ip,
        userAgent: req.get('User-Agent')
      })

      // Optionally invalidate session on IP change
      if (process.env.STRICT_IP_VALIDATION === 'true') {
        await prisma.userSession.update({
          where: { id: session.id },
          data: { isActive: false }
        })
        return res.status(401).json({ success: false, error: 'Session invalidated due to security policy' })
      }
    }

    // Update last activity
    await prisma.userSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() }
    })

    // Attach user to request
    (req as any).user = session.user
    (req as any).session = session

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

// Concurrent session limiter
export const sessionLimiter = async (userId: string, newSessionId: string) => {
  const activeSessions = await prisma.userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (activeSessions.length >= securityConfig.maxConcurrentSessions) {
    // Deactivate oldest sessions
    const sessionsToDeactivate = activeSessions.slice(securityConfig.maxConcurrentSessions - 1)
    
    await prisma.userSession.updateMany({
      where: {
        id: { in: sessionsToDeactivate.map(s => s.id) }
      },
      data: { isActive: false }
    })

    console.info('Deactivated old sessions for user:', {
      userId,
      deactivatedCount: sessionsToDeactivate.length
    })
  }
}

// Password strength validator
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!securityConfig.requireStrongPasswords) {
    return { isValid: true, errors: [] }
  }

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Check against common passwords
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'letmein', 
    'welcome', 'monkey', '1234567890', 'password123'
  ]
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password contains common patterns and is not secure')
  }

  return { isValid: errors.length === 0, errors }
} 