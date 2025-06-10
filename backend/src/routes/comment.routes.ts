import { Router } from 'express'
import { authMiddleware, optionalAuthMiddleware } from '@/middleware/auth'
import { permissionMiddleware } from '@/middleware/permissions'
import { validateRequest } from '@/middleware/validation'
import { commentService } from '@/services/comment.service'
import {
  createCommentSchema,
  updateCommentSchema,
  commentListQuerySchema,
  voteCommentSchema,
  bulkCommentActionSchema,
  moderateCommentSchema,
  reportCommentSchema,
  commentStatsQuerySchema,
  searchCommentsSchema,
  getCommentThreadSchema,
  type CreateCommentData,
  type UpdateCommentData,
  type CommentListQuery,
  type VoteCommentData,
  type BulkCommentAction,
  type ModerateCommentData,
  type ReportCommentData,
  type CommentStatsQuery,
  type SearchCommentsQuery,
  type GetCommentThreadQuery
} from '@/validation/comment.validation'
import { asyncHandler } from '@/utils/asyncHandler'
import { ApiResponse } from '@/types/api'

const router = Router()

// Get comments with optional filtering and pagination
router.get('/',
  optionalAuthMiddleware, // Allow anonymous viewing
  validateRequest({ query: commentListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as CommentListQuery
    const userId = req.user?.id
    
    const result = await commentService.getComments(query, userId)
    
    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination,
      message: `Found ${result.comments.length} comments`
    } satisfies ApiResponse)
  })
)

// Get comment statistics
router.get('/stats',
  optionalAuthMiddleware,
  validateRequest({ query: commentStatsQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as CommentStatsQuery
    const stats = await commentService.getCommentStats(query)
    
    res.json({
      success: true,
      data: stats,
      message: 'Comment statistics retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Search comments
router.get('/search',
  optionalAuthMiddleware,
  validateRequest({ query: searchCommentsSchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as SearchCommentsQuery
    const result = await commentService.searchComments(query)
    
    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination,
      message: `Found ${result.comments.length} comments matching search`
    } satisfies ApiResponse)
  })
)

// Create new comment
router.post('/',
  authMiddleware,
  validateRequest({ body: createCommentSchema }),
  asyncHandler(async (req, res) => {
    const commentData = req.body as CreateCommentData
    const comment = await commentService.createComment(commentData, req.user.id)
    
    res.status(201).json({
      success: true,
      data: comment,
      message: 'Comment created successfully'
    } satisfies ApiResponse)
  })
)

// Get specific comment by ID with thread
router.get('/:id',
  optionalAuthMiddleware,
  validateRequest({ query: getCommentThreadSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const query = req.query as GetCommentThreadQuery
    const userId = req.user?.id
    
    const comment = await commentService.getCommentById(id, userId)
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Comment not found'
      } satisfies ApiResponse)
    }

    // Get comment thread if it's a top-level comment
    let commentThread = comment
    if (!comment.parentId) {
      commentThread = await commentService.getCommentThread(id, query, userId)
    }

    res.json({
      success: true,
      data: commentThread,
      message: 'Comment retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Update comment
router.put('/:id',
  authMiddleware,
  validateRequest({ body: updateCommentSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const updateData = req.body as UpdateCommentData
    
    const comment = await commentService.updateComment(id, updateData, req.user.id)
    
    res.json({
      success: true,
      data: comment,
      message: 'Comment updated successfully'
    } satisfies ApiResponse)
  })
)

// Delete comment
router.delete('/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    
    await commentService.deleteComment(id, req.user.id)
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    } satisfies ApiResponse)
  })
)

// Vote on comment
router.post('/:id/vote',
  authMiddleware,
  validateRequest({ body: voteCommentSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { voteType } = req.body as VoteCommentData
    
    const result = await commentService.voteComment(id, req.user.id, voteType)
    
    res.json({
      success: true,
      data: result,
      message: `Vote ${voteType === 'remove' ? 'removed' : 'recorded'} successfully`
    } satisfies ApiResponse)
  })
)

// Report comment
router.post('/:id/report',
  authMiddleware,
  validateRequest({ body: reportCommentSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const reportData = req.body as ReportCommentData
    
    await commentService.reportComment(id, req.user.id, reportData)
    
    res.json({
      success: true,
      message: 'Comment reported successfully'
    } satisfies ApiResponse)
  })
)

// Moderate comment (admin/moderator only)
router.put('/:id/moderate',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ body: moderateCommentSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const moderationData = req.body as ModerateCommentData
    
    const comment = await commentService.moderateComment(id, req.user.id, moderationData)
    
    res.json({
      success: true,
      data: comment,
      message: 'Comment moderated successfully'
    } satisfies ApiResponse)
  })
)

// Get pending comments for moderation
router.get('/moderation/pending',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ query: commentListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = {
      ...req.query as CommentListQuery,
      status: 'PENDING' as const
    }
    
    const result = await commentService.getComments(query, req.user.id)
    
    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination,
      message: `Found ${result.comments.length} pending comments`
    } satisfies ApiResponse)
  })
)

// Get spam comments
router.get('/moderation/spam',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ query: commentListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await commentService.getSpamComments(req.query as CommentListQuery)
    
    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination,
      message: `Found ${result.comments.length} spam comments`
    } satisfies ApiResponse)
  })
)

// Bulk comment actions (admin/moderator only)
router.post('/bulk/action',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ body: bulkCommentActionSchema }),
  asyncHandler(async (req, res) => {
    const bulkAction = req.body as BulkCommentAction
    const { commentIds, action, reason, confirm } = bulkAction

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation Required',
        message: `Bulk ${action} requires confirmation`
      } satisfies ApiResponse)
    }

    const results = await commentService.bulkCommentAction(commentIds, action, req.user.id, reason)

    res.json({
      success: true,
      data: results,
      message: `Bulk ${action} completed. ${results.success.length} successful, ${results.failed.length} failed`
    } satisfies ApiResponse)
  })
)

// Export comments (admin only)
router.get('/export/data',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const { postId, format = 'json' } = req.query as { postId?: string; format?: 'json' | 'csv' }
    
    const exportData = await commentService.exportComments(postId, format)
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=comments.csv')
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename=comments.json')
    }
    
    res.send(exportData)
  })
)

// Clean up orphaned comments (admin only)
router.post('/cleanup/orphaned',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const result = await commentService.cleanupOrphanedComments()
    
    res.json({
      success: true,
      data: result,
      message: `Cleanup completed. ${result.deletedComments} orphaned comments removed`
    } satisfies ApiResponse)
  })
)

// Rebuild comment trees (admin only, for data integrity)
router.post('/rebuild/trees',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const result = await commentService.rebuildCommentTrees()
    
    res.json({
      success: true,
      data: result,
      message: `Rebuilt ${result.processedPosts} comment trees`
    } satisfies ApiResponse)
  })
)

export { router as commentRoutes } 