import cron from 'node-cron'
import { PostService } from '@/services/post.service'
import { prisma } from '@/config/database'
import { redis } from '@/config/database'
import { mediaService } from '@/services/media.service'

export class CronService {
  private static jobs: Map<string, cron.ScheduledTask> = new Map()
  
  // Initialize all cron jobs
  static init() {
    console.log('🕒 Initializing cron jobs...')
    
    // Process scheduled posts every minute
    this.scheduleJob('processScheduledPosts', '* * * * *', this.processScheduledPosts)
    
    // Clean expired sessions every hour
    this.scheduleJob('cleanExpiredSessions', '0 * * * *', this.cleanExpiredSessions)
    
    // Clean Redis cache every 6 hours
    this.scheduleJob('cleanRedisCache', '0 */6 * * *', this.cleanRedisCache)
    
    // Update post view counts from Redis every 5 minutes
    this.scheduleJob('syncViewCounts', '*/5 * * * *', this.syncViewCounts)
    
    // Generate analytics daily at midnight
    this.scheduleJob('generateDailyAnalytics', '0 0 * * *', this.generateDailyAnalytics)
    
    // Sync media view counts from Redis to database every 5 minutes
    this.scheduleJob('syncMediaViewCounts', '*/5 * * * *', this.syncMediaViewCounts)
    
    // Clean Redis cache maintenance every 6 hours
    this.scheduleJob('cleanRedisCacheMaintenance', '0 */6 * * *', this.cleanRedisCacheMaintenance)
    
    // Generate daily analytics daily at midnight
    this.scheduleJob('generateDailyAnalytics', '0 0 * * *', this.generateDailyAnalytics)
    
    // Cleanup orphaned media files weekly on Sunday at 2 AM
    this.scheduleJob('cleanupOrphanedMediaFiles', '0 2 * * 0', this.cleanupOrphanedMediaFiles)
    
    console.log(`✅ Initialized ${this.jobs.size} cron jobs`)
  }
  
  // Schedule a new job
  private static scheduleJob(name: string, pattern: string, task: () => Promise<void>) {
    try {
      const job = cron.schedule(pattern, async () => {
        try {
          console.log(`🔄 Running cron job: ${name}`)
          await task()
          console.log(`✅ Completed cron job: ${name}`)
        } catch (error) {
          console.error(`❌ Cron job failed: ${name}`, error)
        }
      }, {
        scheduled: false,
        timezone: 'UTC'
      })
      
      this.jobs.set(name, job)
      job.start()
      console.log(`📅 Scheduled job: ${name} (${pattern})`)
    } catch (error) {
      console.error(`Failed to schedule job ${name}:`, error)
    }
  }
  
  // Process scheduled posts
  private static async processScheduledPosts(): Promise<void> {
    const publishedCount = await PostService.processScheduledPosts()
    if (publishedCount > 0) {
      console.log(`📰 Auto-published ${publishedCount} scheduled posts`)
    }
  }
  
  // Clean expired user sessions
  private static async cleanExpiredSessions(): Promise<void> {
    try {
      const result = await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })
      
      if (result.count > 0) {
        console.log(`🧹 Cleaned ${result.count} expired sessions`)
      }
    } catch (error) {
      console.error('Failed to clean expired sessions:', error)
    }
  }
  
  // Clean Redis cache
  private static async cleanRedisCache(): Promise<void> {
    try {
      // Clean expired keys and optimize memory
      await redis.eval(`
        local keys = redis.call('keys', '*')
        local cleaned = 0
        for i=1,#keys do
          local ttl = redis.call('ttl', keys[i])
          if ttl == -1 and keys[i]:match('^(posts|categories|tags|users):') then
            redis.call('expire', keys[i], 3600)
            cleaned = cleaned + 1
          end
        end
        return cleaned
      `, 0)
      
      console.log('🧹 Redis cache maintenance completed')
    } catch (error) {
      console.error('Failed to clean Redis cache:', error)
    }
  }
  
  // Sync view counts from Redis to database
  private static async syncViewCounts(): Promise<void> {
    try {
      const viewKeys = await redis.keys('post_views:*')
      
      for (const key of viewKeys) {
        const postId = key.replace('post_views:', '')
        const viewCount = await redis.get(key)
        
        if (viewCount && parseInt(viewCount) > 0) {
          await prisma.post.update({
            where: { id: postId },
            data: {
              viewCount: {
                increment: parseInt(viewCount)
              }
            }
          })
          
          // Reset the counter
          await redis.del(key)
        }
      }
      
      if (viewKeys.length > 0) {
        console.log(`📊 Synced view counts for ${viewKeys.length} posts`)
      }
    } catch (error) {
      console.error('Failed to sync view counts:', error)
    }
  }
  
  // Sync media view counts from Redis to database
  private static async syncMediaViewCounts(): Promise<void> {
    try {
      console.log('📊 Syncing media view counts...')
      await mediaService.syncViewCounts()
    } catch (error) {
      console.error('❌ Failed to sync media view counts:', error)
    }
  }
  
  // Clean Redis cache maintenance
  private static async cleanRedisCacheMaintenance(): Promise<void> {
    try {
      console.log('🗑️ Performing Redis cache maintenance...')
      await this.performCacheMaintenance()
    } catch (error) {
      console.error('❌ Failed to perform cache maintenance:', error)
    }
  }
  
  // Generate daily analytics
  private static async generateDailyAnalytics(): Promise<void> {
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Generate analytics data
      const [
        postsCreated,
        postsPublished,
        totalViews,
        commentsCreated,
        newUsers
      ] = await Promise.all([
        prisma.post.count({
          where: {
            createdAt: {
              gte: yesterday,
              lt: today
            }
          }
        }),
        prisma.post.count({
          where: {
            status: 'PUBLISHED',
            publishedAt: {
              gte: yesterday,
              lt: today
            }
          }
        }),
        prisma.post.aggregate({
          where: {
            updatedAt: {
              gte: yesterday,
              lt: today
            }
          },
          _sum: {
            viewCount: true
          }
        }),
        prisma.comment.count({
          where: {
            createdAt: {
              gte: yesterday,
              lt: today
            }
          }
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: yesterday,
              lt: today
            }
          }
        })
      ])
      
      // Store analytics in settings or dedicated table
      await prisma.setting.upsert({
        where: { key: `analytics_${yesterday.toISOString().split('T')[0]}` },
        update: {
          value: JSON.stringify({
            date: yesterday.toISOString().split('T')[0],
            postsCreated,
            postsPublished,
            totalViews: totalViews._sum.viewCount || 0,
            commentsCreated,
            newUsers,
            generatedAt: new Date().toISOString()
          })
        },
        create: {
          key: `analytics_${yesterday.toISOString().split('T')[0]}`,
          value: JSON.stringify({
            date: yesterday.toISOString().split('T')[0],
            postsCreated,
            postsPublished,
            totalViews: totalViews._sum.viewCount || 0,
            commentsCreated,
            newUsers,
            generatedAt: new Date().toISOString()
          }),
          type: 'ANALYTICS'
        }
      })
      
      console.log(`📈 Generated daily analytics for ${yesterday.toISOString().split('T')[0]}`)
    } catch (error) {
      console.error('Failed to generate daily analytics:', error)
    }
  }
  
  // Cleanup orphaned media files
  private static async cleanupOrphanedMediaFiles(): Promise<void> {
    try {
      console.log('🧹 Cleaning up orphaned media files...')
      const result = await mediaService.cleanupOrphanedFiles()
      console.log(`✅ Cleanup completed: ${result.deletedFiles} files deleted, ${result.errors.length} errors`)
    } catch (error) {
      console.error('❌ Failed to cleanup orphaned media files:', error)
    }
  }
  
  // Stop all cron jobs
  static stop() {
    console.log('🛑 Stopping all cron jobs...')
    
    for (const [name, job] of this.jobs) {
      job.stop()
      console.log(`⏹️ Stopped job: ${name}`)
    }
    
    this.jobs.clear()
    console.log('✅ All cron jobs stopped')
  }
  
  // Get status of all jobs
  static getJobsStatus() {
    const status = []
    
    for (const [name, job] of this.jobs) {
      status.push({
        name,
        running: job.running,
        scheduled: true
      })
    }
    
    return status
  }
  
  // Manually run a specific job
  static async runJob(jobName: string): Promise<boolean> {
    const jobMap: { [key: string]: () => Promise<void> } = {
      processScheduledPosts: this.processScheduledPosts,
      cleanExpiredSessions: this.cleanExpiredSessions,
      cleanRedisCache: this.cleanRedisCache,
      syncViewCounts: this.syncViewCounts,
      generateDailyAnalytics: this.generateDailyAnalytics,
      syncMediaViewCounts: this.syncMediaViewCounts,
      cleanRedisCacheMaintenance: this.cleanRedisCacheMaintenance,
      cleanupOrphanedMediaFiles: this.cleanupOrphanedMediaFiles
    }
    
    const task = jobMap[jobName]
    if (!task) {
      console.error(`Job not found: ${jobName}`)
      return false
    }
    
    try {
      console.log(`🔄 Manually running job: ${jobName}`)
      await task()
      console.log(`✅ Manually completed job: ${jobName}`)
      return true
    } catch (error) {
      console.error(`❌ Manual job failed: ${jobName}`, error)
      return false
    }
  }
} 