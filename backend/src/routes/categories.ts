import { Router } from 'express'
import { authenticateToken, requireRole } from '@/middleware/auth'
import { validateRequest } from '@/middleware/validation'
import { rateLimitStrict, rateLimitModerate } from '@/middleware/security'
import { CategoryService } from '@/services/category.service'
import { UserRole } from '@prisma/client'
import { 
  createCategorySchema, 
  updateCategorySchema 
} from '@/middleware/validation'

const router = Router()

// GET /api/categories - Get all categories
router.get('/', 
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const { includeInactive = 'false' } = req.query
      const categories = await CategoryService.getCategories(
        includeInactive === 'true'
      )
      res.json({
        success: true,
        data: categories
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/categories/tree - Get category tree structure
router.get('/tree',
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const categoryTree = await CategoryService.getCategoryTree()
      res.json({
        success: true,
        data: categoryTree
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/categories/stats - Get categories with statistics
router.get('/stats',
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const categoriesWithStats = await CategoryService.getCategoriesWithStats()
      res.json({
        success: true,
        data: categoriesWithStats
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/categories/popular - Get popular categories
router.get('/popular',
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const { limit = 10 } = req.query
      const categories = await CategoryService.getPopularCategories(
        parseInt(limit as string)
      )
      res.json({
        success: true,
        data: categories
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/categories/summary - Get category summary statistics
router.get('/summary',
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const stats = await CategoryService.getCategoryStats()
      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/categories - Create new category
router.post('/',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  validateRequest(createCategorySchema),
  async (req, res, next) => {
    try {
      const category = await CategoryService.createCategory(req.body)
      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/categories/:identifier - Get single category by ID or slug
router.get('/:identifier',
  rateLimitModerate,
  async (req, res, next) => {
    try {
      const { identifier } = req.params
      const category = await CategoryService.getCategory(identifier)
      res.json({
        success: true,
        data: category
      })
    } catch (error) {
      next(error)
    }
  }
)

// PUT /api/categories/:id - Update category
router.put('/:id',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  validateRequest(updateCategorySchema),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const category = await CategoryService.updateCategory(id, req.body)
      res.json({
        success: true,
        data: category,
        message: 'Category updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }
)

// DELETE /api/categories/:id - Delete category
router.delete('/:id',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const { id } = req.params
      await CategoryService.deleteCategory(id)
      res.json({
        success: true,
        message: 'Category deleted successfully'
      })
    } catch (error) {
      next(error)
    }
  }
)

// POST /api/categories/reorder - Reorder categories within same parent
router.post('/reorder',
  rateLimitStrict,
  authenticateToken,
  requireRole([UserRole.EDITOR, UserRole.ADMIN]),
  async (req, res, next) => {
    try {
      const { parentId = null, categoryIds } = req.body
      
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'categoryIds must be a non-empty array'
        })
      }
      
      await CategoryService.reorderCategories(parentId, categoryIds)
      res.json({
        success: true,
        message: 'Categories reordered successfully'
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router 