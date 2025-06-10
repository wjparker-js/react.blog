import { z } from 'zod'
import { CommentStatus } from '@prisma/client'

// Comment creation validation
export const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  isAnonymous: z.boolean().optional().default(false)
})

// Comment update validation
export const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  status: z.nativeEnum(CommentStatus).optional()
})

// Comment list query validation
export const commentListQuerySchema = z.object({
  postId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  status: z.nativeEnum(CommentStatus).optional(),
  search: z.string().min(1).max(100).optional(),
  parentId: z.string().uuid().optional(),
  includeReplies: z.boolean().optional().default(true),
  sortBy: z.enum(['createdAt', 'updatedAt', 'voteScore', 'replyCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
})

// Comment voting validation
export const voteCommentSchema = z.object({
  voteType: z.enum(['up', 'down', 'remove']),
  commentId: z.string().uuid()
})

// Bulk comment actions validation
export const bulkCommentActionSchema = z.object({
  commentIds: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['approve', 'reject', 'spam', 'delete', 'restore']),
  reason: z.string().max(500).optional(),
  confirm: z.boolean().default(false)
})

// Comment moderation validation
export const moderateCommentSchema = z.object({
  status: z.nativeEnum(CommentStatus),
  reason: z.string().max(500).optional(),
  notifyAuthor: z.boolean().optional().default(true)
})

// Comment report validation
export const reportCommentSchema = z.object({
  reason: z.enum(['spam', 'abuse', 'offensive', 'off-topic', 'other']),
  description: z.string().max(1000).optional()
})

// Comment statistics query validation
export const commentStatsQuerySchema = z.object({
  postId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  timeframe: z.enum(['day', 'week', 'month', 'year', 'all']).default('all'),
  groupBy: z.enum(['day', 'week', 'month']).optional()
})

// Comment search validation
export const searchCommentsSchema = z.object({
  query: z.string().min(1).max(200),
  postId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  status: z.nativeEnum(CommentStatus).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['relevance', 'createdAt', 'voteScore']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20)
})

// Comment thread validation
export const getCommentThreadSchema = z.object({
  maxDepth: z.coerce.number().min(1).max(10).default(5),
  sortBy: z.enum(['createdAt', 'voteScore']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export type CreateCommentData = z.infer<typeof createCommentSchema>
export type UpdateCommentData = z.infer<typeof updateCommentSchema>
export type CommentListQuery = z.infer<typeof commentListQuerySchema>
export type VoteCommentData = z.infer<typeof voteCommentSchema>
export type BulkCommentAction = z.infer<typeof bulkCommentActionSchema>
export type ModerateCommentData = z.infer<typeof moderateCommentSchema>
export type ReportCommentData = z.infer<typeof reportCommentSchema>
export type CommentStatsQuery = z.infer<typeof commentStatsQuerySchema>
export type SearchCommentsQuery = z.infer<typeof searchCommentsSchema>
export type GetCommentThreadQuery = z.infer<typeof getCommentThreadSchema> 