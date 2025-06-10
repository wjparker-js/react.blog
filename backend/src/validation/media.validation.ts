import { z } from 'zod'

// Media file upload validation
export const mediaUploadSchema = z.object({
  alt: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  generateThumbnails: z.boolean().optional().default(true),
  quality: z.number().min(1).max(100).optional().default(85)
})

// Media list query validation
export const mediaListQuerySchema = z.object({
  search: z.string().min(1).max(100).optional(),
  type: z.enum(['image', 'video', 'document']).optional(),
  mimeType: z.string().max(50).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'size', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Media update validation
export const mediaUpdateSchema = z.object({
  alt: z.string().max(255).optional(),
  description: z.string().max(1000).optional()
})

// Thumbnail generation validation
export const thumbnailSchema = z.object({
  width: z.number().min(10).max(2000),
  height: z.number().min(10).max(2000),
  quality: z.number().min(1).max(100).optional().default(85),
  format: z.enum(['jpeg', 'png', 'webp']).optional().default('jpeg')
})

// Bulk operations validation
export const bulkMediaActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['delete']),
  confirm: z.boolean().default(false)
})

export type MediaUploadData = z.infer<typeof mediaUploadSchema>
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>
export type MediaUpdateData = z.infer<typeof mediaUpdateSchema>
export type ThumbnailData = z.infer<typeof thumbnailSchema>
export type BulkMediaAction = z.infer<typeof bulkMediaActionSchema> 