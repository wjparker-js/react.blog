import { prisma } from '@/prisma/client'
import { performance } from 'perf_hooks'

interface QueryStats {
  query: string
  duration: number
  timestamp: number
  params?: any
}

class QueryOptimizer {
  private slowQueryThreshold = 1000 // 1 second
  private queryStats: QueryStats[] = []

  // Monitor slow queries
  async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    params?: any
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await queryFn()
      const duration = performance.now() - startTime
      
      const stats: QueryStats = {
        query: queryName,
        duration,
        timestamp: Date.now(),
        params
      }

      this.recordQueryStats(stats)
      
      if (duration > this.slowQueryThreshold) {
        console.warn('Slow query detected:', {
          query: queryName,
          duration: `${duration.toFixed(2)}ms`,
          params
        })
      }

      return result
    } catch (error) {
      const duration = performance.now() - startTime
      console.error('Query failed:', {
        query: queryName,
        duration: `${duration.toFixed(2)}ms`,
        error: error.message,
        params
      })
      throw error
    }
  }

  private recordQueryStats(stats: QueryStats) {
    this.queryStats.push(stats)
    
    // Keep only last 1000 queries
    if (this.queryStats.length > 1000) {
      this.queryStats.shift()
    }
  }

  getSlowQueries(limit = 10): QueryStats[] {
    return this.queryStats
      .filter(q => q.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  getQueryStats(): any {
    if (this.queryStats.length === 0) return null

    const durations = this.queryStats.map(q => q.duration)
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

    return {
      totalQueries: this.queryStats.length,
      avgDuration: parseFloat(avgDuration.toFixed(2)),
      slowQueries: this.queryStats.filter(q => q.duration > this.slowQueryThreshold).length,
      fastestQuery: Math.min(...durations),
      slowestQuery: Math.max(...durations)
    }
  }
}

export const queryOptimizer = new QueryOptimizer()

// Optimized queries for common operations
export class OptimizedQueries {
  // Efficient post listing with pagination
  static async getPostsPaginated(page = 1, limit = 10, filters: any = {}) {
    return queryOptimizer.trackQuery('getPostsPaginated', async () => {
      const skip = (page - 1) * limit
      
      const where = {
        ...(filters.status && { status: filters.status }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.authorId && { authorId: filters.authorId }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { content: { contains: filters.search, mode: 'insensitive' } }
          ]
        })
      }

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            status: true,
            publishedAt: true,
            viewCount: true,
            likeCount: true,
            featuredImage: true,
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true
              }
            },
            tags: {
              select: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    color: true
                  }
                }
              }
            },
            _count: {
              select: {
                comments: true
              }
            }
          }
        }),
        prisma.post.count({ where })
      ])

      return {
        posts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }, { page, limit, filters })
  }

  // Optimized dashboard stats
  static async getDashboardStats() {
    return queryOptimizer.trackQuery('getDashboardStats', async () => {
      const [
        totalPosts,
        publishedPosts,
        draftPosts,
        totalUsers,
        activeUsers,
        totalComments,
        pendingComments,
        totalCategories,
        totalTags,
        recentPosts,
        topAuthors,
        popularPosts
      ] = await Promise.all([
        prisma.post.count(),
        prisma.post.count({ where: { status: 'PUBLISHED' } }),
        prisma.post.count({ where: { status: 'DRAFT' } }),
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.comment.count(),
        prisma.comment.count({ where: { status: 'PENDING' } }),
        prisma.category.count(),
        prisma.tag.count(),
        
        // Recent posts (last 7 days)
        prisma.post.findMany({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            createdAt: true,
            author: {
              select: { username: true }
            }
          }
        }),

        // Top authors by post count
        prisma.user.findMany({
          where: {
            posts: { some: {} }
          },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            _count: {
              select: { posts: true }
            }
          },
          orderBy: {
            posts: { _count: 'desc' }
          },
          take: 5
        }),

        // Most popular posts by views
        prisma.post.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: { viewCount: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            slug: true,
            viewCount: true,
            likeCount: true,
            publishedAt: true
          }
        })
      ])

      return {
        overview: {
          totalPosts,
          publishedPosts,
          draftPosts,
          totalUsers,
          activeUsers,
          totalComments,
          pendingComments,
          totalCategories,
          totalTags,
          recentPosts,
          topAuthors,
          popularPosts
        }
      }
    }, {})
  }
} 