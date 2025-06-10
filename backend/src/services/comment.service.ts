import { prisma } from '@/utils/prisma'
import { redis } from '@/utils/redis'
import type { Comment, CommentStatus, Prisma } from '@prisma/client'

export interface CommentCreateOptions {
  postId: string
  userId?: string
  parentId?: string
  content: string
  authorName?: string
  authorEmail?: string
  authorUrl?: string
  ipAddress?: string
  userAgent?: string
}

export interface CommentUpdateOptions {
  content?: string
  status?: CommentStatus
}

export interface CommentSearchOptions {
  postId?: string
  userId?: string
  status?: CommentStatus
  search?: string
  parentId?: string | null
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'votes'
  sortOrder?: 'asc' | 'desc'
  includeReplies?: boolean
}

export interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[]
  user?: { id: string; name: string; avatar?: string }
  votes?: { up: number; down: number; userVote?: 'up' | 'down' | null }
  _count?: { replies: number }
}

class CommentService {
  private readonly spamKeywords = [
    'buy now', 'free money', 'click here', 'limited offer', 'amazing deal',
    'make money fast', 'work from home', 'get rich quick', 'viagra', 'casino'
  ]

  async createComment(options: CommentCreateOptions): Promise<CommentWithReplies> {
    const {
      postId,
      userId,
      parentId,
      content,
      authorName,
      authorEmail,
      authorUrl,
      ipAddress,
      userAgent
    } = options

    // Validate post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    // Validate parent comment if provided
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      })

      if (!parentComment || parentComment.postId !== postId) {
        throw new Error('Invalid parent comment')
      }
    }

    // Auto-moderation: check for spam
    const status = this.detectSpam(content, authorEmail) ? 'PENDING' : 'APPROVED'

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        parentId,
        content,
        authorName,
        authorEmail,
        authorUrl,
        ipAddress,
        userAgent,
        status
      },
      include: {
        user: userId ? {
          select: { id: true, name: true, avatar: true }
        } : false,
        _count: {
          select: { replies: true }
        }
      }
    })

    // Clear comment caches
    await this.clearCommentCache(postId)

    // Track activity
    if (userId) {
      await this.trackCommentActivity(userId, 'comment_created', { commentId: comment.id, postId })
    }

    return comment as CommentWithReplies
  }

  async getComment(
    id: string,
    options: { includeReplies?: boolean; includeVotes?: boolean; userId?: string } = {}
  ): Promise<CommentWithReplies | null> {
    const { includeReplies = false, includeVotes = false, userId } = options

    const cacheKey = `comment:${id}${includeReplies ? ':with-replies' : ''}${includeVotes ? ':with-votes' : ''}`
    
    // Try cache first
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const comment = JSON.parse(cached)
        if (includeVotes && userId) {
          comment.votes = await this.getCommentVotes(id, userId)
        }
        return comment
      }
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        },
        replies: includeReplies ? {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            },
            _count: {
              select: { replies: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        } : false,
        _count: {
          select: { replies: true }
        }
      }
    })

    if (!comment) return null

    let result = comment as CommentWithReplies

    // Add vote information if requested
    if (includeVotes) {
      result.votes = await this.getCommentVotes(id, userId)
    }

    // Cache result
    if (redis) {
      await redis.setex(cacheKey, 1800, JSON.stringify(result)) // 30 minutes
    }

    return result
  }

  async getCommentList(options: CommentSearchOptions = {}): Promise<{
    comments: CommentWithReplies[]
    pagination: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }> {
    const {
      postId,
      userId,
      status,
      search,
      parentId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeReplies = false
    } = options

    const cacheKey = `comments:list:${JSON.stringify(options)}`
    
    // Try cache for non-search results
    if (redis && !search) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    const where: Prisma.CommentWhereInput = {}

    if (postId) {
      where.postId = postId
    }

    if (userId) {
      where.userId = userId
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { authorName: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (parentId !== undefined) {
      where.parentId = parentId
    }

    // For threaded comments, only get top-level comments by default
    if (includeReplies && parentId === undefined) {
      where.parentId = null
    }

    const orderBy: Prisma.CommentOrderByWithRelationInput = { [sortBy]: sortOrder }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, avatar: true }
          },
          replies: includeReplies ? {
            include: {
              user: {
                select: { id: true, name: true, avatar: true }
              },
              _count: {
                select: { replies: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          } : false,
          _count: {
            select: { replies: true }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.comment.count({ where })
    ])

    const result = {
      comments: comments as CommentWithReplies[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }

    // Cache non-search results
    if (redis && !search) {
      await redis.setex(cacheKey, 900, JSON.stringify(result)) // 15 minutes
    }

    return result
  }

  async updateComment(id: string, data: CommentUpdateOptions): Promise<CommentWithReplies> {
    const comment = await prisma.comment.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { replies: true }
        }
      }
    })

    // Clear caches
    await this.clearCommentCache(comment.postId, id)

    return comment as CommentWithReplies
  }

  async deleteComment(id: string): Promise<void> {
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { replies: true }
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    // If comment has replies, mark as deleted instead of actually deleting
    if (comment.replies.length > 0) {
      await prisma.comment.update({
        where: { id },
        data: {
          content: '[Comment deleted]',
          status: 'DELETED',
          authorName: '[Deleted]',
          authorEmail: null,
          updatedAt: new Date()
        }
      })
    } else {
      // Actually delete if no replies
      await prisma.comment.delete({
        where: { id }
      })
    }

    // Clear caches
    await this.clearCommentCache(comment.postId, id)
  }

  async voteComment(commentId: string, userId: string, voteType: 'up' | 'down'): Promise<{
    success: boolean
    votes: { up: number; down: number }
  }> {
    // Get updated vote counts
    const votes = await this.getCommentVotes(commentId)

    // Clear cache
    if (redis) {
      await redis.del(`comment:votes:${commentId}`)
    }

    return { success: true, votes }
  }

  async getCommentVotes(commentId: string, userId?: string): Promise<{
    up: number
    down: number
    userVote?: 'up' | 'down' | null
  }> {
    const cacheKey = `comment:votes:${commentId}`
    
    // Mock vote counts for now
    const votes = { up: 0, down: 0 }

    // Get user's vote if userId provided
    let userVote: 'up' | 'down' | null = null

    return { ...votes, userVote }
  }

  async moderateComment(id: string, action: 'approve' | 'reject' | 'spam', moderatorId: string): Promise<CommentWithReplies> {
    const statusMap = {
      approve: 'APPROVED' as CommentStatus,
      reject: 'REJECTED' as CommentStatus,
      spam: 'SPAM' as CommentStatus
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: {
        status: statusMap[action],
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { replies: true }
        }
      }
    })

    // Track moderation activity
    await this.trackCommentActivity(moderatorId, 'comment_moderated', {
      commentId: id,
      action,
      originalStatus: comment.status
    })

    // Clear caches
    await this.clearCommentCache(comment.postId, id)

    return comment as CommentWithReplies
  }

  async getCommentStats(postId?: string): Promise<{
    total: number
    approved: number
    pending: number
    rejected: number
    spam: number
    recentComments: number
    topCommenters: Array<{ userId: string; name: string; count: number }>
  }> {
    const cacheKey = postId ? `comments:stats:${postId}` : 'comments:stats:global'
    
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    const where = postId ? { postId } : {}
    const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours

    const [
      total,
      approved,
      pending,
      rejected,
      spam,
      recentComments,
      topCommenters
    ] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.comment.count({ where: { ...where, status: 'PENDING' } }),
      prisma.comment.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.comment.count({ where: { ...where, status: 'SPAM' } }),
      prisma.comment.count({ 
        where: { 
          ...where, 
          createdAt: { gte: recentDate }
        }
      }),
      prisma.comment.groupBy({
        by: ['userId'],
        where: {
          ...where,
          userId: { not: null }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }).then(async (results) => {
        if (results.length === 0) return []
        
        const userIds = results.map(r => r.userId!).filter(Boolean)
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true }
        })
        
        return results.map(r => {
          const user = users.find(u => u.id === r.userId)
          return {
            userId: r.userId!,
            name: user?.name || 'Unknown',
            count: r._count.id
          }
        })
      })
    ])

    const stats = {
      total,
      approved,
      pending,
      rejected,
      spam,
      recentComments,
      topCommenters
    }

    if (redis) {
      await redis.setex(cacheKey, 1800, JSON.stringify(stats)) // 30 minutes
    }

    return stats
  }

  async buildCommentTree(postId: string, maxDepth: number = 3): Promise<CommentWithReplies[]> {
    const cacheKey = `comments:tree:${postId}:${maxDepth}`
    
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    // Get all approved comments for the post
    const allComments = await prisma.comment.findMany({
      where: {
        postId,
        status: 'APPROVED'
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { replies: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Build tree structure
    const commentMap = new Map<string, CommentWithReplies>()
    const rootComments: CommentWithReplies[] = []

    // First pass: create map and identify root comments
    allComments.forEach(comment => {
      const commentWithReplies = { ...comment, replies: [] } as CommentWithReplies
      commentMap.set(comment.id, commentWithReplies)
      
      if (!comment.parentId) {
        rootComments.push(commentWithReplies)
      }
    })

    // Second pass: build tree structure
    allComments.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId)
        const child = commentMap.get(comment.id)
        if (parent && child) {
          parent.replies = parent.replies || []
          parent.replies.push(child)
        }
      }
    })

    // Sort replies by creation date
    const sortReplies = (comments: CommentWithReplies[]) => {
      comments.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          sortReplies(comment.replies)
        }
      })
    }

    sortReplies(rootComments)

    if (redis) {
      await redis.setex(cacheKey, 900, JSON.stringify(rootComments)) // 15 minutes
    }

    return rootComments
  }

  private detectSpam(content: string, email?: string): boolean {
    const lowerContent = content.toLowerCase()
    
    // Check for spam keywords
    const hasSpamKeywords = this.spamKeywords.some(keyword => 
      lowerContent.includes(keyword)
    )

    // Check for excessive links
    const linkCount = (content.match(/https?:\/\//g) || []).length
    const hasExcessiveLinks = linkCount > 3

    // Check for suspicious email patterns
    const hasSuspiciousEmail = email && (
      email.includes('tempmail') ||
      email.includes('10minutemail') ||
      email.includes('guerrillamail')
    )

    return hasSpamKeywords || hasExcessiveLinks || !!hasSuspiciousEmail
  }

  private async trackCommentActivity(userId: string, action: string, metadata?: any): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action,
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      })
    } catch (error) {
      console.error('Failed to track comment activity:', error)
    }
  }

  private async clearCommentCache(postId: string, commentId?: string): Promise<void> {
    if (!redis) return

    const patterns = [
      `comments:list:*`,
      `comments:stats:*`,
      `comments:tree:${postId}*`,
      commentId ? `comment:${commentId}*` : null
    ].filter(Boolean)

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }
  }

  async bulkModerate(commentIds: string[], action: 'approve' | 'reject' | 'spam', moderatorId: string): Promise<{
    success: string[]
    failed: Array<{ id: string; error: string }>
  }> {
    const results = {
      success: [] as string[],
      failed: [] as Array<{ id: string; error: string }>
    }

    for (const id of commentIds) {
      try {
        await this.moderateComment(id, action, moderatorId)
        results.success.push(id)
      } catch (error) {
        results.failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  async cleanupDeletedComments(): Promise<{ deletedCount: number }> {
    // Delete comments marked as deleted with no replies for more than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const result = await prisma.comment.deleteMany({
      where: {
        status: 'DELETED',
        updatedAt: { lt: thirtyDaysAgo },
        replies: { none: {} }
      }
    })

    return { deletedCount: result.count }
  }
}

export const commentService = new CommentService() 