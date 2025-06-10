import { Router } from 'express'
import { authenticateToken, requireRole } from '@/middleware/auth'
import { validateRequest } from '@/middleware/validation'
import { rateLimitStrict, rateLimitModerate } from '@/middleware/security'
import { PostService } from '@/services/post.service'
import { UserRole } from '@prisma/client'
import { 
  createPostSchema, 
  updatePostSchema, 
  postQuerySchema 
} from '@/middleware/validation'

const router = Router()

// GET /api/posts - Get all posts with filtering and pagination
router.get('/', 
  rateLimitModerate,
  validateRequest(postQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const query = req.query as any
      const result = await PostService.getPosts(query)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/posts/popular - Get popular posts
router.get('/popular',
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const { limit = 10, timeRange = 30 } = req.query
      const posts = await PostService.getPopularPosts(
        parseInt(limit as string), 
        parseInt(timeRange as string)
      )
      res.json({
        success: true,
        data: posts
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/posts/stats - Get post statistics
router.get('/stats',
  authenticateToken,
  requireRole([UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const { authorId } = req.query
      const userRole = req.user?.role
      const userId = req.user?.id
      
      // Only allow getting stats for own posts unless admin/editor
      let targetAuthorId = authorId as string
      if (userRole === UserRole.AUTHOR && authorId !== userId) {
        targetAuthorId = userId
      }
      
      const stats = await PostService.getPostStats(targetAuthorId)
      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/posts - Create new post
router.post('/',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN]),
  validateRequest(createPostSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id
      const post = await PostService.createPost(userId, req.body)
      res.status(201).json({
        success: true,
        data: post,
        message: 'Post created successfully'
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/posts/:identifier - Get single post by ID or slug
router.get('/:identifier',
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const { identifier } = req.params
      const { incrementView = 'false' } = req.query
      
      const post = await PostService.getPost(
        identifier, 
        incrementView === 'true'
      )
      
      res.json({
        success: true,
        data: post
      })
    } catch (error) {
      next(error)
    }
  }
)

// PUT /api/posts/:id - Update post
router.put('/:id',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN]),
  validateRequest(updatePostSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const userId = req.user!.id
      const userRole = req.user!.role
      
      const post = await PostService.updatePost(id, userId, userRole, req.body)
      res.json({
        success: true,
        data: post,
        message: 'Post updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }
)

// DELETE /api/posts/:id - Delete post
router.delete('/:id',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const userId = req.user!.id
      const userRole = req.user!.role
      
      await PostService.deletePost(id, userId, userRole)
      res.json({
        success: true,
        message: 'Post deleted successfully'
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/posts/:id/related - Get related posts
router.get('/:id/related',
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const { id } = req.params
      const { limit = 5 } = req.query
      
      const relatedPosts = await PostService.getRelatedPosts(
        id, 
        parseInt(limit as string)
      )
      
      res.json({
        success: true,
        data: relatedPosts
      })
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/posts/bulk/publish - Bulk publish posts
router.post('/bulk/publish',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const { postIds } = req.body
      
      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'postIds must be a non-empty array'
        })
      }
      
      // Update each post to published status
      const results = []
      for (const postId of postIds) {
        try {
          const post = await PostService.updatePost(
            postId, 
            req.user!.id, 
            req.user!.role, 
            { status: 'PUBLISHED', publishedAt: new Date().toISOString() }
          )
          results.push({ postId, success: true, data: post })
        } catch (error) {
          results.push({ 
            postId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
      
      res.json({
        success: true,
        data: results,
        message: `Bulk publish completed: ${results.filter(r => r.success).length}/${results.length} successful`
      })
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/posts/bulk/unpublish - Bulk unpublish posts
router.post('/bulk/unpublish',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const { postIds } = req.body
      
      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'postIds must be a non-empty array'
        })
      }
      
      // Update each post to draft status
      const results = []
      for (const postId of postIds) {
        try {
          const post = await PostService.updatePost(
            postId, 
            req.user!.id, 
            req.user!.role, 
            { status: 'DRAFT' }
          )
          results.push({ postId, success: true, data: post })
        } catch (error) {
          results.push({ 
            postId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
      
      res.json({
        success: true,
        data: results,
        message: `Bulk unpublish completed: ${results.filter(r => r.success).length}/${results.length} successful`
      })
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/posts/bulk/delete - Bulk delete posts
router.post('/bulk/delete',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.ADMIN]), // Only admins can bulk delete
  async (req, res, next) => {
    try {
      const { postIds } = req.body
      
      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'postIds must be a non-empty array'
        })
      }
      
      // Delete each post
      const results = []
      for (const postId of postIds) {
        try {
          await PostService.deletePost(postId, req.user!.id, req.user!.role)
          results.push({ postId, success: true })
        } catch (error) {
          results.push({ 
            postId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
      
      res.json({
        success: true,
        data: results,
        message: `Bulk delete completed: ${results.filter(r => r.success).length}/${results.length} successful`
      })
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/posts/process-scheduled - Process scheduled posts (internal endpoint)
router.post('/process-scheduled',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const publishedCount = await PostService.processScheduledPosts()
      res.json({
        success: true,
        data: { publishedCount },
        message: `Processed ${publishedCount} scheduled posts`
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router 