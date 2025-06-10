import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { ApiResponse, ValidationError } from '@/types/api'
import { UserRole, PostStatus, MediaType, CommentStatus } from '@prisma/client'

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const errors: ValidationError[] = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }))

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Please check your input and try again',
        errors,
      } as ApiResponse)
    }

    // Replace the original request data with validated data
    req[property] = value
    next()
  }
}

// Common validation schemas
export const commonSchemas = {
  id: Joi.string().min(1).required(),
  optionalId: Joi.string().min(1).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).min(1).max(255),
  url: Joi.string().uri().optional(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  dateString: Joi.string().isoDate().optional(),
}

// Authentication schemas
export const authSchemas = {
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().min(1).required(),
  }),

  register: Joi.object({
    email: commonSchemas.email,
    username: commonSchemas.username,
    password: commonSchemas.password,
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email,
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: commonSchemas.password,
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password,
  }),
}

// User schemas
export const userSchemas = {
  create: Joi.object({
    email: commonSchemas.email,
    username: commonSchemas.username,
    password: commonSchemas.password,
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    role: Joi.string().valid(...Object.values(UserRole)).optional(),
    bio: Joi.string().max(500).optional(),
  }),

  update: Joi.object({
    email: Joi.string().email().optional(),
    username: Joi.string().alphanum().min(3).max(30).optional(),
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    role: Joi.string().valid(...Object.values(UserRole)).optional(),
    bio: Joi.string().max(500).optional(),
    isActive: Joi.boolean().optional(),
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().min(1).optional(),
    role: Joi.string().valid(...Object.values(UserRole)).optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'email', 'username').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
}

// Post schemas
export const postSchemas = {
  create: Joi.object({
    title: Joi.string().min(1).max(255).required(),
    content: Joi.string().min(1).required(),
    excerpt: Joi.string().max(500).optional(),
    status: Joi.string().valid(...Object.values(PostStatus)).default('DRAFT'),
    categoryId: commonSchemas.optionalId,
    tagIds: Joi.array().items(Joi.string()).optional(),
    featuredImage: Joi.string().uri().optional(),
    metaTitle: Joi.string().max(255).optional(),
    metaDescription: Joi.string().max(500).optional(),
    ogImage: Joi.string().uri().optional(),
    publishedAt: commonSchemas.dateString,
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(255).optional(),
    content: Joi.string().min(1).optional(),
    excerpt: Joi.string().max(500).optional(),
    status: Joi.string().valid(...Object.values(PostStatus)).optional(),
    categoryId: commonSchemas.optionalId,
    tagIds: Joi.array().items(Joi.string()).optional(),
    featuredImage: Joi.string().uri().optional(),
    metaTitle: Joi.string().max(255).optional(),
    metaDescription: Joi.string().max(500).optional(),
    ogImage: Joi.string().uri().optional(),
    publishedAt: commonSchemas.dateString,
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().min(1).optional(),
    status: Joi.string().valid(...Object.values(PostStatus)).optional(),
    categoryId: Joi.string().optional(),
    authorId: Joi.string().optional(),
    tagIds: Joi.array().items(Joi.string()).optional(),
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'publishedAt', 'title', 'viewCount').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    include: Joi.array().items(Joi.string().valid('author', 'category', 'tags', 'media', 'comments')).optional(),
  }),
}

// Category schemas
export const categorySchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    color: commonSchemas.color,
    parentId: commonSchemas.optionalId,
    sortOrder: Joi.number().integer().min(0).default(0),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    color: commonSchemas.color,
    parentId: commonSchemas.optionalId,
    sortOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().min(1).optional(),
    parentId: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'sortOrder').default('sortOrder'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),
}

// Tag schemas
export const tagSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    color: commonSchemas.color,
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    color: commonSchemas.color,
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().min(1).optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),
}

// Media schemas
export const mediaSchemas = {
  upload: Joi.object({
    alt: Joi.string().max(255).optional(),
    caption: Joi.string().max(500).optional(),
  }),

  update: Joi.object({
    alt: Joi.string().max(255).optional(),
    caption: Joi.string().max(500).optional(),
    isPublic: Joi.boolean().optional(),
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().min(1).optional(),
    type: Joi.string().valid(...Object.values(MediaType)).optional(),
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'filename', 'size').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
}

// Comment schemas
export const commentSchemas = {
  create: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    author: Joi.string().min(1).max(100).required(),
    email: commonSchemas.email,
    website: commonSchemas.url,
    postId: commonSchemas.id,
    parentId: commonSchemas.optionalId,
  }),

  update: Joi.object({
    content: Joi.string().min(1).max(2000).optional(),
    status: Joi.string().valid(...Object.values(CommentStatus)).optional(),
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().min(1).optional(),
    status: Joi.string().valid(...Object.values(CommentStatus)).optional(),
    postId: Joi.string().optional(),
    startDate: commonSchemas.dateString,
    endDate: commonSchemas.dateString,
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'author').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
}

// Search schemas
export const searchSchemas = {
  search: Joi.object({
    query: Joi.string().min(1).required(),
    type: Joi.string().valid('posts', 'users', 'media', 'all').default('all'),
    filters: Joi.object().optional(),
  }),
}

// Bulk action schemas
export const bulkSchemas = {
  action: Joi.object({
    ids: Joi.array().items(Joi.string()).min(1).required(),
    action: Joi.string().valid('delete', 'publish', 'unpublish', 'archive', 'approve', 'reject').required(),
    data: Joi.object().optional(),
  }),
}

// Social media schemas
export const socialSchemas = {
  post: Joi.object({
    platform: Joi.string().valid('twitter', 'facebook', 'linkedin').required(),
    content: Joi.string().min(1).max(280).required(),
    scheduledAt: commonSchemas.dateString,
    postId: commonSchemas.id,
  }),
}

// Settings schemas
export const settingsSchemas = {
  site: Joi.object({
    siteName: Joi.string().min(1).max(100).required(),
    siteDescription: Joi.string().max(500).required(),
    siteUrl: Joi.string().uri().required(),
    logo: Joi.string().uri().optional(),
    favicon: Joi.string().uri().optional(),
    socialMedia: Joi.object({
      twitter: Joi.string().optional(),
      facebook: Joi.string().optional(),
      linkedin: Joi.string().optional(),
      instagram: Joi.string().optional(),
    }).optional(),
    seo: Joi.object({
      metaTitle: Joi.string().max(255).optional(),
      metaDescription: Joi.string().max(500).optional(),
      ogImage: Joi.string().uri().optional(),
    }).optional(),
    email: Joi.object({
      fromName: Joi.string().min(1).max(100).required(),
      fromEmail: commonSchemas.email,
    }).required(),
  }),
}

// Parameter validation schemas
export const paramSchemas = {
  id: Joi.object({
    id: commonSchemas.id,
  }),
  
  slug: Joi.object({
    slug: commonSchemas.slug.required(),
  }),
} 