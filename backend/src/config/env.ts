import dotenv from 'dotenv'
import path from 'path'
import Joi from 'joi'
import { z } from 'zod'

// Load environment variables from backend directory only
dotenv.config({ path: path.join(__dirname, '../../.env') })

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  
  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  
  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  
  // URLs
  API_BASE_URL: Joi.string().uri().default('http://localhost:3001/api'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:8000'),
  ADMIN_URL: Joi.string().uri().default('http://localhost:3000'),
  
  // File Upload
  UPLOAD_DIR: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  ALLOWED_IMAGE_TYPES: Joi.string().default('image/jpeg,image/png,image/gif,image/webp'),
  ALLOWED_VIDEO_TYPES: Joi.string().default('video/mp4,video/webm'),
  
  // Social Media
  TWITTER_API_KEY: Joi.string().allow('').optional(),
  TWITTER_API_SECRET: Joi.string().allow('').optional(),
  TWITTER_ACCESS_TOKEN: Joi.string().allow('').optional(),
  TWITTER_ACCESS_TOKEN_SECRET: Joi.string().allow('').optional(),
  FACEBOOK_APP_ID: Joi.string().allow('').optional(),
  FACEBOOK_APP_SECRET: Joi.string().allow('').optional(),
  LINKEDIN_CLIENT_ID: Joi.string().allow('').optional(),
  LINKEDIN_CLIENT_SECRET: Joi.string().allow('').optional(),
  
  // Email
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),
  FROM_EMAIL: Joi.string().email().default('noreply@yourdomain.com'),
  
  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // Media Processing
  IMAGE_QUALITY: Joi.number().min(1).max(100).default(80),
  THUMBNAIL_SIZE: Joi.number().default(300),
  MEDIUM_SIZE: Joi.number().default(768),
  LARGE_SIZE: Joi.number().default(1200),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: Joi.string().default('logs/app.log'),

  // Upload
  UPLOAD_MAX_SIZE: Joi.number().default(10485760), // 10MB
  UPLOAD_PATH: Joi.string().default('./uploads'),
  UPLOAD_URL_BASE: Joi.string().default('/uploads'),
}).unknown()

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env)

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
}

// Export typed environment configuration
export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  
  // Database
  database: {
    url: envVars.DATABASE_URL,
  },
  
  // Redis
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD || undefined,
  },
  
  // JWT
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  
  // URLs
  urls: {
    api: envVars.API_BASE_URL,
    frontend: envVars.FRONTEND_URL,
    admin: envVars.ADMIN_URL,
  },
  
  // File Upload
  upload: {
    dir: envVars.UPLOAD_DIR,
    maxSize: envVars.MAX_FILE_SIZE,
    allowedImageTypes: envVars.ALLOWED_IMAGE_TYPES.split(','),
    allowedVideoTypes: envVars.ALLOWED_VIDEO_TYPES.split(','),
    path: envVars.UPLOAD_PATH,
    urlBase: envVars.UPLOAD_URL_BASE,
  },
  
  // Social Media
  social: {
    twitter: {
      apiKey: envVars.TWITTER_API_KEY,
      apiSecret: envVars.TWITTER_API_SECRET,
      accessToken: envVars.TWITTER_ACCESS_TOKEN,
      accessTokenSecret: envVars.TWITTER_ACCESS_TOKEN_SECRET,
    },
    facebook: {
      appId: envVars.FACEBOOK_APP_ID,
      appSecret: envVars.FACEBOOK_APP_SECRET,
    },
    linkedin: {
      clientId: envVars.LINKEDIN_CLIENT_ID,
      clientSecret: envVars.LINKEDIN_CLIENT_SECRET,
    },
  },
  
  // Email
  email: {
    host: envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    user: envVars.SMTP_USER,
    password: envVars.SMTP_PASSWORD,
    from: envVars.FROM_EMAIL,
  },
  
  // Security
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    rateLimit: {
      windowMs: envVars.RATE_LIMIT_WINDOW_MS,
      maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
    },
  },
  
  // Media Processing
  media: {
    imageQuality: envVars.IMAGE_QUALITY,
    thumbnailSize: envVars.THUMBNAIL_SIZE,
    mediumSize: envVars.MEDIUM_SIZE,
    largeSize: envVars.LARGE_SIZE,
  },
  
  // Logging
  logging: {
    level: envVars.LOG_LEVEL,
    file: envVars.LOG_FILE,
  },

  // CORS
  cors: {
    origin: envVars.FRONTEND_URL,
  },
}

export type Config = typeof config 