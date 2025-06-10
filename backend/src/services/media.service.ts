import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { nanoid } from 'nanoid'
import { prisma } from '@/config/database'
import { redis } from '@/config/database'
import { config } from '@/config/env'
import { 
  MediaResponse, 
  CreateMediaRequest, 
  UpdateMediaRequest,
  MediaListQuery,
  PaginatedResponse 
} from '@/types/api'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import type { Media, Prisma } from '@prisma/client'

export interface MediaUploadOptions {
  userId: string
  file: Express.Multer.File
  alt?: string
  description?: string
  generateThumbnails?: boolean
  quality?: number
}

export interface MediaSearchOptions {
  search?: string
  type?: string
  mimeType?: string
  userId?: string
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'size' | 'name'
  sortOrder?: 'asc' | 'desc'
}

export interface ThumbnailOptions {
  width: number
  height: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

export class MediaService {
  
  // Allowed file types
  private static readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'
  ]
  
  private static readonly ALLOWED_VIDEO_TYPES = [
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'
  ]
  
  private static readonly ALLOWED_DOCUMENT_TYPES = [
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  
  // Image sizes for automatic generation
  private static readonly IMAGE_SIZES = {
    thumbnail: { width: 150, height: 150 },
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 1200, height: 1200 },
    xlarge: { width: 1920, height: 1920 }
  }
  
  private readonly uploadPath: string
  private readonly thumbnailSizes = [
    { name: 'thumb', width: 150, height: 150 },
    { name: 'small', width: 300, height: 300 },
    { name: 'medium', width: 600, height: 600 },
    { name: 'large', width: 1200, height: 1200 }
  ]

  constructor() {
    this.uploadPath = path.resolve(config.upload.path)
    this.ensureUploadDirectory()
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      if (!existsSync(this.uploadPath)) {
        await fs.mkdir(this.uploadPath, { recursive: true })
      }
      
      // Create subdirectories
      const subdirs = ['images', 'videos', 'documents', 'thumbnails']
      for (const subdir of subdirs) {
        const dirPath = path.join(this.uploadPath, subdir)
        if (!existsSync(dirPath)) {
          await fs.mkdir(dirPath, { recursive: true })
        }
      }
    } catch (error) {
      console.error('Failed to create upload directory:', error)
      throw new Error('Upload directory initialization failed')
    }
  }

  private generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName)
    const name = path.basename(originalName, ext)
    const timestamp = Date.now()
    const uuid = uuidv4().slice(0, 8)
    return `${name}-${timestamp}-${uuid}${ext}`
  }

  private getFileSubdirectory(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'images'
    if (mimetype.startsWith('video/')) return 'videos'
    return 'documents'
  }

  private async extractImageMetadata(buffer: Buffer): Promise<any> {
    try {
      const metadata = await sharp(buffer).metadata()
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        colorSpace: metadata.space,
        hasAlpha: metadata.hasAlpha,
        isAnimated: metadata.isAnimated || false
      }
    } catch (error) {
      return null
    }
  }

  private async generateImageThumbnails(
    buffer: Buffer,
    filename: string,
    mimetype: string
  ): Promise<string[]> {
    if (!mimetype.startsWith('image/')) return []

    const thumbnailPaths: string[] = []
    const thumbDir = path.join(this.uploadPath, 'thumbnails')

    for (const size of this.thumbnailSizes) {
      try {
        const thumbFilename = `${size.name}-${filename}`
        const thumbPath = path.join(thumbDir, thumbFilename)
        
        await sharp(buffer)
          .resize(size.width, size.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toFile(thumbPath)
        
        thumbnailPaths.push(`${config.upload.urlBase}/thumbnails/${thumbFilename}`)
      } catch (error) {
        console.error(`Failed to generate ${size.name} thumbnail:`, error)
      }
    }

    return thumbnailPaths
  }

  async uploadFile(options: MediaUploadOptions): Promise<Media> {
    const { userId, file, alt, description, generateThumbnails = true, quality = 85 } = options

    // Generate unique filename
    const filename = this.generateUniqueFilename(file.originalname)
    const subdir = this.getFileSubdirectory(file.mimetype)
    const filePath = path.join(this.uploadPath, subdir, filename)
    const urlPath = `${config.upload.urlBase}/${subdir}/${filename}`

    try {
      let processedBuffer = file.buffer

      // Process images
      if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
        processedBuffer = await sharp(file.buffer)
          .jpeg({ quality })
          .toBuffer()
      }

      // Save file
      await fs.writeFile(filePath, processedBuffer)

      // Extract metadata
      const metadata = file.mimetype.startsWith('image/') 
        ? await this.extractImageMetadata(file.buffer)
        : null

      // Generate thumbnails
      const thumbnails = generateThumbnails 
        ? await this.generateImageThumbnails(file.buffer, filename, file.mimetype)
        : []

      // Save to database
      const media = await prisma.media.create({
        data: {
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: processedBuffer.length,
          path: filePath,
          url: urlPath,
          alt: alt || '',
          description: description || '',
          metadata: metadata ? JSON.stringify(metadata) : null,
          thumbnails: thumbnails.length > 0 ? JSON.stringify(thumbnails) : null,
          userId
        }
      })

      // Clear cache
      await this.clearMediaCache()

      return media
    } catch (error) {
      // Cleanup file if database save fails
      try {
        await fs.unlink(filePath)
      } catch {}
      
      throw error
    }
  }

  async uploadMultipleFiles(files: Express.Multer.File[], userId: string): Promise<Media[]> {
    const uploadPromises = files.map(file => 
      this.uploadFile({ 
        userId, 
        file,
        generateThumbnails: file.mimetype.startsWith('image/')
      })
    )

    return Promise.all(uploadPromises)
  }

  async getMedia(
    id: string, 
    options: { includeUser?: boolean; trackView?: boolean } = {}
  ): Promise<Media | null> {
    const { includeUser = false, trackView = false } = options

    const cacheKey = `media:${id}${includeUser ? ':with-user' : ''}`
    
    // Try cache first
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const media = JSON.parse(cached)
        if (trackView) {
          await this.incrementViewCount(id)
        }
        return media
      }
    }

    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        user: includeUser ? {
          select: { id: true, name: true, email: true }
        } : false
      }
    })

    if (media && redis) {
      await redis.setex(cacheKey, 3600, JSON.stringify(media)) // 1 hour cache
    }

    if (media && trackView) {
      await this.incrementViewCount(id)
    }

    return media
  }

  async getMediaList(options: MediaSearchOptions = {}): Promise<{
    media: Media[]
    pagination: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }> {
    const {
      search,
      type,
      mimeType,
      userId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options

    const cacheKey = `media:list:${JSON.stringify(options)}`
    
    // Try cache first
    if (redis && !search) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    const where: Prisma.MediaWhereInput = {}

    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { alt: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (type) {
      where.mimeType = { startsWith: type }
    }

    if (mimeType) {
      where.mimeType = mimeType
    }

    if (userId) {
      where.userId = userId
    }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.media.count({ where })
    ])

    const result = {
      media,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }

    // Cache non-search results
    if (redis && !search) {
      await redis.setex(cacheKey, 1800, JSON.stringify(result)) // 30 minutes
    }

    return result
  }

  async updateMedia(id: string, data: Partial<Pick<Media, 'alt' | 'description'>>): Promise<Media> {
    const media = await prisma.media.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    await this.clearMediaCache(id)
    return media
  }

  async deleteMedia(id: string): Promise<void> {
    const media = await prisma.media.findUnique({
      where: { id }
    })

    if (!media) {
      throw new Error('Media not found')
    }

    try {
      // Delete physical file
      if (existsSync(media.path)) {
        await fs.unlink(media.path)
      }

      // Delete thumbnails if they exist
      if (media.thumbnails) {
        const thumbnails = JSON.parse(media.thumbnails as string)
        for (const thumbUrl of thumbnails) {
          const thumbPath = thumbUrl.replace(config.upload.urlBase, this.uploadPath)
          try {
            if (existsSync(thumbPath)) {
              await fs.unlink(thumbPath)
            }
          } catch (error) {
            console.error('Failed to delete thumbnail:', error)
          }
        }
      }

      // Delete from database
      await prisma.media.delete({
        where: { id }
      })

      await this.clearMediaCache(id)
    } catch (error) {
      console.error('Error deleting media:', error)
      throw error
    }
  }

  async generateThumbnail(id: string, options: ThumbnailOptions): Promise<string> {
    const media = await this.getMedia(id)
    if (!media || !media.mimeType.startsWith('image/')) {
      throw new Error('Media not found or not an image')
    }

    const { width, height, quality = 85, format = 'jpeg' } = options
    const thumbFilename = `custom-${width}x${height}-${media.filename}`
    const thumbPath = path.join(this.uploadPath, 'thumbnails', thumbFilename)
    const thumbUrl = `${config.upload.urlBase}/thumbnails/${thumbFilename}`

    try {
      const buffer = await fs.readFile(media.path)
      
      await sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat(format, { quality })
        .toFile(thumbPath)

      return thumbUrl
    } catch (error) {
      console.error('Failed to generate custom thumbnail:', error)
      throw new Error('Thumbnail generation failed')
    }
  }

  async getMediaStats(): Promise<{
    totalFiles: number
    totalSize: number
    byType: Record<string, { count: number; size: number }>
    recentUploads: number
  }> {
    const cacheKey = 'media:stats'
    
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    }

    const [totalFiles, totalSize, typeStats, recentUploads] = await Promise.all([
      prisma.media.count(),
      prisma.media.aggregate({
        _sum: { size: true }
      }),
      prisma.media.groupBy({
        by: ['mimeType'],
        _count: { id: true },
        _sum: { size: true }
      }),
      prisma.media.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ])

    const byType: Record<string, { count: number; size: number }> = {}
    typeStats.forEach(stat => {
      byType[stat.mimeType] = {
        count: stat._count.id,
        size: stat._sum.size || 0
      }
    })

    const stats = {
      totalFiles,
      totalSize: totalSize._sum.size || 0,
      byType,
      recentUploads
    }

    if (redis) {
      await redis.setex(cacheKey, 1800, JSON.stringify(stats)) // 30 minutes
    }

    return stats
  }

  private async incrementViewCount(id: string): Promise<void> {
    if (redis) {
      const key = `media:views:${id}`
      await redis.incr(key)
      await redis.expire(key, 86400) // 24 hours
    }
  }

  async syncViewCounts(): Promise<void> {
    if (!redis) return

    const keys = await redis.keys('media:views:*')
    if (keys.length === 0) return

    const pipeline = redis.pipeline()
    keys.forEach(key => pipeline.get(key))
    const results = await pipeline.exec()

    const updates = keys.map((key, index) => {
      const id = key.replace('media:views:', '')
      const views = parseInt(results?.[index]?.[1] as string || '0')
      return { id, views }
    }).filter(update => update.views > 0)

    if (updates.length > 0) {
      await Promise.all(
        updates.map(update =>
          prisma.media.update({
            where: { id: update.id },
            data: { 
              views: { increment: update.views }
            }
          }).catch(() => {}) // Ignore errors for deleted media
        )
      )

      // Clear view count cache
      const deleteKeys = updates.map(update => `media:views:${update.id}`)
      if (deleteKeys.length > 0) {
        await redis.del(...deleteKeys)
      }
    }
  }

  private async clearMediaCache(id?: string): Promise<void> {
    if (!redis) return

    if (id) {
      const patterns = [
        `media:${id}*`,
        'media:list:*',
        'media:stats'
      ]
      
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }
    } else {
      const keys = await redis.keys('media:*')
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }
  }

  async cleanupOrphanedFiles(): Promise<{ deletedFiles: number; errors: string[] }> {
    const errors: string[] = []
    let deletedFiles = 0

    try {
      // Get all media records
      const mediaRecords = await prisma.media.findMany({
        select: { path: true, thumbnails: true }
      })

      const dbPaths = new Set(mediaRecords.map(m => m.path))
      
      // Add thumbnail paths
      mediaRecords.forEach(media => {
        if (media.thumbnails) {
          try {
            const thumbnails = JSON.parse(media.thumbnails as string)
            thumbnails.forEach((thumbUrl: string) => {
              const thumbPath = thumbUrl.replace(config.upload.urlBase, this.uploadPath)
              dbPaths.add(thumbPath)
            })
          } catch (error) {
            errors.push(`Failed to parse thumbnails for media: ${error}`)
          }
        }
      })

      // Scan upload directory
      const subdirs = ['images', 'videos', 'documents', 'thumbnails']
      
      for (const subdir of subdirs) {
        const dirPath = path.join(this.uploadPath, subdir)
        
        try {
          const files = await fs.readdir(dirPath)
          
          for (const file of files) {
            const filePath = path.join(dirPath, file)
            
            if (!dbPaths.has(filePath)) {
              try {
                await fs.unlink(filePath)
                deletedFiles++
              } catch (error) {
                errors.push(`Failed to delete orphaned file ${filePath}: ${error}`)
              }
            }
          }
        } catch (error) {
          errors.push(`Failed to scan directory ${dirPath}: ${error}`)
        }
      }

      return { deletedFiles, errors }
    } catch (error) {
      errors.push(`Cleanup operation failed: ${error}`)
      return { deletedFiles, errors }
    }
  }
}

export const mediaService = new MediaService() 