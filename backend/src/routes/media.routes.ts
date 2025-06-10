import { Router } from 'express'
import { authMiddleware } from '@/middleware/auth'
import { permissionMiddleware } from '@/middleware/permissions'
import { validateRequest } from '@/middleware/validation'
import { uploadSingle, uploadMultiple, handleUploadError } from '@/middleware/upload'
import { mediaService } from '@/services/media.service'
import {
  mediaUploadSchema,
  mediaListQuerySchema,
  mediaUpdateSchema,
  thumbnailSchema,
  bulkMediaActionSchema,
  type MediaUploadData,
  type MediaListQuery,
  type MediaUpdateData,
  type ThumbnailData,
  type BulkMediaAction
} from '@/validation/media.validation'
import { asyncHandler } from '@/utils/asyncHandler'
import { ApiResponse } from '@/types/api'

const router = Router()

// Get media list with filtering and search
router.get('/', 
  authMiddleware,
  validateRequest({ query: mediaListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as MediaListQuery
    const result = await mediaService.getMediaList(query)
    
    res.json({
      success: true,
      data: result.media,
      pagination: result.pagination,
      message: `Found ${result.media.length} media files`
    } satisfies ApiResponse)
  })
)

// Get media statistics
router.get('/stats',
  authMiddleware,
  permissionMiddleware(['read:media']),
  asyncHandler(async (req, res) => {
    const stats = await mediaService.getMediaStats()
    
    res.json({
      success: true,
      data: stats,
      message: 'Media statistics retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Upload single file
router.post('/upload',
  authMiddleware,
  permissionMiddleware(['create:media']),
  uploadSingle,
  handleUploadError,
  validateRequest({ body: mediaUploadSchema }),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'No file uploaded'
      } satisfies ApiResponse)
    }

    const uploadData = req.body as MediaUploadData
    const media = await mediaService.uploadFile({
      userId: req.user.id,
      file: req.file,
      ...uploadData
    })

    res.status(201).json({
      success: true,
      data: media,
      message: 'File uploaded successfully'
    } satisfies ApiResponse)
  })
)

// Upload multiple files
router.post('/upload/multiple',
  authMiddleware,
  permissionMiddleware(['create:media']),
  uploadMultiple,
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'No files uploaded'
      } satisfies ApiResponse)
    }

    const media = await mediaService.uploadMultipleFiles(req.files, req.user.id)

    res.status(201).json({
      success: true,
      data: media,
      message: `${media.length} files uploaded successfully`
    } satisfies ApiResponse)
  })
)

// Get single media file
router.get('/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const includeUser = req.query.includeUser === 'true'
    const trackView = req.query.trackView === 'true'
    
    const media = await mediaService.getMedia(id, { includeUser, trackView })
    
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media file not found'
      } satisfies ApiResponse)
    }

    res.json({
      success: true,
      data: media,
      message: 'Media file retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Update media metadata
router.put('/:id',
  authMiddleware,
  permissionMiddleware(['update:media']),
  validateRequest({ body: mediaUpdateSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const updateData = req.body as MediaUpdateData
    
    // Check if media exists and user has permission
    const existingMedia = await mediaService.getMedia(id)
    if (!existingMedia) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media file not found'
      } satisfies ApiResponse)
    }

    // Only allow users to update their own media unless admin
    if (existingMedia.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only update your own media files'
      } satisfies ApiResponse)
    }

    const media = await mediaService.updateMedia(id, updateData)

    res.json({
      success: true,
      data: media,
      message: 'Media file updated successfully'
    } satisfies ApiResponse)
  })
)

// Delete media file
router.delete('/:id',
  authMiddleware,
  permissionMiddleware(['delete:media']),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    
    // Check if media exists and user has permission
    const existingMedia = await mediaService.getMedia(id)
    if (!existingMedia) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Media file not found'
      } satisfies ApiResponse)
    }

    // Only allow users to delete their own media unless admin
    if (existingMedia.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only delete your own media files'
      } satisfies ApiResponse)
    }

    await mediaService.deleteMedia(id)

    res.json({
      success: true,
      message: 'Media file deleted successfully'
    } satisfies ApiResponse)
  })
)

// Generate custom thumbnail
router.post('/:id/thumbnail',
  authMiddleware,
  permissionMiddleware(['create:media']),
  validateRequest({ body: thumbnailSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const thumbnailData = req.body as ThumbnailData
    
    const thumbnailUrl = await mediaService.generateThumbnail(id, thumbnailData)

    res.json({
      success: true,
      data: { thumbnailUrl },
      message: 'Thumbnail generated successfully'
    } satisfies ApiResponse)
  })
)

// Bulk actions
router.post('/bulk/action',
  authMiddleware,
  permissionMiddleware(['delete:media']),
  validateRequest({ body: bulkMediaActionSchema }),
  asyncHandler(async (req, res) => {
    const bulkAction = req.body as BulkMediaAction
    const { ids, action, confirm } = bulkAction

    if (action === 'delete' && !confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation Required',
        message: 'Bulk delete requires confirmation'
      } satisfies ApiResponse)
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[]
    }

    if (action === 'delete') {
      // Check permissions for each file
      for (const id of ids) {
        try {
          const media = await mediaService.getMedia(id)
          if (!media) {
            results.failed.push({ id, error: 'Media not found' })
            continue
          }

          // Only allow users to delete their own media unless admin
          if (media.userId !== req.user.id && req.user.role !== 'ADMIN') {
            results.failed.push({ id, error: 'Permission denied' })
            continue
          }

          await mediaService.deleteMedia(id)
          results.success.push(id)
        } catch (error) {
          results.failed.push({ 
            id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Bulk ${action} completed. ${results.success.length} successful, ${results.failed.length} failed`
    } satisfies ApiResponse)
  })
)

// Cleanup orphaned files (admin only)
router.post('/cleanup/orphaned',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const result = await mediaService.cleanupOrphanedFiles()

    res.json({
      success: true,
      data: result,
      message: `Cleanup completed. ${result.deletedFiles} orphaned files deleted`
    } satisfies ApiResponse)
  })
)

export { router as mediaRoutes } 