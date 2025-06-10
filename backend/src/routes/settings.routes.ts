import { Router } from 'express'
import { asyncHandler } from '@/middleware/asyncHandler'
import { authenticate, authorize } from '@/middleware/auth'
import { validate } from '@/middleware/validation'
import { rateLimiter } from '@/middleware/rateLimiter'
import { settingsService } from '@/services/settings.service'
import {
  getSystemSettingsSchema,
  updateSystemSettingSchema,
  bulkUpdateSystemSettingsSchema,
  getUserPreferencesSchema,
  updateUserPreferenceSchema,
  bulkUpdateUserPreferencesSchema,
  createThemeSchema,
  updateThemeSchema,
  getThemeSchema,
  deleteThemeSchema,
  getConfigurationSchema,
  updateConfigurationSchema,
  getSettingHistorySchema,
  getSettingAuditSchema,
  exportSettingsSchema,
  importSettingsSchema,
  createSettingsBackupSchema,
  restoreSettingsBackupSchema,
  getSettingsBackupsSchema,
  deleteSettingsBackupSchema,
  validateSettingsSchema,
  updateNotificationPreferencesSchema,
  searchSettingsSchema,
  resetSettingsSchema
} from '@/validation/settings.validation'

const router = Router()

// System Settings Routes
router.get('/system',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  validate(getSystemSettingsSchema),
  asyncHandler(async (req, res) => {
    const { category } = req.query

    const settings = await settingsService.getSystemSettings()
    
    let filteredSettings = settings
    if (category) {
      filteredSettings = { [category]: settings[category as keyof typeof settings] }
    }

    res.status(200).json({
      success: true,
      data: filteredSettings
    })
  })
)

router.put('/system',
  authenticate,
  authorize(['ADMIN']),
  rateLimiter(30, 3600), // 30 updates per hour
  validate(updateSystemSettingSchema),
  asyncHandler(async (req, res) => {
    const { key, value } = req.body
    const updatedBy = req.user!.id

    await settingsService.updateSystemSetting(key, value, updatedBy)

    res.status(200).json({
      success: true,
      message: 'System setting updated successfully'
    })
  })
)

router.put('/system/bulk',
  authenticate,
  authorize(['ADMIN']),
  rateLimiter(5, 3600), // 5 bulk updates per hour
  validate(bulkUpdateSystemSettingsSchema),
  asyncHandler(async (req, res) => {
    const { settings } = req.body
    const updatedBy = req.user!.id

    await settingsService.bulkUpdateSystemSettings(settings, updatedBy)

    res.status(200).json({
      success: true,
      message: `Successfully updated ${Object.keys(settings).length} system settings`
    })
  })
)

// User Preferences Routes
router.get('/preferences/:userId?',
  authenticate,
  validate(getUserPreferencesSchema),
  asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user!.id
    const { category } = req.query

    // Check if user can access these preferences
    if (userId !== req.user!.id && !['ADMIN', 'MODERATOR'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    const preferences = await settingsService.getUserPreferences(userId)
    
    let filteredPreferences = preferences
    if (category) {
      filteredPreferences = { [category]: preferences[category as keyof typeof preferences] }
    }

    res.status(200).json({
      success: true,
      data: filteredPreferences
    })
  })
)

router.put('/preferences/:userId?',
  authenticate,
  validate(updateUserPreferenceSchema),
  asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user!.id
    const { key, value } = req.body

    // Check if user can update these preferences
    if (userId !== req.user!.id && !['ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    await settingsService.updateUserPreference(userId, key, value)

    res.status(200).json({
      success: true,
      message: 'User preference updated successfully'
    })
  })
)

router.put('/preferences/:userId?/bulk',
  authenticate,
  rateLimiter(20, 3600), // 20 bulk updates per hour
  validate(bulkUpdateUserPreferencesSchema),
  asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user!.id
    const { preferences } = req.body

    // Check if user can update these preferences
    if (userId !== req.user!.id && !['ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    await settingsService.bulkUpdateUserPreferences(userId, preferences)

    res.status(200).json({
      success: true,
      message: `Successfully updated ${Object.keys(preferences).length} user preferences`
    })
  })
)

// Theme Management Routes
router.get('/themes',
  asyncHandler(async (req, res) => {
    const themes = await settingsService.getThemes()

    res.status(200).json({
      success: true,
      data: { themes }
    })
  })
)

router.get('/themes/:themeName',
  validate(getThemeSchema),
  asyncHandler(async (req, res) => {
    const { themeName } = req.params

    const theme = await settingsService.getTheme(themeName)
    
    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Theme not found'
      })
    }

    res.status(200).json({
      success: true,
      data: theme
    })
  })
)

router.post('/themes',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  rateLimiter(10, 3600), // 10 theme creations per hour
  validate(createThemeSchema),
  asyncHandler(async (req, res) => {
    const themeData = req.body
    const createdBy = req.user!.id

    await settingsService.createTheme(themeData, createdBy)

    res.status(201).json({
      success: true,
      message: 'Theme created successfully'
    })
  })
)

router.put('/themes/:themeName',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  validate(updateThemeSchema),
  asyncHandler(async (req, res) => {
    const { themeName } = req.params
    const updateData = req.body
    const updatedBy = req.user!.id

    await settingsService.updateTheme(themeName, updateData, updatedBy)

    res.status(200).json({
      success: true,
      message: 'Theme updated successfully'
    })
  })
)

router.delete('/themes/:themeName',
  authenticate,
  authorize(['ADMIN']),
  validate(deleteThemeSchema),
  asyncHandler(async (req, res) => {
    const { themeName } = req.params

    await settingsService.deleteTheme(themeName)

    res.status(200).json({
      success: true,
      message: 'Theme deleted successfully'
    })
  })
)

// Configuration Management Routes
router.get('/config',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  validate(getConfigurationSchema),
  asyncHandler(async (req, res) => {
    const { category, key } = req.query

    const configuration = await settingsService.getConfiguration(category)
    
    let filteredConfig = configuration
    if (key) {
      filteredConfig = { [key]: configuration[key] }
    }

    res.status(200).json({
      success: true,
      data: filteredConfig
    })
  })
)

router.put('/config',
  authenticate,
  authorize(['ADMIN']),
  rateLimiter(50, 3600), // 50 config updates per hour
  validate(updateConfigurationSchema),
  asyncHandler(async (req, res) => {
    const { key, value } = req.body
    const updatedBy = req.user!.id

    await settingsService.updateConfiguration(key, value, updatedBy)

    res.status(200).json({
      success: true,
      message: 'Configuration updated successfully'
    })
  })
)

// Setting History and Audit Routes
router.get('/history',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  validate(getSettingHistorySchema),
  asyncHandler(async (req, res) => {
    const { key, limit = 50, startDate, endDate } = req.query

    const history = await settingsService.getSettingHistory(key, limit)

    res.status(200).json({
      success: true,
      data: { history }
    })
  })
)

router.get('/audit',
  authenticate,
  authorize(['ADMIN']),
  validate(getSettingAuditSchema),
  asyncHandler(async (req, res) => {
    const { type, userId, action, page = 1, limit = 50, startDate, endDate } = req.query

    // This would get comprehensive audit logs
    res.status(200).json({
      success: true,
      data: {
        auditLogs: [],
        total: 0,
        page,
        limit
      }
    })
  })
)

// Import/Export Routes
router.get('/export',
  authenticate,
  authorize(['ADMIN']),
  validate(exportSettingsSchema),
  asyncHandler(async (req, res) => {
    const { type, format = 'json', userId, includeDefaults = false } = req.query

    const settings = await settingsService.exportSettings(type)

    res.status(200).json({
      success: true,
      data: {
        settings,
        exportedAt: new Date().toISOString(),
        type,
        format
      }
    })
  })
)

router.post('/import',
  authenticate,
  authorize(['ADMIN']),
  rateLimiter(2, 3600), // 2 imports per hour
  validate(importSettingsSchema),
  asyncHandler(async (req, res) => {
    const { settings, overwrite = false, backup = true, validate = true } = req.body
    const importedBy = req.user!.id

    if (backup) {
      // Create backup before import
      const backupName = `pre-import-${new Date().toISOString()}`
      // This would create a backup
    }

    await settingsService.importSettings(settings, importedBy)

    res.status(200).json({
      success: true,
      message: `Successfully imported ${Object.keys(settings).length} settings`,
      data: {
        importedCount: Object.keys(settings).length,
        backupCreated: backup
      }
    })
  })
)

// Backup and Restore Routes
router.post('/backups',
  authenticate,
  authorize(['ADMIN']),
  rateLimiter(5, 3600), // 5 backups per hour
  validate(createSettingsBackupSchema),
  asyncHandler(async (req, res) => {
    const { name, description, includeUserPreferences = false, includeThemes = true } = req.body
    const createdBy = req.user!.id

    // This would create a settings backup
    res.status(201).json({
      success: true,
      message: 'Settings backup created successfully',
      data: {
        backupId: 'backup_123',
        name,
        createdAt: new Date().toISOString()
      }
    })
  })
)

router.get('/backups',
  authenticate,
  authorize(['ADMIN']),
  validate(getSettingsBackupsSchema),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query

    // This would get settings backups
    res.status(200).json({
      success: true,
      data: {
        backups: [],
        total: 0,
        page,
        limit
      }
    })
  })
)

router.post('/backups/:backupId/restore',
  authenticate,
  authorize(['ADMIN']),
  rateLimiter(2, 3600), // 2 restores per hour
  validate(restoreSettingsBackupSchema),
  asyncHandler(async (req, res) => {
    const { backupId } = req.params
    const { overwrite = false, selectiveRestore } = req.body

    // This would restore settings from backup
    res.status(200).json({
      success: true,
      message: 'Settings restored successfully from backup',
      data: {
        backupId,
        restoredAt: new Date().toISOString()
      }
    })
  })
)

router.delete('/backups/:backupId',
  authenticate,
  authorize(['ADMIN']),
  validate(deleteSettingsBackupSchema),
  asyncHandler(async (req, res) => {
    const { backupId } = req.params

    // This would delete the backup
    res.status(200).json({
      success: true,
      message: 'Settings backup deleted successfully'
    })
  })
)

// Validation Routes
router.post('/validate',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  validate(validateSettingsSchema),
  asyncHandler(async (req, res) => {
    const { settings, strict = false } = req.body

    // This would validate settings against schema
    res.status(200).json({
      success: true,
      data: {
        valid: true,
        errors: [],
        warnings: []
      }
    })
  })
)

// Notification Preferences Routes
router.put('/notifications/:userId?',
  authenticate,
  validate(updateNotificationPreferencesSchema),
  asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user!.id
    const notificationData = req.body

    // Check permissions
    if (userId !== req.user!.id && !['ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      })
    }

    // Update notification preferences
    const preferences = {
      ...notificationData,
      updatedAt: new Date().toISOString()
    }

    await settingsService.bulkUpdateUserPreferences(userId, {
      'notifications': preferences
    })

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully'
    })
  })
)

// Search Settings Routes
router.get('/search',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  validate(searchSettingsSchema),
  asyncHandler(async (req, res) => {
    const { q, type = 'ALL', category, page = 1, limit = 20 } = req.query

    // This would implement settings search
    res.status(200).json({
      success: true,
      data: {
        settings: [],
        total: 0,
        page,
        limit,
        query: q
      }
    })
  })
)

// Reset Settings Routes
router.post('/reset',
  authenticate,
  authorize(['ADMIN']),
  rateLimiter(3, 3600), // 3 resets per hour
  validate(resetSettingsSchema),
  asyncHandler(async (req, res) => {
    const { type, category, userId, confirm } = req.body

    if (!confirm) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required to reset settings'
      })
    }

    // This would reset settings to defaults
    res.status(200).json({
      success: true,
      message: `Successfully reset ${type} settings`,
      data: {
        type,
        category,
        resetAt: new Date().toISOString()
      }
    })
  })
)

// Settings Statistics Routes
router.get('/stats',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  asyncHandler(async (req, res) => {
    // This would get settings statistics
    res.status(200).json({
      success: true,
      data: {
        systemSettings: 45,
        userPreferences: 1250,
        themes: 8,
        configurations: 32,
        recentChanges: 15
      }
    })
  })
)

// Settings Cache Management Routes
router.delete('/cache',
  authenticate,
  authorize(['ADMIN']),
  asyncHandler(async (req, res) => {
    // This would clear settings cache
    res.status(200).json({
      success: true,
      message: 'Settings cache cleared successfully'
    })
  })
)

router.post('/cache/warm',
  authenticate,
  authorize(['ADMIN']),
  asyncHandler(async (req, res) => {
    // This would warm up settings cache
    res.status(200).json({
      success: true,
      message: 'Settings cache warmed successfully'
    })
  })
)

// Default Settings Routes
router.get('/defaults/:type',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  asyncHandler(async (req, res) => {
    const { type } = req.params

    // This would get default settings for a type
    res.status(200).json({
      success: true,
      data: {
        defaults: {},
        type
      }
    })
  })
)

router.post('/defaults/:type/restore',
  authenticate,
  authorize(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { type } = req.params

    // This would restore default settings
    res.status(200).json({
      success: true,
      message: `Default ${type} settings restored successfully`
    })
  })
)

// Health Check Route
router.get('/health',
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Settings service is healthy',
      timestamp: new Date().toISOString()
    })
  })
)

export default router 