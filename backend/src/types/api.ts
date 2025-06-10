import { User, Post, Category, Tag, Media, Comment, UserRole, PostStatus, MediaType, CommentStatus } from '@prisma/client'

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  errors?: ValidationError[]
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ValidationError {
  field: string
  message: string
}

// Authentication Types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  firstName?: string
  lastName?: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface AuthResponse {
  user: UserProfile
  token: string
  refreshToken: string
  expiresIn: number
}

export interface UserProfile {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  role: UserRole
  avatar?: string
  bio?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Post Types
export interface CreatePostRequest {
  title: string
  content: string
  excerpt?: string
  status?: PostStatus
  categoryId?: string
  tagIds?: string[]
  featuredImage?: string
  metaTitle?: string
  metaDescription?: string
  ogImage?: string
  publishedAt?: Date
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  id: string
}

export interface PostWithRelations extends Post {
  author: UserProfile
  category?: Category
  tags: Tag[]
  media: Media[]
  _count: {
    comments: number
  }
}

export interface PostFilters {
  status?: PostStatus
  categoryId?: string
  authorId?: string
  tagIds?: string[]
  search?: string
  startDate?: Date
  endDate?: Date
}

export interface PostQueryParams extends PostFilters {
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title' | 'viewCount'
  sortOrder?: 'asc' | 'desc'
  include?: ('author' | 'category' | 'tags' | 'media' | 'comments')[]
}

// Category Types
export interface CreateCategoryRequest {
  name: string
  description?: string
  color?: string
  parentId?: string
  sortOrder?: number
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string
}

export interface CategoryWithHierarchy extends Category {
  parent?: Category
  children: Category[]
  _count: {
    posts: number
  }
}

// Tag Types
export interface CreateTagRequest {
  name: string
  color?: string
}

export interface UpdateTagRequest extends Partial<CreateTagRequest> {
  id: string
}

export interface TagWithCount extends Tag {
  _count: {
    posts: number
  }
}

// Media Types
export interface UploadMediaRequest {
  files: Express.Multer.File[]
  alt?: string
  caption?: string
}

export interface MediaWithVariants extends Media {
  variants: {
    size: string
    width: number
    height: number
    url: string
  }[]
}

export interface MediaFilters {
  type?: MediaType
  search?: string
  startDate?: Date
  endDate?: Date
}

export interface MediaQueryParams extends MediaFilters {
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'filename' | 'size'
  sortOrder?: 'asc' | 'desc'
}

// Comment Types
export interface CreateCommentRequest {
  content: string
  author: string
  email: string
  website?: string
  postId: string
  parentId?: string
}

export interface UpdateCommentRequest {
  id: string
  content?: string
  status?: CommentStatus
}

export interface CommentWithReplies extends Comment {
  post: Pick<Post, 'id' | 'title'>
  parent?: Comment
  replies: Comment[]
}

export interface CommentFilters {
  status?: CommentStatus
  postId?: string
  search?: string
  startDate?: Date
  endDate?: Date
}

export interface CommentQueryParams extends CommentFilters {
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'author'
  sortOrder?: 'asc' | 'desc'
}

// User Types
export interface CreateUserRequest {
  email: string
  username: string
  password: string
  firstName?: string
  lastName?: string
  role?: UserRole
  bio?: string
}

export interface UpdateUserRequest {
  id: string
  email?: string
  username?: string
  firstName?: string
  lastName?: string
  role?: UserRole
  bio?: string
  isActive?: boolean
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface ForgotPasswordRequest {
  email: string
}

// Dashboard Analytics Types
export interface DashboardStats {
  posts: {
    total: number
    published: number
    draft: number
    thisMonth: number
  }
  users: {
    total: number
    active: number
    thisMonth: number
  }
  comments: {
    total: number
    pending: number
    approved: number
    thisMonth: number
  }
  media: {
    total: number
    totalSize: number
    thisMonth: number
  }
}

export interface AnalyticsData {
  pageViews: {
    date: string
    views: number
  }[]
  topPosts: {
    id: string
    title: string
    views: number
  }[]
  topCategories: {
    id: string
    name: string
    postCount: number
  }[]
}

// Search Types
export interface SearchRequest {
  query: string
  type?: 'posts' | 'users' | 'media' | 'all'
  filters?: Record<string, any>
}

export interface SearchResult {
  type: string
  id: string
  title: string
  excerpt?: string
  url: string
  metadata?: Record<string, any>
}

// Bulk Operations
export interface BulkActionRequest {
  ids: string[]
  action: 'delete' | 'publish' | 'unpublish' | 'archive' | 'approve' | 'reject'
  data?: Record<string, any>
}

export interface BulkActionResponse {
  successful: string[]
  failed: {
    id: string
    error: string
  }[]
}

// Social Media Types
export interface SocialMediaPost {
  platform: 'twitter' | 'facebook' | 'linkedin'
  content: string
  scheduledAt?: Date
  postId: string
}

export interface SocialMediaResponse {
  id: string
  platform: string
  socialId?: string
  status: 'pending' | 'scheduled' | 'published' | 'failed'
  publishedAt?: Date
  error?: string
}

// Settings Types
export interface SiteSettings {
  siteName: string
  siteDescription: string
  siteUrl: string
  logo?: string
  favicon?: string
  socialMedia: {
    twitter?: string
    facebook?: string
    linkedin?: string
    instagram?: string
  }
  seo: {
    metaTitle?: string
    metaDescription?: string
    ogImage?: string
  }
  email: {
    fromName: string
    fromEmail: string
  }
}

// Activity Log Types
export interface ActivityLogEntry {
  id: string
  action: string
  entity: string
  entityId?: string
  userId?: string
  userEmail?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
} 