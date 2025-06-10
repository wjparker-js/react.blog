import { Router } from 'express'
import { authMiddleware, optionalAuthMiddleware } from '@/middleware/auth'
import { permissionMiddleware } from '@/middleware/permissions'
import { validateRequest } from '@/middleware/validation'
import { searchService } from '@/services/search.service'
import {
  searchQuerySchema,
  autocompleteQuerySchema,
  advancedSearchSchema,
  searchFiltersSchema,
  relatedContentSchema,
  seoDataSchema,
  searchAnalyticsSchema,
  popularSearchesSchema,
  searchSuggestionsSchema,
  searchExportSchema,
  savedSearchSchema,
  indexingSchema,
  type SearchQuery,
  type AutocompleteQuery,
  type AdvancedSearch,
  type SearchFilters,
  type RelatedContent,
  type SEOData,
  type SearchAnalytics,
  type PopularSearches,
  type SearchSuggestions,
  type SearchExport,
  type SavedSearch,
  type Indexing
} from '@/validation/search.validation'
import { asyncHandler } from '@/utils/asyncHandler'
import { ApiResponse } from '@/types/api'

const router = Router()

// Main search endpoint
router.get('/',
  optionalAuthMiddleware, // Allow anonymous search
  validateRequest({ query: searchQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as SearchQuery
    const userId = req.user?.id
    
    const searchOptions = {
      query: query.q,
      type: query.type,
      status: query.status,
      authorId: query.authorId,
      categoryId: query.categoryId,
      tagIds: query.tagIds,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      limit: query.limit,
      includeUnpublished: query.includeUnpublished && req.user?.role === 'ADMIN',
      userId
    }
    
    const results = await searchService.search(searchOptions)
    
    res.json({
      success: true,
      data: results,
      message: `Found ${results.total} results for "${query.q}"`
    } satisfies ApiResponse)
  })
)

// Autocomplete endpoint
router.get('/autocomplete',
  optionalAuthMiddleware,
  validateRequest({ query: autocompleteQuerySchema }),
  asyncHandler(async (req, res) => {
    const { q, limit, types } = req.query as AutocompleteQuery
    
    const suggestions = await searchService.autocomplete(q, limit)
    
    res.json({
      success: true,
      data: suggestions,
      message: 'Autocomplete suggestions retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Advanced search endpoint
router.post('/advanced',
  optionalAuthMiddleware,
  validateRequest({ body: advancedSearchSchema }),
  asyncHandler(async (req, res) => {
    const searchParams = req.body as AdvancedSearch
    const userId = req.user?.id
    
    const results = await searchService.advancedSearch(searchParams, userId)
    
    res.json({
      success: true,
      data: results,
      message: 'Advanced search completed successfully'
    } satisfies ApiResponse)
  })
)

// Search with filters endpoint
router.post('/filter',
  optionalAuthMiddleware,
  validateRequest({ body: searchFiltersSchema }),
  asyncHandler(async (req, res) => {
    const filters = req.body as SearchFilters
    const userId = req.user?.id
    
    const results = await searchService.searchWithFilters(filters, userId)
    
    res.json({
      success: true,
      data: results,
      message: 'Filtered search completed successfully'
    } satisfies ApiResponse)
  })
)

// Popular searches endpoint
router.get('/popular',
  optionalAuthMiddleware,
  validateRequest({ query: popularSearchesSchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as PopularSearches
    const popularSearches = await searchService.getPopularSearches(query.limit)
    
    res.json({
      success: true,
      data: popularSearches,
      message: 'Popular searches retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Trending searches endpoint
router.get('/trending',
  optionalAuthMiddleware,
  asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query
    const trendingSearches = await searchService.getTrendingSearches(Number(limit))
    
    res.json({
      success: true,
      data: trendingSearches,
      message: 'Trending searches retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Search suggestions endpoint
router.get('/suggestions',
  optionalAuthMiddleware,
  validateRequest({ query: searchSuggestionsSchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as SearchSuggestions
    const suggestions = await searchService.getSearchSuggestions(query)
    
    res.json({
      success: true,
      data: suggestions,
      message: 'Search suggestions retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Related content endpoint
router.get('/related',
  optionalAuthMiddleware,
  validateRequest({ query: relatedContentSchema }),
  asyncHandler(async (req, res) => {
    const { postId, limit, type, excludeViewed } = req.query as RelatedContent
    const userId = req.user?.id
    
    const relatedContent = await searchService.getRelatedContent(
      postId, 
      limit, 
      type, 
      excludeViewed ? userId : undefined
    )
    
    res.json({
      success: true,
      data: relatedContent,
      message: 'Related content retrieved successfully'
    } satisfies ApiResponse)
  })
)

// SEO data endpoint
router.get('/seo',
  optionalAuthMiddleware,
  validateRequest({ query: seoDataSchema }),
  asyncHandler(async (req, res) => {
    const { type, id, query, includeSchema, includeOpenGraph } = req.query as SEOData
    
    const seoData = await searchService.generateSEOData(
      type,
      id,
      query,
      { includeSchema, includeOpenGraph }
    )
    
    res.json({
      success: true,
      data: seoData,
      message: 'SEO data generated successfully'
    } satisfies ApiResponse)
  })
)

// Search analytics (admin only)
router.get('/analytics',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ query: searchAnalyticsSchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as SearchAnalytics
    const analytics = await searchService.getSearchAnalytics(query)
    
    res.json({
      success: true,
      data: analytics,
      message: 'Search analytics retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Export search results
router.get('/export',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator', 'author']),
  validateRequest({ query: searchExportSchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as SearchExport
    const exportData = await searchService.exportSearchResults(query, req.user.id)
    
    const fileName = `search-export-${Date.now()}.${query.format}`
    
    res.setHeader('Content-Type', getContentType(query.format))
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`)
    res.send(exportData)
  })
)

// Saved searches management
router.get('/saved',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query
    const savedSearches = await searchService.getSavedSearches(
      req.user.id,
      Number(page),
      Number(limit)
    )
    
    res.json({
      success: true,
      data: savedSearches.searches,
      pagination: savedSearches.pagination,
      message: 'Saved searches retrieved successfully'
    } satisfies ApiResponse)
  })
)

router.post('/saved',
  authMiddleware,
  validateRequest({ body: savedSearchSchema }),
  asyncHandler(async (req, res) => {
    const searchData = req.body as SavedSearch
    const savedSearch = await searchService.createSavedSearch(searchData, req.user.id)
    
    res.status(201).json({
      success: true,
      data: savedSearch,
      message: 'Search saved successfully'
    } satisfies ApiResponse)
  })
)

router.put('/saved/:id',
  authMiddleware,
  validateRequest({ body: savedSearchSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const searchData = req.body as SavedSearch
    const savedSearch = await searchService.updateSavedSearch(id, searchData, req.user.id)
    
    res.json({
      success: true,
      data: savedSearch,
      message: 'Saved search updated successfully'
    } satisfies ApiResponse)
  })
)

router.delete('/saved/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    await searchService.deleteSavedSearch(id, req.user.id)
    
    res.json({
      success: true,
      message: 'Saved search deleted successfully'
    } satisfies ApiResponse)
  })
)

// Execute saved search
router.get('/saved/:id/execute',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { page = 1, limit = 20 } = req.query
    
    const results = await searchService.executeSavedSearch(
      id,
      req.user.id,
      Number(page),
      Number(limit)
    )
    
    res.json({
      success: true,
      data: results,
      message: 'Saved search executed successfully'
    } satisfies ApiResponse)
  })
)

// Search indexing (admin only)
router.post('/index',
  authMiddleware,
  permissionMiddleware(['admin']),
  validateRequest({ body: indexingSchema }),
  asyncHandler(async (req, res) => {
    const indexData = req.body as Indexing
    await searchService.indexContent(indexData.type, indexData.id, indexData.action)
    
    res.json({
      success: true,
      message: `Content ${indexData.action} operation queued for indexing`
    } satisfies ApiResponse)
  })
)

// Reindex all content (admin only)
router.post('/reindex',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const { type, force = false } = req.body
    const result = await searchService.reindexAll(type, force)
    
    res.json({
      success: true,
      data: result,
      message: 'Reindexing operation started successfully'
    } satisfies ApiResponse)
  })
)

// Search health check (admin only)
router.get('/health',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const health = await searchService.getSearchHealth()
    
    res.json({
      success: true,
      data: health,
      message: 'Search service health retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Clear search cache (admin only)
router.delete('/cache',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const { pattern } = req.query
    const result = await searchService.clearSearchCache(pattern as string)
    
    res.json({
      success: true,
      data: result,
      message: 'Search cache cleared successfully'
    } satisfies ApiResponse)
  })
)

// Search statistics
router.get('/stats',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  asyncHandler(async (req, res) => {
    const { timeframe = 'week' } = req.query
    const stats = await searchService.getSearchStatistics(timeframe as string)
    
    res.json({
      success: true,
      data: stats,
      message: 'Search statistics retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Search feedback (for improving search quality)
router.post('/feedback',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { query, resultId, feedback, relevance } = req.body
    
    await searchService.recordSearchFeedback({
      query,
      resultId,
      feedback,
      relevance,
      userId: req.user.id
    })
    
    res.json({
      success: true,
      message: 'Search feedback recorded successfully'
    } satisfies ApiResponse)
  })
)

// Content recommendations based on user behavior
router.get('/recommendations',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { limit = 10, type = 'all' } = req.query
    const recommendations = await searchService.getPersonalizedRecommendations(
      req.user.id,
      Number(limit),
      type as string
    )
    
    res.json({
      success: true,
      data: recommendations,
      message: 'Personalized recommendations retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Utility function for content types
function getContentType(format: string): string {
  switch (format) {
    case 'csv':
      return 'text/csv'
    case 'xml':
      return 'application/xml'
    default:
      return 'application/json'
  }
}

export { router as searchRoutes } 