import { prisma } from '@/config/database'
import { redis } from '@/config/database'
import slugify from 'slugify'
import { 
  CreateCategoryRequest, 
  UpdateCategoryRequest, 
  CategoryResponse,
  CategoryWithStats 
} from '@/types/api'

export class CategoryService {
  
  // Create new category
  static async createCategory(data: CreateCategoryRequest): Promise<CategoryResponse> {
    const { name, description, color, parentId, sortOrder } = data
    
    // Generate unique slug
    let slug = slugify(name, { lower: true, strict: true })
    const existingCategory = await prisma.category.findUnique({ where: { slug } })
    if (existingCategory) {
      slug = `${slug}-${Date.now()}`
    }
    
    // Validate parent category exists if provided
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({ where: { id: parentId } })
      if (!parentCategory) {
        throw new Error('Parent category not found')
      }
    }
    
    // Determine sort order if not provided
    let finalSortOrder = sortOrder
    if (!finalSortOrder) {
      const maxOrder = await prisma.category.aggregate({
        where: { parentId },
        _max: { sortOrder: true }
      })
      finalSortOrder = (maxOrder._max.sortOrder || 0) + 1
    }
    
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        color,
        parentId,
        sortOrder: finalSortOrder,
        isActive: true,
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
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
    
    // Clear cache
    await this.clearCategoryCache()
    
    return category
  }
  
  // Get all categories with hierarchy
  static async getCategories(includeInactive = false): Promise<CategoryResponse[]> {
    const cacheKey = `categories:${includeInactive ? 'all' : 'active'}`
    
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.warn('Redis cache miss for categories:', error)
    }
    
    const where = includeInactive ? {} : { isActive: true }
    
    const categories = await prisma.category.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
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
    
    // Cache for 1 hour
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(categories))
    } catch (error) {
      console.warn('Failed to cache categories:', error)
    }
    
    return categories
  }
  
  // Get category tree (hierarchical structure)
  static async getCategoryTree(): Promise<CategoryResponse[]> {
    const categories = await this.getCategories()
    
    // Build tree structure
    const categoryMap = new Map<string, CategoryResponse & { children: CategoryResponse[] }>()
    const rootCategories: CategoryResponse[] = []
    
    // First pass: create map of all categories
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] })
    })
    
    // Second pass: build tree structure
    categories.forEach(category => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children.push(categoryMap.get(category.id)!)
        }
      } else {
        rootCategories.push(categoryMap.get(category.id)!)
      }
    })
    
    return rootCategories
  }
  
  // Get single category by ID or slug
  static async getCategory(identifier: string): Promise<CategoryResponse> {
    // Check if identifier is a UUID (ID) or slug
    const isId = identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    
    const category = await prisma.category.findUnique({
      where: isId ? { id: identifier } : { slug: identifier },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
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
            tags: true,
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
    
    if (!category) {
      throw new Error('Category not found')
    }
    
    return category
  }
  
  // Update category
  static async updateCategory(categoryId: string, data: UpdateCategoryRequest): Promise<CategoryResponse> {
    const { name, description, color, parentId, sortOrder, isActive } = data
    
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId }
    })
    
    if (!existingCategory) {
      throw new Error('Category not found')
    }
    
    // Handle slug update if name changed
    let slug = existingCategory.slug
    if (name && name !== existingCategory.name) {
      slug = slugify(name, { lower: true, strict: true })
      const existingSlug = await prisma.category.findFirst({
        where: { slug, id: { not: categoryId } }
      })
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`
      }
    }
    
    // Validate parent category if provided
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({ where: { id: parentId } })
      if (!parentCategory) {
        throw new Error('Parent category not found')
      }
      
      // Prevent circular reference
      if (parentId === categoryId) {
        throw new Error('Category cannot be its own parent')
      }
      
      // Check if parentId would create a circular reference
      const isCircular = await this.wouldCreateCircularReference(categoryId, parentId)
      if (isCircular) {
        throw new Error('This would create a circular reference')
      }
    }
    
    const updateData: any = {
      ...(name && { name }),
      ...(slug && { slug }),
      ...(description !== undefined && { description }),
      ...(color && { color }),
      ...(parentId !== undefined && { parentId }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    }
    
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
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
    
    // Clear cache
    await this.clearCategoryCache()
    
    return category
  }
  
  // Delete category
  static async deleteCategory(categoryId: string): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        children: true,
        posts: true
      }
    })
    
    if (!category) {
      throw new Error('Category not found')
    }
    
    // Check if category has children
    if (category.children.length > 0) {
      throw new Error('Cannot delete category with child categories. Please move or delete child categories first.')
    }
    
    // Check if category has posts
    if (category.posts.length > 0) {
      throw new Error('Cannot delete category with posts. Please move posts to another category first.')
    }
    
    await prisma.category.delete({
      where: { id: categoryId }
    })
    
    // Clear cache
    await this.clearCategoryCache()
  }
  
  // Reorder categories
  static async reorderCategories(parentId: string | null, categoryIds: string[]): Promise<void> {
    // Verify all categories belong to the same parent
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        parentId
      }
    })
    
    if (categories.length !== categoryIds.length) {
      throw new Error('Invalid category IDs or mismatched parent')
    }
    
    // Update sort orders
    const updates = categoryIds.map((categoryId, index) => 
      prisma.category.update({
        where: { id: categoryId },
        data: { sortOrder: index + 1 }
      })
    )
    
    await prisma.$transaction(updates)
    
    // Clear cache
    await this.clearCategoryCache()
  }
  
  // Get categories with post statistics
  static async getCategoriesWithStats(): Promise<CategoryWithStats[]> {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: {
            posts: true
          }
        }
      }
    })
    
    // Get additional statistics
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const [publishedPosts, draftPosts, totalViews] = await Promise.all([
          prisma.post.count({
            where: { categoryId: category.id, status: 'PUBLISHED' }
          }),
          prisma.post.count({
            where: { categoryId: category.id, status: 'DRAFT' }
          }),
          prisma.post.aggregate({
            where: { categoryId: category.id, status: 'PUBLISHED' },
            _sum: { viewCount: true }
          })
        ])
        
        return {
          ...category,
          stats: {
            totalPosts: category._count.posts,
            publishedPosts,
            draftPosts,
            totalViews: totalViews._sum.viewCount || 0
          }
        }
      })
    )
    
    return categoriesWithStats
  }
  
  // Get popular categories
  static async getPopularCategories(limit = 10): Promise<CategoryResponse[]> {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      take: limit,
      orderBy: {
        posts: {
          _count: 'desc'
        }
      },
      include: {
        parent: true,
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    })
    
    return categories
  }
  
  // Check if moving a category would create circular reference
  private static async wouldCreateCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    // Get all descendants of the category being moved
    const descendants = await this.getCategoryDescendants(categoryId)
    const descendantIds = descendants.map(d => d.id)
    
    // Check if the new parent is among the descendants
    return descendantIds.includes(newParentId)
  }
  
  // Get all descendants of a category
  private static async getCategoryDescendants(categoryId: string): Promise<any[]> {
    const children = await prisma.category.findMany({
      where: { parentId: categoryId }
    })
    
    let descendants = [...children]
    
    for (const child of children) {
      const childDescendants = await this.getCategoryDescendants(child.id)
      descendants = [...descendants, ...childDescendants]
    }
    
    return descendants
  }
  
  // Clear category cache
  private static async clearCategoryCache(): Promise<void> {
    try {
      const keys = await redis.keys('categories:*')
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.warn('Failed to clear category cache:', error)
    }
  }
  
  // Get category statistics
  static async getCategoryStats() {
    const [totalCategories, activeCategories, categoriesWithPosts] = await Promise.all([
      prisma.category.count(),
      prisma.category.count({ where: { isActive: true } }),
      prisma.category.count({
        where: {
          posts: {
            some: { status: 'PUBLISHED' }
          }
        }
      })
    ])
    
    return {
      totalCategories,
      activeCategories,
      categoriesWithPosts,
      emptyCategoriesCount: activeCategories - categoriesWithPosts
    }
  }
} 