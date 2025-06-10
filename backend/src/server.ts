import 'express-async-errors'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import compression from 'compression'
import { config } from '@/config/env'
import { checkDatabaseConnection, checkRedisConnection } from '@/config/database'
import { 
  corsOptions, 
  helmetOptions,
  generalRateLimit,
  securityHeaders,
  securityLogger,
  sanitizeInput
} from '@/middleware/security'
import { cleanupExpiredSessions } from '@/middleware/auth'
import { CronService } from '@/services/cron.service'
import { ApiResponse } from '@/types/api'
import path from 'path'

// Import routes
import { authRoutes } from '@/routes/auth.routes'
import { postRoutes } from '@/routes/post.routes'
import { categoryRoutes } from '@/routes/category.routes'
import { tagRoutes } from '@/routes/tag.routes'
import { mediaRoutes } from '@/routes/media.routes'
import { userRoutes } from '@/routes/user.routes'
import { commentRoutes } from '@/routes/comment.routes'
import { dashboardRoutes } from '@/routes/dashboard.routes'
import { searchRoutes } from '@/routes/search.routes'
import socialRoutes from '@/routes/social.routes'
import settingsRoutes from '@/routes/settings.routes'

// Create Express app
const app = express()

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1)

// Global middleware
app.use(helmet(helmetOptions))
app.use(cors(corsOptions))
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging middleware
if (config.env !== 'test') {
  app.use(morgan('combined'))
}

// Security middleware
app.use(securityHeaders)
app.use(securityLogger)
app.use(sanitizeInput)
app.use(generalRateLimit)

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await checkDatabaseConnection()
  const redisConnected = await checkRedisConnection()
  
  const status = dbConnected && redisConnected ? 'healthy' : 'unhealthy'
  const statusCode = status === 'healthy' ? 200 : 503
  
  res.status(statusCode).json({
    success: status === 'healthy',
    data: {
      status,
      timestamp: new Date().toISOString(),
      environment: config.env,
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        redis: redisConnected ? 'connected' : 'disconnected',
      },
    },
    message: `Server is ${status}`,
  } as ApiResponse)
})

// API version info
app.get('/api', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Gatsby Blog CMS API',
      version: '1.0.0',
      environment: config.env,
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        posts: '/api/posts',
        categories: '/api/categories',
        tags: '/api/tags',
        media: '/api/media',
        comments: '/api/comments',
        dashboard: '/api/dashboard',
        search: '/api/search',
        social: '/api/social',
        settings: '/api/settings',
      },
    },
    message: 'Gatsby Blog CMS API is running',
  } as ApiResponse)
})

// Mount API routes
app.use('/api/auth', authRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/tags', tagRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/users', userRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/settings', settingsRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  } as ApiResponse)
})

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error)
  
  // Prisma errors
  if (error.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: `A record with this ${prismaError.meta?.target?.join(', ')} already exists`,
      } as ApiResponse)
    }
    
    // Record not found
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested record was not found',
      } as ApiResponse)
    }
  }
  
  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: error.message,
    } as ApiResponse)
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid or expired token',
    } as ApiResponse)
  }
  
  // Multer errors (file upload)
  if (error.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: 'File Upload Error',
      message: error.message,
    } as ApiResponse)
  }
  
  // Default error response
  const statusCode = (error as any).statusCode || 500
  const message = config.env === 'production' 
    ? 'An internal server error occurred' 
    : error.message
  
  res.status(statusCode).json({
    success: false,
    error: 'Internal Server Error',
    message,
    ...(config.env !== 'production' && { stack: error.stack }),
  } as ApiResponse)
})

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`)
  
  try {
    // Stop cron jobs
    CronService.stop()
    
    // Close database connections
    const { disconnectDatabase } = await import('@/config/database')
    await disconnectDatabase()
    
    console.log('Database connections closed')
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start server
const startServer = async () => {
  try {
    // Check database connection
    const dbConnected = await checkDatabaseConnection()
    if (!dbConnected) {
      throw new Error('Failed to connect to database')
    }
    console.log('✅ Database connected')
    
    // Check Redis connection
    const redisConnected = await checkRedisConnection()
    if (!redisConnected) {
      console.warn('⚠️ Redis connection failed - some features may be limited')
    } else {
      console.log('✅ Redis connected')
    }
    
    // Initialize cron jobs
    CronService.init()
    
    // Cleanup expired sessions on startup
    try {
      await cleanupExpiredSessions()
      console.log('✅ Expired sessions cleaned up')
    } catch (error) {
      console.warn('⚠️ Failed to cleanup expired sessions:', error)
    }
    
    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`)
      console.log(`📖 API documentation: http://localhost:${config.port}/api`)
      console.log(`🏥 Health check: http://localhost:${config.port}/health`)
      console.log(`🌍 Environment: ${config.env}`)
    })
    
    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${config.port} is already in use`)
      } else {
        console.error('❌ Server error:', error)
      }
      process.exit(1)
    })
    
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer()
}

export default app 