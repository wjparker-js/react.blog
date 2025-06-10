import { redis } from '@/config/redis'
import { createHash } from 'crypto'

interface CacheOptions {
  ttl?: number // Time to live in seconds
  tags?: string[] // Cache tags for invalidation
  compress?: boolean // Compress large values
  namespace?: string // Cache namespace
}

class AdvancedCache {
  private defaultTTL = 3600 // 1 hour
  private compressionThreshold = 1024 // 1KB

  // Generate cache key with hash for complex objects
  private generateKey(key: string, namespace?: string): string {
    const prefix = namespace ? `${namespace}:` : 'cache:'
    return `${prefix}${key}`
  }

  // Compress data if above threshold
  private shouldCompress(data: string, options: CacheOptions): boolean {
    return options.compress !== false && data.length > this.compressionThreshold
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(key, options.namespace)
      const cached = await redis.get(cacheKey)
      
      if (!cached) return null

      const data = JSON.parse(cached)
      
      // Check if data is compressed
      if (data._compressed) {
        // Decompress data (simplified - in real implementation use zlib)
        return JSON.parse(data.value)
      }

      return data
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheKey = this.generateKey(key, options.namespace)
      const ttl = options.ttl || this.defaultTTL
      
      let dataToStore = JSON.stringify(value)
      
      // Compress if needed
      if (this.shouldCompress(dataToStore, options)) {
        dataToStore = JSON.stringify({
          _compressed: true,
          value: dataToStore // In real implementation, compress with zlib
        })
      }

      await redis.setex(cacheKey, ttl, dataToStore)

      // Store cache tags for invalidation
      if (options.tags) {
        for (const tag of options.tags) {
          await redis.sadd(`tag:${tag}`, cacheKey)
          await redis.expire(`tag:${tag}`, ttl)
        }
      }
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await redis.smembers(`tag:${tag}`)
      if (keys.length > 0) {
        await redis.del(...keys)
        await redis.del(`tag:${tag}`)
      }
    } catch (error) {
      console.error('Cache invalidate error:', error)
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      } else {
        await redis.flushdb()
      }
    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }

  // Cache with automatic refresh
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options)
    
    if (cached !== null) {
      return cached
    }

    const fresh = await fetchFn()
    await this.set(key, fresh, options)
    return fresh
  }

  // Multi-level caching
  async multiGet(keys: string[], options: CacheOptions = {}): Promise<Map<string, any>> {
    const results = new Map()
    const cacheKeys = keys.map(k => this.generateKey(k, options.namespace))
    
    const cached = await redis.mget(...cacheKeys)
    
    for (let i = 0; i < keys.length; i++) {
      if (cached[i]) {
        try {
          results.set(keys[i], JSON.parse(cached[i]))
        } catch (error) {
          console.error('Multi-get parse error:', error)
        }
      }
    }
    
    return results
  }

  // Cache warming
  async warmCache(warmers: Array<{ key: string; fetcher: () => Promise<any>; options?: CacheOptions }>): Promise<void> {
    console.log('Starting cache warming...')
    
    const promises = warmers.map(async ({ key, fetcher, options = {} }) => {
      try {
        const data = await fetcher()
        await this.set(key, data, options)
        console.log(`Cache warmed: ${key}`)
      } catch (error) {
        console.error(`Cache warm failed for ${key}:`, error)
      }
    })

    await Promise.allSettled(promises)
    console.log('Cache warming completed')
  }
}

export const cache = new AdvancedCache()

// Cache decorator for methods
export function Cached(options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${createHash('md5').update(JSON.stringify(args)).digest('hex')}`
      
      return cache.getOrSet(cacheKey, () => method.apply(this, args), options)
    }
  }
} 