import { z } from 'zod'
import { PostStatus } from '@prisma/client'

// Search query validation
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['posts', 'users', 'categories', 'tags', 'all']).default('all'),
  status: z.nativeEnum(PostStatus).optional(),
  authorId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['relevance', 'date', 'views', 'comments']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  includeUnpublished: z.boolean().default(false)
})

// Autocomplete query validation
export const autocompleteQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(20).default(10),
  types: z.array(z.enum(['posts', 'users', 'categories', 'tags'])).optional()
})

// Advanced search validation
export const advancedSearchSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(500).optional(),
  author: z.string().max(100).optional(),
  category: z.string().uuid().optional(),
  tags: z.array(z.string().uuid()).optional(),
  publishedAfter: z.string().datetime().optional(),
  publishedBefore: z.string().datetime().optional(),
  minViews: z.coerce.number().min(0).optional(),
  maxViews: z.coerce.number().min(0).optional(),
  minComments: z.coerce.number().min(0).optional(),
  maxComments: z.coerce.number().min(0).optional(),
  hasImage: z.boolean().optional(),
  wordCountMin: z.coerce.number().min(0).optional(),
  wordCountMax: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['relevance', 'date', 'views', 'comments', 'wordCount']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20)
})

// Search filters validation
export const searchFiltersSchema = z.object({
  query: z.string().min(1).max(200),
  facets: z.object({
    categories: z.array(z.string().uuid()).optional(),
    tags: z.array(z.string().uuid()).optional(),
    authors: z.array(z.string().uuid()).optional(),
    dateRanges: z.array(z.enum(['today', 'week', 'month', 'quarter', 'year'])).optional(),
    postTypes: z.array(z.enum(['article', 'tutorial', 'guide', 'news'])).optional()
  }).optional(),
  exclude: z.object({
    categories: z.array(z.string().uuid()).optional(),
    tags: z.array(z.string().uuid()).optional(),
    authors: z.array(z.string().uuid()).optional()
  }).optional()
})

// Related content query validation
export const relatedContentSchema = z.object({
  postId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(20).default(5),
  type: z.enum(['similar', 'category', 'tags', 'author']).default('similar'),
  excludeViewed: z.boolean().default(false)
})

// SEO data request validation
export const seoDataSchema = z.object({
  type: z.enum(['post', 'category', 'tag', 'search']),
  id: z.string().uuid().optional(),
  query: z.string().min(1).max(200).optional(),
  includeSchema: z.boolean().default(true),
  includeOpenGraph: z.boolean().default(true)
}).refine(data => {
  if (data.type === 'search') {
    return !!data.query
  }
  return !!data.id
}, {
  message: "Query is required for search type, ID is required for other types"
})

// Search analytics validation
export const searchAnalyticsSchema = z.object({
  timeframe: z.enum(['hour', 'day', 'week', 'month', 'year']).default('day'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metrics: z.array(z.enum(['queries', 'clicks', 'impressions', 'ctr', 'position'])).optional(),
  dimension: z.enum(['query', 'page', 'device', 'country']).optional(),
  limit: z.coerce.number().min(1).max(1000).default(100)
})

// Popular searches validation
export const popularSearchesSchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'year', 'all']).default('week'),
  limit: z.coerce.number().min(1).max(50).default(10),
  category: z.string().uuid().optional(),
  excludeEmpty: z.boolean().default(true)
})

// Search suggestions validation
export const searchSuggestionsSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(20).default(5),
  includePopular: z.boolean().default(true),
  includeTrending: z.boolean().default(true),
  language: z.string().length(2).optional() // ISO 639-1 language code
})

// Search export validation
export const searchExportSchema = z.object({
  query: z.string().min(1).max(200),
  format: z.enum(['csv', 'json', 'xml']).default('json'),
  includeMetadata: z.boolean().default(true),
  maxResults: z.coerce.number().min(1).max(10000).default(1000),
  fields: z.array(z.enum([
    'id', 'title', 'content', 'author', 'category', 'tags', 
    'publishedAt', 'views', 'comments', 'url'
  ])).optional()
})

// Saved search validation
export const savedSearchSchema = z.object({
  name: z.string().min(1).max(100),
  query: z.string().min(1).max(500),
  filters: z.record(z.any()).optional(),
  isPublic: z.boolean().default(false),
  notificationEnabled: z.boolean().default(false),
  notificationFrequency: z.enum(['immediate', 'daily', 'weekly']).optional()
})

// Search indexing validation
export const indexingSchema = z.object({
  type: z.enum(['post', 'user', 'category', 'tag']),
  id: z.string().uuid(),
  action: z.enum(['create', 'update', 'delete']),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  immediate: z.boolean().default(false)
})

export type SearchQuery = z.infer<typeof searchQuerySchema>
export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>
export type AdvancedSearch = z.infer<typeof advancedSearchSchema>
export type SearchFilters = z.infer<typeof searchFiltersSchema>
export type RelatedContent = z.infer<typeof relatedContentSchema>
export type SEOData = z.infer<typeof seoDataSchema>
export type SearchAnalytics = z.infer<typeof searchAnalyticsSchema>
export type PopularSearches = z.infer<typeof popularSearchesSchema>
export type SearchSuggestions = z.infer<typeof searchSuggestionsSchema>
export type SearchExport = z.infer<typeof searchExportSchema>
export type SavedSearch = z.infer<typeof savedSearchSchema>
export type Indexing = z.infer<typeof indexingSchema> 