import { PrismaClient } from '@prisma/client'
import { createClient } from 'redis'

declare global {
  var __prisma: PrismaClient | undefined
  var __redis: ReturnType<typeof createClient> | undefined
}

// Prisma Client Singleton
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'colorless',
  })
}

export const prisma = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Redis Client Singleton
function createRedisClient() {
  const redis = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  })

  redis.on('error', (error) => {
    console.error('Redis connection error:', error)
  })

  redis.on('connect', () => {
    console.log('Connected to Redis')
  })

  // Connect immediately
  redis.connect().catch(console.error)

  return redis
}

export const redis = globalThis.__redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__redis = redis
}

// Database connection health check
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Redis connection health check
export async function checkRedisConnection() {
  try {
    await redis.ping()
    return true
  } catch (error) {
    console.error('Redis connection failed:', error)
    return false
  }
}

// Graceful shutdown
export async function disconnectDatabase() {
  await prisma.$disconnect()
  await redis.quit()
}

process.on('beforeExit', async () => {
  await disconnectDatabase()
}) 