import { PostStatus, UserRole } from '@prisma/client'
import { prisma } from '@/config/database'
import { redis } from '@/config/database'
import slugify from 'slugify'
import { 
  CreatePostRequest, 
  UpdatePostRequest, 
  PostListQuery, 
  PostResponse,
  PaginatedResponse 
} from '@/types/api'

export class PostService {
  
  // Create new post
  static async createPost(userId: string, data: CreatePostRequest): Promise<PostResponse> {
    const { title, content, excerpt, categoryId, tagIds, status, publishedAt, metaTitle, metaDescription, thumbnail } = data
    
    // Generate unique slug
    let slug = slugify(title, { lower: true, strict: true })
    const existingPost = await prisma.post.findUnique({ where: { slug } })
    if (existingPost) {
      slug = `${slug}-${Date.now()}`
    }
    
    // Validate category exists
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } })
      if (!category) {
        throw new Error('Category not found')
      }
    }
    
    // Validate tags exist
    if (tagIds && tagIds.length > 0) {
      const tags = await prisma.tag.findMany({ where: { id: { in: tagIds } } })
      if (tags.length !== tagIds.length) {
        throw new Error('One or more tags not found')
      }
    }
    
    // Handle publish date
    let finalPublishedAt = null
    if (status === PostStatus.PUBLISHED) {
      finalPublishedAt = publishedAt || new Date()
    } else if (status === PostStatus.SCHEDULED && publishedAt) {
      if (new Date(publishedAt) <= new Date()) {
        throw new Error('Scheduled publish date must be in the future')
      }
      finalPublishedAt = new Date(publishedAt)
    }
    
    // Create post
    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        status,
        publishedAt: finalPublishedAt,
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || excerpt,
        thumbnail,
        authorId: userId,
        categoryId,
        tags: tagIds ? {
          connect: tagIds.map(id => ({ id }))
        } : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        },
        category: true,
        tags: true,
        _count: {
          select: {
            comments: {
              where: { status: 'APPROVED' }
            }
          }
        }
      }
    })
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'post_created',
        entity: 'Post',
        entityId: post.id,
        userId,
        details: { title, status }
      }
    })
    
    // Clear cache
    await this.clearPostCache()
    
    return post
  }
  
  // Get posts with filtering and pagination
  static async getPosts(query: PostListQuery): Promise<PaginatedResponse<PostResponse>> {
    const {
      page = 1,
      limit = 10,
      status,
      categoryId,
      tagId,
      authorId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeScheduled = false
    } = query
    
    const skip = (page - 1) * limit
    
    // Build where clause
    const where: any = {}
    
    // Status filter
    if (status) {
      where.status = status
    } else if (!includeScheduled) {
      // By default, exclude scheduled posts unless specifically requested
      where.status = { not: PostStatus.SCHEDULED }
    }
    
    // Category filter
    if (categoryId) {
      where.categoryId = categoryId
    }
    
    // Tag filter
    if (tagId) {
      where.tags = { some: { id: tagId } }
    }
    
    // Author filter
    if (authorId) {
      where.authorId = authorId
    }
    
    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    // For published posts, only show those with publishedAt in the past
    if (status === PostStatus.PUBLISHED || (!status && !includeScheduled)) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { status: { not: PostStatus.PUBLISHED } },
            { 
              AND: [
                { status: PostStatus.PUBLISHED },
                { publishedAt: { lte: new Date() } }
              ]
            }
          ]
        }
      ]
    }
    
    // Build orderBy
    const orderBy: any = {}
    if (sortBy === 'publishedAt') {
      orderBy.publishedAt = sortOrder
    } else if (sortBy === 'viewCount') {
      orderBy.viewCount = sortOrder
    } else if (sortBy === 'commentCount') {
      orderBy.comments = { _count: sortOrder }
    } else {
      orderBy[sortBy] = sortOrder
    }
    
    // Get posts and total count
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            }
          },
          category: true,
          tags: true,
          _count: {
            select: {
              comments: {
                where: { status: 'APPROVED' }
              }
            }
          }
        }
      }),
      prisma.post.count({ where })
    ])
    
    const totalPages = Math.ceil(total / limit)
    
    return {
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }
  
  // Get single post by ID or slug
  static async getPost(identifier: string, incrementView = false): Promise<PostResponse> {
    // Check if identifier is a UUID (ID) or slug
    const isId = identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    
    const post = await prisma.post.findUnique({
      where: isId ? { id: identifier } : { slug: identifier },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
          }
        },
        category: true,
        tags: true,
        comments: {
          where: { status: 'APPROVED' },
          include: {
            replies: {
              where: { status: 'APPROVED' }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            comments: {
              where: { status: 'APPROVED' }
            }
          }
        }
      }
    })
    
    if (!post) {
      throw new Error('Post not found')
    }
    
    // Check if post is published or scheduled in the future
    if (post.status === PostStatus.PUBLISHED && post.publishedAt && post.publishedAt > new Date()) {
      throw new Error('Post not yet published')
    }
    
    // Increment view count if requested
    if (incrementView && post.status === PostStatus.PUBLISHED) {
      await prisma.post.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } }
      })
      post.viewCount++
      
      // Cache view count increment in Redis for performance
      try {
        await redis.incr(`post_views:${post.id}`)
      } catch (error) {
        console.warn('Failed to cache view count:', error)
      }
    }
    
    return post
  }
  
  // Update post
  static async updatePost(postId: string, userId: string, userRole: UserRole, data: UpdatePostRequest): Promise<PostResponse> {
    // Get existing post
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true }
    })
    
    if (!existingPost) {
      throw new Error('Post not found')
    }
    
    // Check permissions
    if (userRole !== UserRole.ADMIN && existingPost.authorId !== userId) {
      throw new Error('You can only edit your own posts')
    }
    
    const { title, content, excerpt, categoryId, tagIds, status, publishedAt, metaTitle, metaDescription, thumbnail } = data
    
    // Handle slug update if title changed
    let slug = existingPost.slug
    if (title && title !== existingPost.title) {
      slug = slugify(title, { lower: true, strict: true })
      const existingSlug = await prisma.post.findFirst({
        where: { slug, id: { not: postId } }
      })
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`
      }
    }
    
    // Validate category if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } })
      if (!category) {
        throw new Error('Category not found')
      }
    }
    
    // Handle publish date logic
    let finalPublishedAt = existingPost.publishedAt
    if (status === PostStatus.PUBLISHED && !existingPost.publishedAt) {
      finalPublishedAt = publishedAt || new Date()
    } else if (status === PostStatus.SCHEDULED && publishedAt) {
      if (new Date(publishedAt) <= new Date()) {
        throw new Error('Scheduled publish date must be in the future')
      }
      finalPublishedAt = new Date(publishedAt)
    } else if (status === PostStatus.DRAFT) {
      finalPublishedAt = null
    }
    
    // Prepare update data
    const updateData: any = {
      ...(title && { title }),
      ...(slug && { slug }),
      ...(content && { content }),
      ...(excerpt && { excerpt }),
      ...(status && { status }),
      ...(metaTitle && { metaTitle }),
      ...(metaDescription && { metaDescription }),
      ...(thumbnail !== undefined && { thumbnail }),
      publishedAt: finalPublishedAt,
      updatedAt: new Date(),
    }
    
    // Handle category update
    if (categoryId !== undefined) {
      updateData.categoryId = categoryId
    }
    
    // Handle tags update
    if (tagIds !== undefined) {
      // First disconnect all existing tags, then connect new ones
      updateData.tags = {
        set: tagIds.map(id => ({ id }))
      }
    }
    
    // Update post
    const post = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        },
        category: true,
        tags: true,
        _count: {
          select: {
            comments: {
              where: { status: 'APPROVED' }
            }
          }
        }
      }
    })
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'post_updated',
        entity: 'Post',
        entityId: post.id,
        userId,
        details: { title: post.title, status: post.status }
      }
    })
    
    // Clear cache
    await this.clearPostCache()
    
    return post
  }
  
  // Delete post
  static async deletePost(postId: string, userId: string, userRole: UserRole): Promise<void> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true }
    })
    
    if (!post) {
      throw new Error('Post not found')
    }
    
    // Check permissions
    if (userRole !== UserRole.ADMIN && post.authorId !== userId) {
      throw new Error('You can only delete your own posts')
    }
    
    // Delete post and related data
    await prisma.$transaction([
      // Delete comments
      prisma.comment.deleteMany({ where: { postId } }),
      // Delete activity logs
      prisma.activityLog.deleteMany({ where: { entityId: postId, entity: 'Post' } }),
      // Delete the post
      prisma.post.delete({ where: { id: postId } })
    ])
    
    // Log deletion
    await prisma.activityLog.create({
      data: {
        action: 'post_deleted',
        entity: 'Post',
        entityId: postId,
        userId,
        details: { title: post.title }
      }
    })
    
    // Clear cache
    await this.clearPostCache()
  }
  
  // Get related posts
  static async getRelatedPosts(postId: string, limit = 5): Promise<PostResponse[]> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { tags: true }
    })
    
    if (!post) {
      return []
    }
    
    const tagIds = post.tags.map(tag => tag.id)
    
    return await prisma.post.findMany({
      where: {
        id: { not: postId },
        status: PostStatus.PUBLISHED,
        publishedAt: { lte: new Date() },
        OR: [
          { categoryId: post.categoryId },
          { tags: { some: { id: { in: tagIds } } } }
        ]
      },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        },
        category: true,
        tags: true,
        _count: {
          select: {
            comments: {
              where: { status: 'APPROVED' }
            }
          }
        }
      }
    })
  }
  
  // Get popular posts
  static async getPopularPosts(limit = 10, timeRange = 30): Promise<PostResponse[]> {
    const since = new Date()
    since.setDate(since.getDate() - timeRange)
    
    return await prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        publishedAt: { lte: new Date(), gte: since }
      },
      take: limit,
      orderBy: { viewCount: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        },
        category: true,
        tags: true,
        _count: {
          select: {
            comments: {
              where: { status: 'APPROVED' }
            }
          }
        }
      }
    })
  }
  
  // Process scheduled posts
  static async processScheduledPosts(): Promise<number> {
    const now = new Date()
    
    // Find scheduled posts that should be published
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: PostStatus.SCHEDULED,
        publishedAt: { lte: now }
      }
    })
    
    // Update them to published
    if (scheduledPosts.length > 0) {
      await prisma.post.updateMany({
        where: {
          id: { in: scheduledPosts.map(p => p.id) }
        },
        data: { status: PostStatus.PUBLISHED }
      })
      
      // Log activities
      for (const post of scheduledPosts) {
        await prisma.activityLog.create({
          data: {
            action: 'post_auto_published',
            entity: 'Post',
            entityId: post.id,
            userId: post.authorId,
            details: { title: post.title, scheduledAt: post.publishedAt }
          }
        })
      }
      
      // Clear cache
      await this.clearPostCache()
    }
    
    return scheduledPosts.length
  }
  
  // Clear post-related cache
  private static async clearPostCache(): Promise<void> {
    try {
      const keys = await redis.keys('posts:*')
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.warn('Failed to clear post cache:', error)
    }
  }
  
  // Get post statistics
  static async getPostStats(authorId?: string) {
    const where = authorId ? { authorId } : {}
    
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      scheduledPosts,
      totalViews,
      totalComments
    ] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.count({ where: { ...where, status: PostStatus.PUBLISHED } }),
      prisma.post.count({ where: { ...where, status: PostStatus.DRAFT } }),
      prisma.post.count({ where: { ...where, status: PostStatus.SCHEDULED } }),
      prisma.post.aggregate({
        where,
        _sum: { viewCount: true }
      }),
      prisma.comment.count({
        where: {
          status: 'APPROVED',
          ...(authorId && { post: { authorId } })
        }
      })
    ])
    
    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      scheduledPosts,
      totalViews: totalViews._sum.viewCount || 0,
      totalComments
    }
  }
} 