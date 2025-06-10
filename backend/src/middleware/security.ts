import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import cors from 'cors'
import { config } from '@/config/env'
import { redis } from '@/config/database'
import { ApiResponse } from '@/types/api'

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      config.urls.frontend,
      config.urls.admin,
      'http://localhost:3000',
      'http://localhost:8000',
    ]

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Access-Token',
  ],
  maxAge: 86400, // 24 hours
}

// Helmet security configuration
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}

// Rate limiting configurations
export const createRateLimit = (options: Partial<rateLimit.Options> = {}) => {
  return rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.maxRequests,
    message: {
      success: false,
      error: 'Too many requests',
      message: 'Please try again later',
    } as ApiResponse,
    standardHeaders: true,
    legacyHeaders: false,
    // Use Redis for distributed rate limiting
    store: config.env === 'production' ? new RedisStore() : undefined,
    ...options,
  })
}

// Redis-based rate limit store
class RedisStore implements rateLimit.Store {
  prefix = 'rl:'

  async increment(key: string): Promise<rateLimit.IncrementResponse> {
    const redisKey = `${this.prefix}${key}`
    const current = await redis.incr(redisKey)
    
    if (current === 1) {
      await redis.expire(redisKey, Math.ceil(config.security.rateLimit.windowMs / 1000))
    }
    
    const ttl = await redis.ttl(redisKey)
    return {
      totalHits: current,
      timeToExpire: new Date(Date.now() + ttl * 1000),
    }
  }

  async decrement(key: string): Promise<void> {
    await redis.decr(`${this.prefix}${key}`)
  }

  async resetKey(key: string): Promise<void> {
    await redis.del(`${this.prefix}${key}`)
  }

  async resetAll(): Promise<void> {
    const keys = await redis.keys(`${this.prefix}*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }

  async shutdown(): Promise<void> {
    // Redis connection is managed globally
  }
}

// Specific rate limiters for different endpoints
export const generalRateLimit = createRateLimit({
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests',
    message: 'General rate limit exceeded. Please try again later.',
  } as ApiResponse,
})

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Please wait 15 minutes before trying again.',
  } as ApiResponse,
})

export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: 'Upload limit exceeded',
    message: 'Too many file uploads. Please try again later.',
  } as ApiResponse,
})

export const apiRateLimit = createRateLimit({
  max: 1000, // 1000 API requests per window
  message: {
    success: false,
    error: 'API rate limit exceeded',
    message: 'Too many API requests. Please slow down.',
  } as ApiResponse,
})

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Additional security headers not covered by helmet
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-DNS-Prefetch-Control', 'off')
  res.setHeader('X-Download-Options', 'noopen')
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  res.setHeader('X-Powered-By', 'Gatsby Blog CMS')
  
  next()
}

// Request logging middleware for security audit
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\./,
    /\/admin/,
    /\/wp-admin/,
    /\/phpmyadmin/,
    /\.php$/,
    /\/\.env/,
    /\/config/,
  ]
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(req.path))
  
  if (isSuspicious) {
    console.warn(`Suspicious request: ${req.method} ${req.path} from ${req.ip}`)
  }
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    }
    
    // Log failed authentication attempts
    if (req.path.includes('/auth/') && res.statusCode >= 400) {
      console.warn(`Failed auth attempt:`, logData)
    }
    
    // Log slow requests
    if (duration > 5000) {
      console.warn(`Slow request:`, logData)
    }
  })
  
  next()
}

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body)
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query)
  }
  
  next()
}

// Helper function to sanitize objects
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  
  const sanitized: any = {}
  for (const [key, value] of Object.entries(obj)) {
    // Remove potentially dangerous keys
    if (key.startsWith('__') || key.includes('prototype')) {
      continue
    }
    
    if (typeof value === 'string') {
      // Basic XSS protection
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    } else {
      sanitized[key] = sanitizeObject(value)
    }
  }
  
  return sanitized
}

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || ''
    
    // Allow localhost in development
    if (config.env === 'development' && 
        (clientIP.includes('127.0.0.1') || clientIP.includes('::1'))) {
      return next()
    }
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Your IP address is not allowed to access this resource',
      } as ApiResponse)
    }
    
    next()
  }
}

// File upload security middleware
export const uploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  if (!req.files && !req.file) {
    return next()
  }
  
  const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [req.file]
  
  for (const file of files.flat()) {
    if (!file) continue
    
    // Check file size
    if (file.size > config.upload.maxSize) {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: `File size exceeds ${config.upload.maxSize} bytes`,
      } as ApiResponse)
    }
    
    // Check file type
    const isImage = config.upload.allowedImageTypes.includes(file.mimetype)
    const isVideo = config.upload.allowedVideoTypes.includes(file.mimetype)
    
    if (!isImage && !isVideo) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: 'Only image and video files are allowed',
      } as ApiResponse)
    }
    
    // Check for suspicious file names
    const suspiciousNames = ['.php', '.exe', '.bat', '.cmd', '.scr']
    if (suspiciousNames.some(ext => file.originalname.toLowerCase().includes(ext))) {
      return res.status(400).json({
        success: false,
        error: 'Suspicious file',
        message: 'File name contains forbidden extensions',
      } as ApiResponse)
    }
  }
  
  next()
}

// API key validation middleware (for external integrations)
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'X-API-Key header is required',
    } as ApiResponse)
  }
  
  // In production, validate against stored API keys
  // For now, we'll use a simple check
  const validApiKey = process.env.API_KEY || 'default-api-key'
  
  if (apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'The provided API key is invalid',
    } as ApiResponse)
  }
  
  next()
} 