import { PrismaClient, PostStatus } from '@prisma/client'
import { redisClient } from '@/config/redis'
import { logger } from '@/utils/logger'

const prisma = new PrismaClient()

interface SearchOptions {
  query: string
  type?: 'posts' | 'users' | 'categories' | 'tags' | 'all'
  status?: PostStatus
  authorId?: string
  categoryId?: string
  tagIds?: string[]
  dateFrom?: Date
  dateTo?: Date
  sortBy?: 'relevance' | 'date' | 'views' | 'comments'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  includeUnpublished?: boolean
  userId?: string // For access control
}

interface SearchResult {
  posts: any[]
  users: any[]
  categories: any[]
  tags: any[]
  total: number
  pagination: {
    page: number
    limit: number
    totalPages: number
    totalItems: number
  }
  facets: {
    categories: { id: string; name: string; count: number }[]
    tags: { id: string; name: string; count: number }[]
    authors: { id: string; name: string; count: number }[]
    dateRanges: { range: string; count: number }[]
  }
  suggestions: string[]
  trending: string[]
}

interface AutocompleteResult {
  suggestions: string[]
  entities: {
    posts: { id: string; title: string; type: 'post' }[]
    users: { id: string; name: string; type: 'user' }[]
    categories: { id: string; name: string; type: 'category' }[]
    tags: { id: string; name: string; type: 'tag' }[]
  }
}

interface SEOData {
  title: string
  description: string
  keywords: string[]
  canonical: string
  openGraph: {
    title: string
    description: string
    image?: string
    type: string
  }
  schema: any
}

export class SearchService {
  private readonly CACHE_TTL = 300 // 5 minutes
  private readonly TRENDING_TTL = 3600 // 1 hour
  private readonly POPULAR_SEARCHES_TTL = 86400 // 24 hours

  async search(options: SearchOptions): Promise<SearchResult> {
    const cacheKey = `search:${JSON.stringify(options)}`
    
    try {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        await this.recordSearchQuery(options.query, options.userId)
        return JSON.parse(cached)
      }
    } catch (error) {
      logger.warn('Failed to get search results from cache:', error)
    }

    try {
      const {
        query,
        type = 'all',
        status = 'PUBLISHED',
        authorId,
        categoryId,
        tagIds,
        dateFrom,
        dateTo,
        sortBy = 'relevance',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
        includeUnpublished = false,
        userId
      } = options

      const offset = (page - 1) * limit

      let posts: any[] = []
      let users: any[] = []
      let categories: any[] = []
      let tags: any[] = []

      // Search posts
      if (type === 'posts' || type === 'all') {
        const postWhereClause: any = {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { excerpt: { contains: query, mode: 'insensitive' } }
          ]
        }

        if (!includeUnpublished) {
          postWhereClause.status = status
        }

        if (authorId) {
          postWhereClause.authorId = authorId
        }

        if (categoryId) {
          postWhereClause.categoryId = categoryId
        }

        if (tagIds?.length) {
          postWhereClause.tags = {
            some: {
              tagId: { in: tagIds }
            }
          }
        }

        if (dateFrom || dateTo) {
          postWhereClause.publishedAt = {}
          if (dateFrom) postWhereClause.publishedAt.gte = dateFrom
          if (dateTo) postWhereClause.publishedAt.lte = dateTo
        }

        const orderBy = this.getPostOrderBy(sortBy, sortOrder)

        posts = await prisma.post.findMany({
          where: postWhereClause,
          include: {
            author: {
              select: { id: true, name: true, avatar: true }
            },
            category: {
              select: { id: true, name: true, slug: true }
            },
            tags: {
              include: {
                tag: {
                  select: { id: true, name: true, slug: true }
                }
              }
            },
            _count: {
              select: { comments: true, views: true }
            }
          },
          orderBy,
          skip: type === 'posts' ? offset : 0,
          take: type === 'posts' ? limit : 10
        })
      }

      // Search users
      if (type === 'users' || type === 'all') {
        users = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { bio: { contains: query, mode: 'insensitive' } }
            ],
            isActive: true
          },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            role: true,
            _count: {
              select: { posts: true, comments: true }
            }
          },
          skip: type === 'users' ? offset : 0,
          take: type === 'users' ? limit : 5
        })
      }

      // Search categories
      if (type === 'categories' || type === 'all') {
        categories = await prisma.category.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          },
          include: {
            _count: {
              select: { posts: true }
            }
          },
          skip: type === 'categories' ? offset : 0,
          take: type === 'categories' ? limit : 5
        })
      }

      // Search tags
      if (type === 'tags' || type === 'all') {
        tags = await prisma.tag.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' }
          },
          include: {
            _count: {
              select: { posts: true }
            }
          },
          skip: type === 'tags' ? offset : 0,
          take: type === 'tags' ? limit : 5
        })
      }

      // Get total counts
      const totalCounts = await this.getTotalCounts(options)
      const total = totalCounts.posts + totalCounts.users + totalCounts.categories + totalCounts.tags

      // Get facets
      const facets = await this.getSearchFacets(query, {
        authorId,
        categoryId,
        tagIds,
        dateFrom,
        dateTo,
        includeUnpublished
      })

      // Get suggestions and trending
      const [suggestions, trending] = await Promise.all([
        this.getSearchSuggestions(query),
        this.getTrendingSearches()
      ])

      const result: SearchResult = {
        posts,
        users,
        categories,
        tags,
        total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          totalItems: total
        },
        facets,
        suggestions,
        trending
      }

      // Record search query and cache results
      await Promise.all([
        this.recordSearchQuery(query, userId),
        this.cacheSearchResults(cacheKey, result)
      ])

      return result
    } catch (error) {
      logger.error('Search failed:', error)
      throw new Error('Search operation failed')
    }
  }

  async autocomplete(query: string, limit: number = 10): Promise<AutocompleteResult> {
    const cacheKey = `autocomplete:${query}:${limit}`
    
    try {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      logger.warn('Failed to get autocomplete from cache:', error)
    }

    try {
      const [suggestions, posts, users, categories, tags] = await Promise.all([
        this.getQuerySuggestions(query, limit),
        
        prisma.post.findMany({
          where: {
            title: { contains: query, mode: 'insensitive' },
            status: 'PUBLISHED'
          },
          select: { id: true, title: true },
          take: Math.floor(limit / 4)
        }),

        prisma.user.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' },
            isActive: true
          },
          select: { id: true, name: true },
          take: Math.floor(limit / 4)
        }),

        prisma.category.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' }
          },
          select: { id: true, name: true },
          take: Math.floor(limit / 4)
        }),

        prisma.tag.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' }
          },
          select: { id: true, name: true },
          take: Math.floor(limit / 4)
        })
      ])

      const result: AutocompleteResult = {
        suggestions,
        entities: {
          posts: posts.map(p => ({ ...p, type: 'post' as const })),
          users: users.map(u => ({ ...u, type: 'user' as const })),
          categories: categories.map(c => ({ ...c, type: 'category' as const })),
          tags: tags.map(t => ({ ...t, type: 'tag' as const }))
        }
      }

      // Cache for shorter time (2 minutes for autocomplete)
      try {
        await redisClient.setex(cacheKey, 120, JSON.stringify(result))
      } catch (error) {
        logger.warn('Failed to cache autocomplete results:', error)
      }

      return result
    } catch (error) {
      logger.error('Autocomplete failed:', error)
      throw new Error('Autocomplete operation failed')
    }
  }

  async getPopularSearches(limit: number = 10): Promise<string[]> {
    const cacheKey = 'popular_searches'
    
    try {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      logger.warn('Failed to get popular searches from cache:', error)
    }

    try {
      // This would typically come from a search analytics table
      // For now, we'll return some predefined popular searches
      const popularSearches = [
        'javascript',
        'react',
        'nodejs',
        'typescript',
        'api',
        'database',
        'frontend',
        'backend',
        'tutorial',
        'guide'
      ]

      try {
        await redisClient.setex(cacheKey, this.POPULAR_SEARCHES_TTL, JSON.stringify(popularSearches))
      } catch (error) {
        logger.warn('Failed to cache popular searches:', error)
      }

      return popularSearches.slice(0, limit)
    } catch (error) {
      logger.error('Failed to get popular searches:', error)
      return []
    }
  }

  async getTrendingSearches(limit: number = 5): Promise<string[]> {
    const cacheKey = 'trending_searches'
    
    try {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      logger.warn('Failed to get trending searches from cache:', error)
    }

    // This would analyze recent search patterns
    const trending = ['ai', 'machine learning', 'docker', 'kubernetes', 'microservices']
    
    try {
      await redisClient.setex(cacheKey, this.TRENDING_TTL, JSON.stringify(trending))
    } catch (error) {
      logger.warn('Failed to cache trending searches:', error)
    }

    return trending.slice(0, limit)
  }

  async generateSEOData(type: 'post' | 'category' | 'tag' | 'search', id?: string, query?: string): Promise<SEOData> {
    try {
      switch (type) {
        case 'post':
          if (!id) throw new Error('Post ID required for SEO data')
          return this.generatePostSEO(id)
          
        case 'category':
          if (!id) throw new Error('Category ID required for SEO data')
          return this.generateCategorySEO(id)
          
        case 'tag':
          if (!id) throw new Error('Tag ID required for SEO data')
          return this.generateTagSEO(id)
          
        case 'search':
          if (!query) throw new Error('Search query required for SEO data')
          return this.generateSearchSEO(query)
          
        default:
          throw new Error('Invalid SEO type')
      }
    } catch (error) {
      logger.error('Failed to generate SEO data:', error)
      throw new Error('SEO data generation failed')
    }
  }

  async getRelatedContent(postId: string, limit: number = 5): Promise<any[]> {
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          category: true,
          tags: { include: { tag: true } }
        }
      })

      if (!post) {
        return []
      }

      const tagIds = post.tags.map(pt => pt.tag.id)

      const relatedPosts = await prisma.post.findMany({
        where: {
          id: { not: postId },
          status: 'PUBLISHED',
          OR: [
            { categoryId: post.categoryId },
            {
              tags: {
                some: {
                  tagId: { in: tagIds }
                }
              }
            }
          ]
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true }
          },
          category: {
            select: { id: true, name: true, slug: true }
          },
          _count: {
            select: { comments: true, views: true }
          }
        },
        orderBy: {
          publishedAt: 'desc'
        },
        take: limit
      })

      return relatedPosts
    } catch (error) {
      logger.error('Failed to get related content:', error)
      return []
    }
  }

  async indexContent(type: 'post' | 'user' | 'category' | 'tag', id: string): Promise<void> {
    // In a real implementation, this would update a search index (Elasticsearch, Algolia, etc.)
    try {
      logger.info(`Indexing ${type} with ID: ${id}`)
      
      // Update search cache invalidation
      const patterns = [
        `search:*`,
        `autocomplete:*`,
        `popular_searches`,
        `trending_searches`
      ]

      for (const pattern of patterns) {
        try {
          const keys = await redisClient.keys(pattern)
          if (keys.length > 0) {
            await redisClient.del(...keys)
          }
        } catch (error) {
          logger.warn(`Failed to clear cache pattern ${pattern}:`, error)
        }
      }
    } catch (error) {
      logger.error('Failed to index content:', error)
    }
  }

  // Helper methods
  private getPostOrderBy(sortBy: string, sortOrder: string): any {
    const order = sortOrder === 'asc' ? 'asc' : 'desc'
    
    switch (sortBy) {
      case 'date':
        return { publishedAt: order }
      case 'views':
        return { views: { _count: order } }
      case 'comments':
        return { comments: { _count: order } }
      case 'relevance':
      default:
        return { publishedAt: 'desc' } // Default to newest first for relevance
    }
  }

  private async getTotalCounts(options: SearchOptions): Promise<any> {
    // Simplified count query - in production, this would be optimized
    return {
      posts: 0, // Would implement actual counting logic
      users: 0,
      categories: 0,
      tags: 0
    }
  }

  private async getSearchFacets(query: string, filters: any): Promise<any> {
    // This would aggregate data for faceted search
    return {
      categories: [],
      tags: [],
      authors: [],
      dateRanges: []
    }
  }

  private async getSearchSuggestions(query: string): Promise<string[]> {
    // This would use search analytics and NLP to suggest better queries
    return []
  }

  private async getQuerySuggestions(query: string, limit: number): Promise<string[]> {
    // This would return autocomplete suggestions based on popular searches
    const popular = await this.getPopularSearches(20)
    return popular
      .filter(term => term.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)
  }

  private async recordSearchQuery(query: string, userId?: string): Promise<void> {
    try {
      // In production, this would record to an analytics table
      logger.info(`Search query: "${query}" by user: ${userId || 'anonymous'}`)
    } catch (error) {
      logger.warn('Failed to record search query:', error)
    }
  }

  private async cacheSearchResults(cacheKey: string, result: SearchResult): Promise<void> {
    try {
      await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result))
    } catch (error) {
      logger.warn('Failed to cache search results:', error)
    }
  }

  private async generatePostSEO(postId: string): Promise<SEOData> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { name: true } },
        category: { select: { name: true } },
        tags: { include: { tag: { select: { name: true } } } }
      }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    const keywords = [
      post.category?.name,
      ...post.tags.map(pt => pt.tag.name)
    ].filter(Boolean) as string[]

    return {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || '',
      keywords,
      canonical: `/posts/${post.slug}`,
      openGraph: {
        title: post.title,
        description: post.excerpt || '',
        image: post.featuredImage || undefined,
        type: 'article'
      },
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        author: {
          '@type': 'Person',
          name: post.author.name
        },
        datePublished: post.publishedAt?.toISOString(),
        dateModified: post.updatedAt.toISOString()
      }
    }
  }

  private async generateCategorySEO(categoryId: string): Promise<SEOData> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: { select: { posts: true } }
      }
    })

    if (!category) {
      throw new Error('Category not found')
    }

    return {
      title: `${category.name} - Articles and Tutorials`,
      description: category.description || `Browse ${category._count.posts} articles in ${category.name}`,
      keywords: [category.name],
      canonical: `/categories/${category.slug}`,
      openGraph: {
        title: category.name,
        description: category.description || '',
        type: 'website'
      },
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category.name,
        description: category.description
      }
    }
  }

  private async generateTagSEO(tagId: string): Promise<SEOData> {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        _count: { select: { posts: true } }
      }
    })

    if (!tag) {
      throw new Error('Tag not found')
    }

    return {
      title: `${tag.name} - Related Articles`,
      description: `Explore ${tag._count.posts} articles tagged with ${tag.name}`,
      keywords: [tag.name],
      canonical: `/tags/${tag.slug}`,
      openGraph: {
        title: tag.name,
        description: `Articles tagged with ${tag.name}`,
        type: 'website'
      },
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: tag.name
      }
    }
  }

  private async generateSearchSEO(query: string): Promise<SEOData> {
    return {
      title: `Search Results for "${query}"`,
      description: `Find articles, tutorials, and resources related to ${query}`,
      keywords: [query],
      canonical: `/search?q=${encodeURIComponent(query)}`,
      openGraph: {
        title: `Search: ${query}`,
        description: `Search results for ${query}`,
        type: 'website'
      },
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SearchResultsPage',
        query: query
      }
    }
  }
}

export const searchService = new SearchService() 