import { PrismaClient } from '@prisma/client'
import { redisClient } from '@/config/redis'
import { logger } from '@/utils/logger'

const prisma = new PrismaClient()

interface DashboardStats {
  overview: {
    totalUsers: number
    totalPosts: number
    totalComments: number
    totalViews: number
    totalMedia: number
    totalCategories: number
    totalTags: number
    publishedPosts: number
    draftPosts: number
    scheduledPosts: number
    activeUsers: number
    pendingComments: number
    spamComments: number
  }
  growth: {
    usersGrowth: number
    postsGrowth: number
    commentsGrowth: number
    viewsGrowth: number
  }
  recent: {
    recentPosts: any[]
    recentComments: any[]
    recentUsers: any[]
    recentActivity: any[]
  }
}

interface AnalyticsData {
  timeframe: 'day' | 'week' | 'month' | 'year'
  metrics: {
    views: { date: string; count: number }[]
    posts: { date: string; count: number }[]
    comments: { date: string; count: number }[]
    users: { date: string; count: number }[]
  }
  topContent: {
    posts: any[]
    categories: any[]
    tags: any[]
    authors: any[]
  }
}

export class DashboardService {
  private readonly CACHE_TTL = 300 // 5 minutes

  async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'dashboard:stats'
    
    try {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      logger.warn('Failed to get dashboard stats from cache:', error)
    }

    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Get current stats
      const [
        totalUsers,
        totalPosts,
        totalComments,
        totalMedia,
        totalCategories,
        totalTags,
        publishedPosts,
        draftPosts,
        scheduledPosts,
        activeUsers,
        pendingComments,
        spamComments,
        totalViews
      ] = await Promise.all([
        prisma.user.count(),
        prisma.post.count(),
        prisma.comment.count(),
        prisma.media.count(),
        prisma.category.count(),
        prisma.tag.count(),
        prisma.post.count({ where: { status: 'PUBLISHED' } }),
        prisma.post.count({ where: { status: 'DRAFT' } }),
        prisma.post.count({ where: { status: 'SCHEDULED' } }),
        prisma.user.count({ 
          where: { 
            lastLoginAt: { 
              gte: thirtyDaysAgo 
            } 
          } 
        }),
        prisma.comment.count({ where: { status: 'PENDING' } }),
        prisma.comment.count({ where: { status: 'SPAM' } }),
        this.getTotalViews()
      ])

      // Get growth stats (compare with 30 days ago)
      const [
        previousUsers,
        previousPosts,
        previousComments,
        previousViews
      ] = await Promise.all([
        prisma.user.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
        prisma.post.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
        prisma.comment.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
        this.getTotalViews(thirtyDaysAgo)
      ])

      const growth = {
        usersGrowth: this.calculateGrowthPercentage(totalUsers, previousUsers),
        postsGrowth: this.calculateGrowthPercentage(totalPosts, previousPosts),
        commentsGrowth: this.calculateGrowthPercentage(totalComments, previousComments),
        viewsGrowth: this.calculateGrowthPercentage(totalViews, previousViews)
      }

      // Get recent activity
      const [recentPosts, recentComments, recentUsers, recentActivity] = await Promise.all([
        this.getRecentPosts(),
        this.getRecentComments(),
        this.getRecentUsers(),
        this.getRecentActivity()
      ])

      const stats: DashboardStats = {
        overview: {
          totalUsers,
          totalPosts,
          totalComments,
          totalViews,
          totalMedia,
          totalCategories,
          totalTags,
          publishedPosts,
          draftPosts,
          scheduledPosts,
          activeUsers,
          pendingComments,
          spamComments
        },
        growth,
        recent: {
          recentPosts,
          recentComments,
          recentUsers,
          recentActivity
        }
      }

      // Cache the results
      try {
        await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(stats))
      } catch (error) {
        logger.warn('Failed to cache dashboard stats:', error)
      }

      return stats
    } catch (error) {
      logger.error('Failed to get dashboard stats:', error)
      throw new Error('Failed to retrieve dashboard statistics')
    }
  }

  async getAnalytics(timeframe: 'day' | 'week' | 'month' | 'year'): Promise<AnalyticsData> {
    const cacheKey = `dashboard:analytics:${timeframe}`
    
    try {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      logger.warn('Failed to get analytics from cache:', error)
    }

    try {
      const { startDate, endDate, groupFormat } = this.getTimeframeDates(timeframe)

      // Get time-series data
      const [viewsData, postsData, commentsData, usersData] = await Promise.all([
        this.getViewsTimeSeries(startDate, endDate, groupFormat),
        this.getPostsTimeSeries(startDate, endDate, groupFormat),
        this.getCommentsTimeSeries(startDate, endDate, groupFormat),
        this.getUsersTimeSeries(startDate, endDate, groupFormat)
      ])

      // Get top content
      const [topPosts, topCategories, topTags, topAuthors] = await Promise.all([
        this.getTopPosts(startDate, endDate),
        this.getTopCategories(startDate, endDate),
        this.getTopTags(startDate, endDate),
        this.getTopAuthors(startDate, endDate)
      ])

      const analytics: AnalyticsData = {
        timeframe,
        metrics: {
          views: viewsData,
          posts: postsData,
          comments: commentsData,
          users: usersData
        },
        topContent: {
          posts: topPosts,
          categories: topCategories,
          tags: topTags,
          authors: topAuthors
        }
      }

      // Cache for different durations based on timeframe
      const cacheTTL = timeframe === 'day' ? 300 : timeframe === 'week' ? 900 : 3600
      try {
        await redisClient.setex(cacheKey, cacheTTL, JSON.stringify(analytics))
      } catch (error) {
        logger.warn('Failed to cache analytics:', error)
      }

      return analytics
    } catch (error) {
      logger.error('Failed to get analytics:', error)
      throw new Error('Failed to retrieve analytics data')
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      const [dbHealth, redisHealth, diskUsage, memoryUsage] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.getDiskUsage(),
        this.getMemoryUsage()
      ])

      return {
        database: dbHealth,
        redis: redisHealth,
        disk: diskUsage,
        memory: memoryUsage,
        timestamp: new Date().toISOString(),
        status: dbHealth.connected && redisHealth.connected ? 'healthy' : 'degraded'
      }
    } catch (error) {
      logger.error('Failed to get system health:', error)
      throw new Error('Failed to retrieve system health data')
    }
  }

  async getSecurityAlerts(): Promise<any[]> {
    try {
      const [failedLogins, suspiciousActivity, systemAlerts] = await Promise.all([
        this.getFailedLoginAttempts(),
        this.getSuspiciousActivity(),
        this.getSystemAlerts()
      ])

      return [
        ...failedLogins,
        ...suspiciousActivity,
        ...systemAlerts
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (error) {
      logger.error('Failed to get security alerts:', error)
      throw new Error('Failed to retrieve security alerts')
    }
  }

  async getModerationQueue(): Promise<any> {
    try {
      const [pendingComments, reportedComments, flaggedPosts, suspendedUsers] = await Promise.all([
        prisma.comment.count({ where: { status: 'PENDING' } }),
        prisma.comment.count({ where: { status: 'REPORTED' } }),
        prisma.post.count({ where: { status: 'FLAGGED' } }),
        prisma.user.count({ where: { isActive: false } })
      ])

      const recentReports = await prisma.comment.findMany({
        where: { status: 'REPORTED' },
        include: {
          author: { select: { id: true, name: true, email: true } },
          post: { select: { id: true, title: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      })

      return {
        counts: {
          pendingComments,
          reportedComments,
          flaggedPosts,
          suspendedUsers
        },
        recentReports,
        urgentItems: pendingComments + reportedComments + flaggedPosts
      }
    } catch (error) {
      logger.error('Failed to get moderation queue:', error)
      throw new Error('Failed to retrieve moderation queue data')
    }
  }

  // Helper methods
  private async getTotalViews(beforeDate?: Date): Promise<number> {
    const whereClause = beforeDate ? { createdAt: { lt: beforeDate } } : {}
    
    const result = await prisma.postView.aggregate({
      where: whereClause,
      _sum: { count: true }
    })
    
    return result._sum.count || 0
  }

  private calculateGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  private async getRecentPosts() {
    return prisma.post.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true } },
        _count: { select: { comments: true, views: true } }
      }
    })
  }

  private async getRecentComments() {
    return prisma.comment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true } },
        post: { select: { title: true } }
      }
    })
  }

  private async getRecentUsers() {
    return prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true
      }
    })
  }

  private async getRecentActivity() {
    // This would typically come from an activity log table
    // For now, we'll combine recent posts and comments
    const [posts, comments] = await Promise.all([
      prisma.post.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          author: { select: { name: true } }
        }
      }),
      prisma.comment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true } },
          post: { select: { title: true } }
        }
      })
    ])

    const activity = [
      ...posts.map(post => ({
        type: 'post',
        id: post.id,
        description: `${post.author.name} published "${post.title}"`,
        timestamp: post.createdAt
      })),
      ...comments.map(comment => ({
        type: 'comment',
        id: comment.id,
        description: `${comment.author.name} commented on "${comment.post.title}"`,
        timestamp: comment.createdAt
      }))
    ]

    return activity
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
  }

  private getTimeframeDates(timeframe: string) {
    const now = new Date()
    let startDate: Date
    let groupFormat: string

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        groupFormat = 'hour'
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        groupFormat = 'day'
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        groupFormat = 'day'
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        groupFormat = 'month'
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        groupFormat = 'day'
    }

    return { startDate, endDate: now, groupFormat }
  }

  private async getViewsTimeSeries(startDate: Date, endDate: Date, groupFormat: string) {
    // This would be more complex with proper time-series data
    // Simplified version for now
    return [
      { date: startDate.toISOString().split('T')[0], count: 100 },
      { date: endDate.toISOString().split('T')[0], count: 150 }
    ]
  }

  private async getPostsTimeSeries(startDate: Date, endDate: Date, groupFormat: string) {
    const posts = await prisma.post.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: { createdAt: true }
    })

    // Group by date
    const grouped = posts.reduce((acc, post) => {
      const date = post.createdAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped).map(([date, count]) => ({ date, count }))
  }

  private async getCommentsTimeSeries(startDate: Date, endDate: Date, groupFormat: string) {
    const comments = await prisma.comment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: { createdAt: true }
    })

    const grouped = comments.reduce((acc, comment) => {
      const date = comment.createdAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped).map(([date, count]) => ({ date, count }))
  }

  private async getUsersTimeSeries(startDate: Date, endDate: Date, groupFormat: string) {
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: { createdAt: true }
    })

    const grouped = users.reduce((acc, user) => {
      const date = user.createdAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped).map(([date, count]) => ({ date, count }))
  }

  private async getTopPosts(startDate: Date, endDate: Date) {
    return prisma.post.findMany({
      where: {
        publishedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        author: { select: { name: true } },
        _count: { select: { comments: true, views: true } }
      },
      orderBy: {
        views: { _count: 'desc' }
      },
      take: 10
    })
  }

  private async getTopCategories(startDate: Date, endDate: Date) {
    return prisma.category.findMany({
      include: {
        _count: { select: { posts: true } }
      },
      orderBy: {
        posts: { _count: 'desc' }
      },
      take: 10
    })
  }

  private async getTopTags(startDate: Date, endDate: Date) {
    return prisma.tag.findMany({
      include: {
        _count: { select: { posts: true } }
      },
      orderBy: {
        posts: { _count: 'desc' }
      },
      take: 10
    })
  }

  private async getTopAuthors(startDate: Date, endDate: Date) {
    return prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'AUTHOR', 'MODERATOR'] }
      },
      include: {
        _count: { select: { posts: true, comments: true } }
      },
      orderBy: {
        posts: { _count: 'desc' }
      },
      take: 10
    })
  }

  private async checkDatabaseHealth() {
    try {
      await prisma.$queryRaw`SELECT 1`
      return {
        connected: true,
        responseTime: Date.now(), // Simplified
        activeConnections: 1
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async checkRedisHealth() {
    try {
      await redisClient.ping()
      return {
        connected: true,
        responseTime: Date.now() // Simplified
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async getDiskUsage() {
    // This would require additional system monitoring in production
    return {
      total: '100GB',
      used: '45GB',
      free: '55GB',
      usagePercentage: 45
    }
  }

  private async getMemoryUsage() {
    const usage = process.memoryUsage()
    return {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024)
    }
  }

  private async getFailedLoginAttempts() {
    // This would come from an audit log table
    return []
  }

  private async getSuspiciousActivity() {
    // This would analyze patterns for suspicious behavior
    return []
  }

  private async getSystemAlerts() {
    // This would check various system metrics
    return []
  }
}

export const dashboardService = new DashboardService() 