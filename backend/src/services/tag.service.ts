import { prisma } from '@/config/database'
import { redis } from '@/config/database'
import slugify from 'slugify'
import { 
  CreateTagRequest, 
  UpdateTagRequest, 
  TagResponse,
  TagWithStats,
  TagCloudItem 
} from '@/types/api'

export class TagService {
  
  // Create new tag
  static async createTag(data: CreateTagRequest): Promise<TagResponse> {
    const { name, description, color } = data
    
    // Generate unique slug
    let slug = slugify(name, { lower: true, strict: true })
    const existingTag = await prisma.tag.findUnique({ where: { slug } })
    if (existingTag) {
      slug = `${slug}-${Date.now()}`
    }
    
    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        description,
        color,
      },
      include: {
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    })
    
    // Clear cache
    await this.clearTagCache()
    
    return tag
  }
  
  // Get all tags
  static async getTags(): Promise<TagResponse[]> {
    const cacheKey = 'tags:all'
    
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.warn('Redis cache miss for tags:', error)
    }
    
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    })
    
    // Cache for 1 hour
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(tags))
    } catch (error) {
      console.warn('Failed to cache tags:', error)
    }
    
    return tags
  }
  
  // Get single tag by ID or slug
  static async getTag(identifier: string): Promise<TagResponse> {
    // Check if identifier is a UUID (ID) or slug
    const isId = identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    
    const tag = await prisma.tag.findUnique({
      where: isId ? { id: identifier } : { slug: identifier },
      include: {
        posts: {
          where: { status: 'PUBLISHED' },
          take: 10,
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
            _count: {
              select: {
                comments: {
                  where: { status: 'APPROVED' }
                }
              }
            }
          }
        },
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    })
    
    if (!tag) {
      throw new Error('Tag not found')
    }
    
    return tag
  }
  
  // Update tag
  static async updateTag(tagId: string, data: UpdateTagRequest): Promise<TagResponse> {
    const { name, description, color } = data
    
    const existingTag = await prisma.tag.findUnique({
      where: { id: tagId }
    })
    
    if (!existingTag) {
      throw new Error('Tag not found')
    }
    
    // Handle slug update if name changed
    let slug = existingTag.slug
    if (name && name !== existingTag.name) {
      slug = slugify(name, { lower: true, strict: true })
      const existingSlug = await prisma.tag.findFirst({
        where: { slug, id: { not: tagId } }
      })
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`
      }
    }
    
    const updateData: any = {
      ...(name && { name }),
      ...(slug && { slug }),
      ...(description !== undefined && { description }),
      ...(color && { color }),
      updatedAt: new Date(),
    }
    
    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: updateData,
      include: {
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    })
    
    // Clear cache
    await this.clearTagCache()
    
    return tag
  }
  
  // Delete tag
  static async deleteTag(tagId: string): Promise<void> {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        posts: true
      }
    })
    
    if (!tag) {
      throw new Error('Tag not found')
    }
    
    // Check if tag has posts
    if (tag.posts.length > 0) {
      throw new Error('Cannot delete tag with posts. Please remove the tag from posts first.')
    }
    
    await prisma.tag.delete({
      where: { id: tagId }
    })
    
    // Clear cache
    await this.clearTagCache()
  }
  
  // Get tags with statistics
  static async getTagsWithStats(): Promise<TagWithStats[]> {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      }
    })
    
    // Get additional statistics
    const tagsWithStats = await Promise.all(
      tags.map(async (tag) => {
        const [publishedPosts, draftPosts, totalViews] = await Promise.all([
          prisma.post.count({
            where: {
              tags: { some: { id: tag.id } },
              status: 'PUBLISHED'
            }
          }),
          prisma.post.count({
            where: {
              tags: { some: { id: tag.id } },
              status: 'DRAFT'
            }
          }),
          prisma.post.aggregate({
            where: {
              tags: { some: { id: tag.id } },
              status: 'PUBLISHED'
            },
            _sum: { viewCount: true }
          })
        ])
        
        return {
          ...tag,
          stats: {
            totalPosts: tag._count.posts,
            publishedPosts,
            draftPosts,
            totalViews: totalViews._sum.viewCount || 0
          }
        }
      })
    )
    
    return tagsWithStats
  }
  
  // Get popular tags
  static async getPopularTags(limit = 20): Promise<TagResponse[]> {
    const tags = await prisma.tag.findMany({
      take: limit,
      orderBy: {
        posts: {
          _count: 'desc'
        }
      },
      include: {
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    })
    
    return tags
  }
  
  // Get tag cloud data
  static async getTagCloud(limit = 50): Promise<TagCloudItem[]> {
    const cacheKey = `tag_cloud:${limit}`
    
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.warn('Redis cache miss for tag cloud:', error)
    }
    
    const tags = await prisma.tag.findMany({
      take: limit,
      orderBy: {
        posts: {
          _count: 'desc'
        }
      },
      include: {
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    })
    
    // Calculate weights for tag cloud
    const maxCount = Math.max(...tags.map(tag => tag._count.posts))
    const minCount = Math.min(...tags.map(tag => tag._count.posts))
    const countRange = maxCount - minCount || 1
    
    const tagCloud = tags.map(tag => {
      // Calculate weight (0-1 scale)
      const weight = (tag._count.posts - minCount) / countRange
      
      // Convert to size categories (1-5)
      const size = Math.ceil(weight * 5) || 1
      
      return {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
        count: tag._count.posts,
        weight,
        size
      }
    })
    
    // Cache for 2 hours
    try {
      await redis.setex(cacheKey, 7200, JSON.stringify(tagCloud))
    } catch (error) {
      console.warn('Failed to cache tag cloud:', error)
    }
    
    return tagCloud
  }
  
  // Search tags by name
  static async searchTags(query: string, limit = 10): Promise<TagResponse[]> {
    const tags = await prisma.tag.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      take: limit,
      orderBy: [
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    })
    
    return tags
  }
  
  // Get related tags based on co-occurrence in posts
  static async getRelatedTags(tagId: string, limit = 10): Promise<TagResponse[]> {
    // Find posts that have this tag
    const postsWithTag = await prisma.post.findMany({
      where: {
        tags: { some: { id: tagId } },
        status: 'PUBLISHED'
      },
      select: { id: true }
    })
    
    const postIds = postsWithTag.map(post => post.id)
    
    if (postIds.length === 0) {
      return []
    }
    
    // Find other tags that appear in the same posts
    const relatedTags = await prisma.tag.findMany({
      where: {
        id: { not: tagId }, // Exclude the original tag
        posts: {
          some: {
            id: { in: postIds }
          }
        }
      },
      take: limit,
      orderBy: {
        posts: {
          _count: 'desc'
        }
      },
      include: {
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    })
    
    return relatedTags
  }
  
  // Merge tags (combine two tags into one)
  static async mergeTags(sourceTagId: string, targetTagId: string): Promise<TagResponse> {
    const [sourceTag, targetTag] = await Promise.all([
      prisma.tag.findUnique({ where: { id: sourceTagId }, include: { posts: true } }),
      prisma.tag.findUnique({ where: { id: targetTagId } })
    ])
    
    if (!sourceTag || !targetTag) {
      throw new Error('One or both tags not found')
    }
    
    if (sourceTagId === targetTagId) {
      throw new Error('Cannot merge tag with itself')
    }
    
    // Move all posts from source tag to target tag
    await prisma.$transaction(async (tx) => {
      // For each post that has the source tag, add the target tag if not already present
      for (const post of sourceTag.posts) {
        await tx.post.update({
          where: { id: post.id },
          data: {
            tags: {
              connect: { id: targetTagId },
              disconnect: { id: sourceTagId }
            }
          }
        })
      }
      
      // Delete the source tag
      await tx.tag.delete({ where: { id: sourceTagId } })
    })
    
    // Get updated target tag
    const updatedTag = await prisma.tag.findUnique({
      where: { id: targetTagId },
      include: {
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    })
    
    // Clear cache
    await this.clearTagCache()
    
    return updatedTag!
  }
  
  // Get unused tags (tags with no posts)
  static async getUnusedTags(): Promise<TagResponse[]> {
    const tags = await prisma.tag.findMany({
      where: {
        posts: {
          none: {}
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      }
    })
    
    return tags
  }
  
  // Bulk delete unused tags
  static async deleteUnusedTags(): Promise<number> {
    const unusedTags = await this.getUnusedTags()
    const unusedTagIds = unusedTags.map(tag => tag.id)
    
    if (unusedTagIds.length === 0) {
      return 0
    }
    
    const result = await prisma.tag.deleteMany({
      where: {
        id: { in: unusedTagIds }
      }
    })
    
    // Clear cache
    await this.clearTagCache()
    
    return result.count
  }
  
  // Clear tag cache
  private static async clearTagCache(): Promise<void> {
    try {
      const keys = await redis.keys('tags:*')
      const tagCloudKeys = await redis.keys('tag_cloud:*')
      const allKeys = [...keys, ...tagCloudKeys]
      if (allKeys.length > 0) {
        await redis.del(...allKeys)
      }
    } catch (error) {
      console.warn('Failed to clear tag cache:', error)
    }
  }
  
  // Get tag statistics
  static async getTagStats() {
    const [
      totalTags,
      tagsWithPosts,
      unusedTags,
      avgTagsPerPost,
      maxTagsPerPost
    ] = await Promise.all([
      prisma.tag.count(),
      prisma.tag.count({
        where: {
          posts: {
            some: { status: 'PUBLISHED' }
          }
        }
      }),
      prisma.tag.count({
        where: {
          posts: {
            none: {}
          }
        }
      }),
      prisma.post.aggregate({
        where: { status: 'PUBLISHED' },
        _avg: {
          tags: {
            _count: true
          }
        }
      }).then(result => result._avg || 0),
      prisma.post.findFirst({
        where: { status: 'PUBLISHED' },
        orderBy: {
          tags: {
            _count: 'desc'
          }
        },
        include: {
          _count: {
            select: { tags: true }
          }
        }
      }).then(result => result?._count.tags || 0)
    ])
    
    return {
      totalTags,
      tagsWithPosts,
      unusedTags,
      avgTagsPerPost: Number(avgTagsPerPost) || 0,
      maxTagsPerPost
    }
  }
} 