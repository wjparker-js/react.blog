import { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import { logger } from '../utils/logger'

// Advanced Rate Limiting with different tiers
export const createRateLimiter = (windowMs: number, max: number, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    message: {
      error: 'Too many requests from this IP',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path
      })
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      })
    }
  })
}

// Speed limiting for suspicious behavior
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // Allow 10 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skipSuccessfulRequests: true
})

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      connectSrc: ["'self'", "https://api.github.com", "https://accounts.google.com"]
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})

// Input sanitization middleware
export const inputSanitization = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potential XSS patterns
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {}
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key])
      }
      return sanitized
    }
    return value
  }

  if (req.body) {
    req.body = sanitizeValue(req.body)
  }
  if (req.query) {
    req.query = sanitizeValue(req.query)
  }
  if (req.params) {
    req.params = sanitizeValue(req.params)
  }

  next()
}

// Security monitoring middleware
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  
  // Log security-relevant requests
  const securityEvents = [
    '/api/auth/login',
    '/api/auth/register', 
    '/api/auth/reset-password',
    '/api/admin',
    '/api/users'
  ]

  const isSensitive = securityEvents.some(event => req.path.includes(event))
  
  if (isSensitive) {
    logger.info('Security-sensitive request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    })
  }

  // Monitor response for security events
  res.on('finish', () => {
    const duration = Date.now() - startTime
    
    if (res.statusCode >= 400) {
      logger.warn('Security event: HTTP error', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        ip: req.ip,
        duration,
        userAgent: req.get('User-Agent')
      })
    }

    // Log suspicious slow requests that might indicate attacks
    if (duration > 5000) {
      logger.warn('Security event: Slow request', {
        method: req.method,
        path: req.path,
        duration,
        ip: req.ip
      })
    }
  })

  next()
}

// API-specific rate limiting
export const apiRateLimits = {
  // Strict limits for authentication endpoints
  auth: createRateLimiter(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  
  // Standard API limits
  api: createRateLimiter(15 * 60 * 1000, 100, true), // 100 requests per 15 minutes
  
  // Generous limits for static content
  public: createRateLimiter(15 * 60 * 1000, 1000, true), // 1000 requests per 15 minutes
  
  // Upload limits
  upload: createRateLimiter(60 * 60 * 1000, 50), // 50 uploads per hour
} 