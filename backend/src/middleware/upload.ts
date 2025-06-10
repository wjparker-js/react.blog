import multer from 'multer'
import path from 'path'
import { Request } from 'express'
import { config } from '@/config/env'

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`))
  }
}

// Memory storage for processing
const storage = multer.memoryStorage()

// Upload configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSize, // From env config
    files: 10 // Maximum 10 files per request
  }
})

// Single file upload
export const uploadSingle = upload.single('file')

// Multiple files upload
export const uploadMultiple = upload.array('files', 10)

// Error handler for multer
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File Upload Error',
        message: `File size exceeds maximum allowed size of ${config.upload.maxSize / 1024 / 1024}MB`
      })
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'File Upload Error',
        message: 'Too many files uploaded'
      })
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'File Upload Error',
        message: 'Unexpected file field'
      })
    }
  }
  
  if (error.message.includes('File type') && error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      error: 'File Upload Error',
      message: error.message
    })
  }
  
  next(error)
} 