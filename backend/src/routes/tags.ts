import { Router } from 'express'
import { authenticateToken, requireRole } from '@/middleware/auth'
import { validateRequest } from '@/middleware/validation'
import { rateLimitStrict, rateLimitModerate } from '@/middleware/security'
import { TagService } from '@/services/tag.service'
import { UserRole } from '@prisma/client'
import { 
  createTagSchema, 
  updateTagSchema 
} from '@/middleware/validation'

const router = Router()

// GET /api/tags - Get all tags
router.get('/', 
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const tags = await TagService.getTags()
      res.json({
        success: true,
        data: tags
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/tags/cloud - Get tag cloud data
router.get('/cloud',
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const { limit = 50 } = req.query
      const tagCloud = await TagService.getTagCloud(parseInt(limit as string))
      res.json({
        success: true,
        data: tagCloud
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/tags/search - Search tags by name
router.get('/search',
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const { q, limit = 10 } = req.query
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Query parameter "q" is required'
        })
      }
      
      const tags = await TagService.searchTags(q, parseInt(limit as string))
      res.json({
        success: true,
        data: tags
      })
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/tags - Create new tag
router.post('/',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  validateRequest(createTagSchema),
  async (req, res, next) => {
    try {
      const tag = await TagService.createTag(req.body)
      res.status(201).json({
        success: true,
        data: tag,
        message: 'Tag created successfully'
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/tags/:identifier - Get single tag by ID or slug
router.get('/:identifier',
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const { identifier } = req.params
      const tag = await TagService.getTag(identifier)
      res.json({
        success: true,
        data: tag
      })
    } catch (error) {
      next(error)
    }
  }
)

// PUT /api/tags/:id - Update tag
router.put('/:id',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  validateRequest(updateTagSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const tag = await TagService.updateTag(id, req.body)
      res.json({
        success: true,
        data: tag,
        message: 'Tag updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }
)

// DELETE /api/tags/:id - Delete tag
router.delete('/:id',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const { id } = req.params
      await TagService.deleteTag(id)
      res.json({
        success: true,
        message: 'Tag deleted successfully'
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router 