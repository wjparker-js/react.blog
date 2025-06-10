import { z } from 'zod'

// System Settings Schemas
export const getSystemSettingsSchema = z.object({
  query: z.object({
    category: z.enum(['site', 'content', 'email', 'social', 'seo', 'security', 'performance', 'maintenance']).optional()
  })
})

export const updateSystemSettingSchema = z.object({
  body: z.object({
    key: z.string().min(1, 'Setting key is required').max(100, 'Setting key must be less than 100 characters'),
    value: z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.any())], {
      errorMap: () => ({ message: 'Value must be a string, number, boolean, object, or array' })
    })
  })
})

export const bulkUpdateSystemSettingsSchema = z.object({
  body: z.object({
    settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.any())]))
      .refine(settings => Object.keys(settings).length > 0, {
        message: 'At least one setting is required'
      })
      .refine(settings => Object.keys(settings).length <= 50, {
        message: 'Maximum 50 settings allowed in bulk update'
      })
  })
})

// User Preferences Schemas
export const getUserPreferencesSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format').optional()
  }),
  query: z.object({
    category: z.enum(['general', 'notifications', 'privacy', 'appearance', 'editor', 'dashboard']).optional()
  })
})

export const updateUserPreferenceSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format').optional()
  }),
  body: z.object({
    key: z.string().min(1, 'Preference key is required').max(100, 'Preference key must be less than 100 characters'),
    value: z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.any())], {
      errorMap: () => ({ message: 'Value must be a string, number, boolean, object, or array' })
    })
  })
})

export const bulkUpdateUserPreferencesSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format').optional()
  }),
  body: z.object({
    preferences: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.any())]))
      .refine(preferences => Object.keys(preferences).length > 0, {
        message: 'At least one preference is required'
      })
      .refine(preferences => Object.keys(preferences).length <= 30, {
        message: 'Maximum 30 preferences allowed in bulk update'
      })
  })
})

// Theme Management Schemas
export const createThemeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Theme name is required').max(50, 'Theme name must be less than 50 characters')
      .regex(/^[a-z0-9-_]+$/, 'Theme name can only contain lowercase letters, numbers, hyphens, and underscores'),
    displayName: z.string().min(1, 'Display name is required').max(100, 'Display name must be less than 100 characters'),
    colors: z.object({
      primary: z.string().regex(/^#[0-9a-f]{6}$/i, 'Primary color must be a valid hex color'),
      secondary: z.string().regex(/^#[0-9a-f]{6}$/i, 'Secondary color must be a valid hex color'),
      accent: z.string().regex(/^#[0-9a-f]{6}$/i, 'Accent color must be a valid hex color'),
      background: z.string().regex(/^#[0-9a-f]{6}$/i, 'Background color must be a valid hex color'),
      surface: z.string().regex(/^#[0-9a-f]{6}$/i, 'Surface color must be a valid hex color'),
      text: z.string().regex(/^#[0-9a-f]{6}$/i, 'Text color must be a valid hex color'),
      textSecondary: z.string().regex(/^#[0-9a-f]{6}$/i, 'Secondary text color must be a valid hex color'),
      border: z.string().regex(/^#[0-9a-f]{6}$/i, 'Border color must be a valid hex color'),
      success: z.string().regex(/^#[0-9a-f]{6}$/i, 'Success color must be a valid hex color'),
      warning: z.string().regex(/^#[0-9a-f]{6}$/i, 'Warning color must be a valid hex color'),
      error: z.string().regex(/^#[0-9a-f]{6}$/i, 'Error color must be a valid hex color'),
      info: z.string().regex(/^#[0-9a-f]{6}$/i, 'Info color must be a valid hex color')
    }),
    typography: z.object({
      fontFamily: z.string().min(1, 'Font family is required'),
      fontSize: z.object({
        xs: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format'),
        sm: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format'),
        base: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format'),
        lg: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format'),
        xl: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format'),
        '2xl': z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format'),
        '3xl': z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format')
      }),
      fontWeight: z.object({
        light: z.number().min(100).max(900),
        normal: z.number().min(100).max(900),
        medium: z.number().min(100).max(900),
        semibold: z.number().min(100).max(900),
        bold: z.number().min(100).max(900)
      })
    }),
    spacing: z.object({
      xs: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid spacing format'),
      sm: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid spacing format'),
      md: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid spacing format'),
      lg: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid spacing format'),
      xl: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid spacing format')
    }),
    borderRadius: z.object({
      sm: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid border radius format'),
      md: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid border radius format'),
      lg: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid border radius format'),
      full: z.string().regex(/^\d+(\.\d+)?(px|rem|em|%)$/, 'Invalid border radius format')
    }),
    shadows: z.object({
      sm: z.string().min(1, 'Small shadow is required'),
      md: z.string().min(1, 'Medium shadow is required'),
      lg: z.string().min(1, 'Large shadow is required'),
      xl: z.string().min(1, 'Extra large shadow is required')
    })
  })
})

export const updateThemeSchema = z.object({
  params: z.object({
    themeName: z.string().min(1, 'Theme name is required')
  }),
  body: z.object({
    displayName: z.string().min(1, 'Display name is required').max(100, 'Display name must be less than 100 characters').optional(),
    colors: z.object({
      primary: z.string().regex(/^#[0-9a-f]{6}$/i, 'Primary color must be a valid hex color').optional(),
      secondary: z.string().regex(/^#[0-9a-f]{6}$/i, 'Secondary color must be a valid hex color').optional(),
      accent: z.string().regex(/^#[0-9a-f]{6}$/i, 'Accent color must be a valid hex color').optional(),
      background: z.string().regex(/^#[0-9a-f]{6}$/i, 'Background color must be a valid hex color').optional(),
      surface: z.string().regex(/^#[0-9a-f]{6}$/i, 'Surface color must be a valid hex color').optional(),
      text: z.string().regex(/^#[0-9a-f]{6}$/i, 'Text color must be a valid hex color').optional(),
      textSecondary: z.string().regex(/^#[0-9a-f]{6}$/i, 'Secondary text color must be a valid hex color').optional(),
      border: z.string().regex(/^#[0-9a-f]{6}$/i, 'Border color must be a valid hex color').optional(),
      success: z.string().regex(/^#[0-9a-f]{6}$/i, 'Success color must be a valid hex color').optional(),
      warning: z.string().regex(/^#[0-9a-f]{6}$/i, 'Warning color must be a valid hex color').optional(),
      error: z.string().regex(/^#[0-9a-f]{6}$/i, 'Error color must be a valid hex color').optional(),
      info: z.string().regex(/^#[0-9a-f]{6}$/i, 'Info color must be a valid hex color').optional()
    }).optional(),
    typography: z.object({
      fontFamily: z.string().min(1, 'Font family is required').optional(),
      fontSize: z.object({
        xs: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format').optional(),
        sm: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format').optional(),
        base: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format').optional(),
        lg: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format').optional(),
        xl: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format').optional(),
        '2xl': z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format').optional(),
        '3xl': z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid font size format').optional()
      }).optional(),
      fontWeight: z.object({
        light: z.number().min(100).max(900).optional(),
        normal: z.number().min(100).max(900).optional(),
        medium: z.number().min(100).max(900).optional(),
        semibold: z.number().min(100).max(900).optional(),
        bold: z.number().min(100).max(900).optional()
      }).optional()
    }).optional(),
    spacing: z.object({
      xs: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid spacing format').optional(),
      sm: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid spacing format').optional(),
      md: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid spacing format').optional(),
      lg: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid spacing format').optional(),
      xl: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid spacing format').optional()
    }).optional(),
    borderRadius: z.object({
      sm: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid border radius format').optional(),
      md: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid border radius format').optional(),
      lg: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/, 'Invalid border radius format').optional(),
      full: z.string().regex(/^\d+(\.\d+)?(px|rem|em|%)$/, 'Invalid border radius format').optional()
    }).optional(),
    shadows: z.object({
      sm: z.string().min(1, 'Small shadow is required').optional(),
      md: z.string().min(1, 'Medium shadow is required').optional(),
      lg: z.string().min(1, 'Large shadow is required').optional(),
      xl: z.string().min(1, 'Extra large shadow is required').optional()
    }).optional()
  })
})

export const getThemeSchema = z.object({
  params: z.object({
    themeName: z.string().min(1, 'Theme name is required')
  })
})

export const deleteThemeSchema = z.object({
  params: z.object({
    themeName: z.string().min(1, 'Theme name is required')
  })
})

// Configuration Management Schemas
export const getConfigurationSchema = z.object({
  query: z.object({
    category: z.string().min(1).max(50).optional(),
    key: z.string().min(1).max(100).optional()
  })
})

export const updateConfigurationSchema = z.object({
  body: z.object({
    key: z.string().min(1, 'Configuration key is required').max(100, 'Configuration key must be less than 100 characters'),
    value: z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.any())], {
      errorMap: () => ({ message: 'Value must be a string, number, boolean, object, or array' })
    }),
    category: z.string().min(1).max(50).optional(),
    description: z.string().max(500).optional()
  })
})

// Setting History and Audit Schemas
export const getSettingHistorySchema = z.object({
  query: z.object({
    key: z.string().min(1, 'Setting key is required').max(100, 'Setting key must be less than 100 characters'),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional()
  })
})

export const getSettingAuditSchema = z.object({
  query: z.object({
    type: z.enum(['SYSTEM', 'USER', 'THEME', 'CONFIG']).optional(),
    userId: z.string().uuid('Invalid user ID format').optional(),
    action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
    page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional()
  })
})

// Import/Export Schemas
export const exportSettingsSchema = z.object({
  query: z.object({
    type: z.enum(['SYSTEM', 'USER', 'THEME', 'CONFIG', 'ALL'], {
      errorMap: () => ({ message: 'Type must be SYSTEM, USER, THEME, CONFIG, or ALL' })
    }).optional(),
    format: z.enum(['json', 'yaml', 'csv'], {
      errorMap: () => ({ message: 'Format must be json, yaml, or csv' })
    }).optional(),
    userId: z.string().uuid('Invalid user ID format').optional(),
    includeDefaults: z.string().transform(val => val === 'true').pipe(z.boolean()).optional()
  })
})

export const importSettingsSchema = z.object({
  body: z.object({
    settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.any())]))
      .refine(settings => Object.keys(settings).length > 0, {
        message: 'At least one setting is required'
      }),
    overwrite: z.boolean().optional(),
    backup: z.boolean().optional(),
    validate: z.boolean().optional()
  })
})

// Backup and Restore Schemas
export const createSettingsBackupSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Backup name is required').max(100, 'Backup name must be less than 100 characters'),
    description: z.string().max(500).optional(),
    includeUserPreferences: z.boolean().optional(),
    includeThemes: z.boolean().optional()
  })
})

export const restoreSettingsBackupSchema = z.object({
  params: z.object({
    backupId: z.string().uuid('Invalid backup ID format')
  }),
  body: z.object({
    overwrite: z.boolean().optional(),
    selectiveRestore: z.object({
      systemSettings: z.boolean().optional(),
      userPreferences: z.boolean().optional(),
      themes: z.boolean().optional(),
      configurations: z.boolean().optional()
    }).optional()
  })
})

export const getSettingsBackupsSchema = z.object({
  query: z.object({
    page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(50)).optional(),
    sortBy: z.enum(['createdAt', 'name', 'size']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
})

export const deleteSettingsBackupSchema = z.object({
  params: z.object({
    backupId: z.string().uuid('Invalid backup ID format')
  })
})

// Validation Schemas
export const validateSettingsSchema = z.object({
  body: z.object({
    settings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.any())]))
      .refine(settings => Object.keys(settings).length > 0, {
        message: 'At least one setting is required'
      }),
    strict: z.boolean().optional()
  })
})

// Notification Preference Schemas
export const updateNotificationPreferencesSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format').optional()
  }),
  body: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    notificationTypes: z.object({
      newComment: z.boolean().optional(),
      newFollower: z.boolean().optional(),
      postPublished: z.boolean().optional(),
      systemUpdates: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
      securityAlerts: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
      monthlyReport: z.boolean().optional()
    }).optional(),
    quietHours: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
      end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
      timezone: z.string().optional()
    }).optional()
  })
})

// Search Settings Schemas
export const searchSettingsSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(100, 'Search query must be less than 100 characters'),
    type: z.enum(['SYSTEM', 'USER', 'THEME', 'CONFIG', 'ALL']).optional(),
    category: z.string().min(1).max(50).optional(),
    page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(50)).optional()
  })
})

// Reset Settings Schemas
export const resetSettingsSchema = z.object({
  body: z.object({
    type: z.enum(['SYSTEM', 'USER', 'THEME', 'CONFIG'], {
      errorMap: () => ({ message: 'Type must be SYSTEM, USER, THEME, or CONFIG' })
    }),
    category: z.string().min(1).max(50).optional(),
    userId: z.string().uuid('Invalid user ID format').optional(),
    confirm: z.boolean().refine(val => val === true, {
      message: 'Confirmation is required to reset settings'
    })
  })
})

export type GetSystemSettingsInput = z.infer<typeof getSystemSettingsSchema>
export type UpdateSystemSettingInput = z.infer<typeof updateSystemSettingSchema>
export type BulkUpdateSystemSettingsInput = z.infer<typeof bulkUpdateSystemSettingsSchema>
export type GetUserPreferencesInput = z.infer<typeof getUserPreferencesSchema>
export type UpdateUserPreferenceInput = z.infer<typeof updateUserPreferenceSchema>
export type BulkUpdateUserPreferencesInput = z.infer<typeof bulkUpdateUserPreferencesSchema>
export type CreateThemeInput = z.infer<typeof createThemeSchema>
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>
export type GetThemeInput = z.infer<typeof getThemeSchema>
export type DeleteThemeInput = z.infer<typeof deleteThemeSchema>
export type GetConfigurationInput = z.infer<typeof getConfigurationSchema>
export type UpdateConfigurationInput = z.infer<typeof updateConfigurationSchema>
export type GetSettingHistoryInput = z.infer<typeof getSettingHistorySchema>
export type GetSettingAuditInput = z.infer<typeof getSettingAuditSchema>
export type ExportSettingsInput = z.infer<typeof exportSettingsSchema>
export type ImportSettingsInput = z.infer<typeof importSettingsSchema>
export type CreateSettingsBackupInput = z.infer<typeof createSettingsBackupSchema>
export type RestoreSettingsBackupInput = z.infer<typeof restoreSettingsBackupSchema>
export type GetSettingsBackupsInput = z.infer<typeof getSettingsBackupsSchema>
export type DeleteSettingsBackupInput = z.infer<typeof deleteSettingsBackupSchema>
export type ValidateSettingsInput = z.infer<typeof validateSettingsSchema>
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>
export type SearchSettingsInput = z.infer<typeof searchSettingsSchema>
export type ResetSettingsInput = z.infer<typeof resetSettingsSchema>