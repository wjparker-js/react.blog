import { PrismaClient, SettingType } from '@prisma/client'
import { redisClient } from '@/config/redis'
import { logger } from '@/utils/logger'

const prisma = new PrismaClient()

interface SystemSettings {
  site: {
    title: string
    description: string
    url: string
    logo?: string
    favicon?: string
    language: string
    timezone: string
  }
  content: {
    allowGuestComments: boolean
    moderateComments: boolean
    postsPerPage: number
    excerptLength: number
    defaultPostStatus: string
    allowRegistration: boolean
  }
  email: {
    fromName: string
    fromEmail: string
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPassword: string
    smtpSecure: boolean
  }
  social: {
    enableSharing: boolean
    enableSocialLogin: boolean
    platforms: string[]
    twitterHandle?: string
    facebookPage?: string
    instagramHandle?: string
  }
  seo: {
    enableSitemap: boolean
    enableRobots: boolean
    metaDescription: string
    metaKeywords: string[]
    analyticsId?: string
    searchConsoleId?: string
  }
  security: {
    enableTwoFactor: boolean
    passwordMinLength: number
    sessionTimeout: number
    maxLoginAttempts: number
    enableCaptcha: boolean
  }
  performance: {
    enableCaching: boolean
    cacheTimeout: number
    enableCompression: boolean
    enableCdn: boolean
    cdnUrl?: string
  }
  maintenance: {
    maintenanceMode: boolean
    maintenanceMessage: string
    allowedIps: string[]
  }
}

interface UserPreferences {
  general: {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: string
  }
  notifications: {
    emailNotifications: boolean
    pushNotifications: boolean
    smsNotifications: boolean
    notificationTypes: {
      newComment: boolean
      newFollower: boolean
      postPublished: boolean
      systemUpdates: boolean
      marketingEmails: boolean
    }
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'followers'
    showEmail: boolean
    showLastSeen: boolean
    allowDirectMessages: boolean
    allowTagging: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'auto'
    accentColor: string
    fontSize: 'small' | 'medium' | 'large'
    compactMode: boolean
    animations: boolean
  }
  editor: {
    defaultEditor: 'rich' | 'markdown' | 'html'
    autoSave: boolean
    autoSaveInterval: number
    enableSpellCheck: boolean
    wordWrap: boolean
  }
  dashboard: {
    widgets: string[]
    layout: 'grid' | 'list'
    itemsPerPage: number
    showWelcomeMessage: boolean
  }
}

interface ThemeConfiguration {
  name: string
  displayName: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    success: string
    warning: string
    error: string
    info: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
      '2xl': string
      '3xl': string
    }
    fontWeight: {
      light: number
      normal: number
      medium: number
      semibold: number
      bold: number
    }
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
    full: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
}

export class SettingsService {
  private readonly CACHE_TTL = 3600 // 1 hour
  private readonly USER_PREFERENCES_CACHE_TTL = 1800 // 30 minutes

  // System Settings Management
  async getSystemSettings(): Promise<SystemSettings> {
    const cacheKey = 'system_settings'
    
    try {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      logger.warn('Failed to get system settings from cache:', error)
    }

    try {
      const settings = await prisma.setting.findMany({
        where: { type: 'SYSTEM' }
      })

      const systemSettings = this.buildSystemSettings(settings)

      // Cache the results
      try {
        await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(systemSettings))
      } catch (error) {
        logger.warn('Failed to cache system settings:', error)
      }

      return systemSettings
    } catch (error) {
      logger.error('Failed to get system settings:', error)
      throw new Error('Failed to retrieve system settings')
    }
  }

  async updateSystemSetting(key: string, value: any, updatedBy: string): Promise<void> {
    try {
      await prisma.setting.upsert({
        where: { key },
        update: {
          value: typeof value === 'string' ? value : JSON.stringify(value),
          updatedBy,
          updatedAt: new Date()
        },
        create: {
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          type: 'SYSTEM',
          createdBy: updatedBy,
          updatedBy
        }
      })

      // Clear cache
      await this.clearSystemSettingsCache()

      // Log activity
      await this.logSettingChange(key, value, updatedBy, 'SYSTEM')

      logger.info(`System setting updated: ${key} by user ${updatedBy}`)
    } catch (error) {
      logger.error('Failed to update system setting:', error)
      throw new Error('Failed to update system setting')
    }
  }

  async bulkUpdateSystemSettings(settings: Record<string, any>, updatedBy: string): Promise<void> {
    try {
      const operations = Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: {
            value: typeof value === 'string' ? value : JSON.stringify(value),
            updatedBy,
            updatedAt: new Date()
          },
          create: {
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            type: 'SYSTEM',
            createdBy: updatedBy,
            updatedBy
          }
        })
      )

      await Promise.all(operations)

      // Clear cache
      await this.clearSystemSettingsCache()

      // Log activity
      for (const [key, value] of Object.entries(settings)) {
        await this.logSettingChange(key, value, updatedBy, 'SYSTEM')
      }

      logger.info(`Bulk system settings updated by user ${updatedBy}`)
    } catch (error) {
      logger.error('Failed to bulk update system settings:', error)
      throw new Error('Failed to bulk update system settings')
    }
  }

  // User Preferences Management
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const cacheKey = `user_preferences:${userId}`
    
    try {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      logger.warn('Failed to get user preferences from cache:', error)
    }

    try {
      const settings = await prisma.setting.findMany({
        where: {
          type: 'USER',
          createdBy: userId
        }
      })

      const preferences = this.buildUserPreferences(settings)

      // Cache the results
      try {
        await redisClient.setex(cacheKey, this.USER_PREFERENCES_CACHE_TTL, JSON.stringify(preferences))
      } catch (error) {
        logger.warn('Failed to cache user preferences:', error)
      }

      return preferences
    } catch (error) {
      logger.error('Failed to get user preferences:', error)
      throw new Error('Failed to retrieve user preferences')
    }
  }

  async updateUserPreference(userId: string, key: string, value: any): Promise<void> {
    try {
      const settingKey = `user.${userId}.${key}`

      await prisma.setting.upsert({
        where: { key: settingKey },
        update: {
          value: typeof value === 'string' ? value : JSON.stringify(value),
          updatedAt: new Date()
        },
        create: {
          key: settingKey,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          type: 'USER',
          createdBy: userId,
          updatedBy: userId
        }
      })

      // Clear cache
      await this.clearUserPreferencesCache(userId)

      logger.info(`User preference updated: ${key} for user ${userId}`)
    } catch (error) {
      logger.error('Failed to update user preference:', error)
      throw new Error('Failed to update user preference')
    }
  }

  async bulkUpdateUserPreferences(userId: string, preferences: Record<string, any>): Promise<void> {
    try {
      const operations = Object.entries(preferences).map(([key, value]) => {
        const settingKey = `user.${userId}.${key}`
        return prisma.setting.upsert({
          where: { key: settingKey },
          update: {
            value: typeof value === 'string' ? value : JSON.stringify(value),
            updatedAt: new Date()
          },
          create: {
            key: settingKey,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            type: 'USER',
            createdBy: userId,
            updatedBy: userId
          }
        })
      })

      await Promise.all(operations)

      // Clear cache
      await this.clearUserPreferencesCache(userId)

      logger.info(`Bulk user preferences updated for user ${userId}`)
    } catch (error) {
      logger.error('Failed to bulk update user preferences:', error)
      throw new Error('Failed to bulk update user preferences')
    }
  }

  // Theme Management
  async getThemes(): Promise<ThemeConfiguration[]> {
    try {
      const themes = await prisma.setting.findMany({
        where: {
          type: 'THEME',
          key: { startsWith: 'theme.' }
        }
      })

      return themes.map(theme => JSON.parse(theme.value))
    } catch (error) {
      logger.error('Failed to get themes:', error)
      throw new Error('Failed to retrieve themes')
    }
  }

  async getTheme(name: string): Promise<ThemeConfiguration | null> {
    try {
      const theme = await prisma.setting.findUnique({
        where: { key: `theme.${name}` }
      })

      return theme ? JSON.parse(theme.value) : null
    } catch (error) {
      logger.error('Failed to get theme:', error)
      throw new Error('Failed to retrieve theme')
    }
  }

  async createTheme(theme: ThemeConfiguration, createdBy: string): Promise<void> {
    try {
      await prisma.setting.create({
        data: {
          key: `theme.${theme.name}`,
          value: JSON.stringify(theme),
          type: 'THEME',
          createdBy,
          updatedBy: createdBy
        }
      })

      logger.info(`Theme created: ${theme.name} by user ${createdBy}`)
    } catch (error) {
      logger.error('Failed to create theme:', error)
      throw new Error('Failed to create theme')
    }
  }

  async updateTheme(name: string, theme: ThemeConfiguration, updatedBy: string): Promise<void> {
    try {
      await prisma.setting.update({
        where: { key: `theme.${name}` },
        data: {
          value: JSON.stringify(theme),
          updatedBy,
          updatedAt: new Date()
        }
      })

      logger.info(`Theme updated: ${name} by user ${updatedBy}`)
    } catch (error) {
      logger.error('Failed to update theme:', error)
      throw new Error('Failed to update theme')
    }
  }

  async deleteTheme(name: string): Promise<void> {
    try {
      await prisma.setting.delete({
        where: { key: `theme.${name}` }
      })

      logger.info(`Theme deleted: ${name}`)
    } catch (error) {
      logger.error('Failed to delete theme:', error)
      throw new Error('Failed to delete theme')
    }
  }

  // Configuration Management
  async getConfiguration(category?: string): Promise<Record<string, any>> {
    try {
      const whereClause: any = { type: 'CONFIG' }
      if (category) {
        whereClause.key = { startsWith: `config.${category}.` }
      }

      const configs = await prisma.setting.findMany({
        where: whereClause
      })

      const configuration: Record<string, any> = {}
      configs.forEach(config => {
        const value = this.parseSettingValue(config.value)
        configuration[config.key] = value
      })

      return configuration
    } catch (error) {
      logger.error('Failed to get configuration:', error)
      throw new Error('Failed to retrieve configuration')
    }
  }

  async updateConfiguration(key: string, value: any, updatedBy: string): Promise<void> {
    try {
      await prisma.setting.upsert({
        where: { key },
        update: {
          value: typeof value === 'string' ? value : JSON.stringify(value),
          updatedBy,
          updatedAt: new Date()
        },
        create: {
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          type: 'CONFIG',
          createdBy: updatedBy,
          updatedBy
        }
      })

      // Log activity
      await this.logSettingChange(key, value, updatedBy, 'CONFIG')

      logger.info(`Configuration updated: ${key} by user ${updatedBy}`)
    } catch (error) {
      logger.error('Failed to update configuration:', error)
      throw new Error('Failed to update configuration')
    }
  }

  // Setting History and Audit
  async getSettingHistory(key: string, limit: number = 50): Promise<any[]> {
    try {
      const history = await prisma.activityLog.findMany({
        where: {
          action: 'SETTING_CHANGED',
          metadata: {
            path: ['settingKey'],
            equals: key
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      return history
    } catch (error) {
      logger.error('Failed to get setting history:', error)
      throw new Error('Failed to retrieve setting history')
    }
  }

  async exportSettings(type?: SettingType): Promise<Record<string, any>> {
    try {
      const whereClause: any = {}
      if (type) {
        whereClause.type = type
      }

      const settings = await prisma.setting.findMany({
        where: whereClause
      })

      const exportData: Record<string, any> = {}
      settings.forEach(setting => {
        exportData[setting.key] = this.parseSettingValue(setting.value)
      })

      return exportData
    } catch (error) {
      logger.error('Failed to export settings:', error)
      throw new Error('Failed to export settings')
    }
  }

  async importSettings(settings: Record<string, any>, importedBy: string): Promise<void> {
    try {
      const operations = Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: {
            value: typeof value === 'string' ? value : JSON.stringify(value),
            updatedBy: importedBy,
            updatedAt: new Date()
          },
          create: {
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            type: this.determineSettingType(key),
            createdBy: importedBy,
            updatedBy: importedBy
          }
        })
      )

      await Promise.all(operations)

      // Clear all caches
      await this.clearAllSettingsCache()

      logger.info(`Settings imported by user ${importedBy}`)
    } catch (error) {
      logger.error('Failed to import settings:', error)
      throw new Error('Failed to import settings')
    }
  }

  // Helper methods
  private buildSystemSettings(settings: any[]): SystemSettings {
    const defaults: SystemSettings = {
      site: {
        title: 'My Blog',
        description: 'A modern blog powered by Gatsby',
        url: 'https://example.com',
        language: 'en',
        timezone: 'UTC'
      },
      content: {
        allowGuestComments: true,
        moderateComments: true,
        postsPerPage: 10,
        excerptLength: 200,
        defaultPostStatus: 'DRAFT',
        allowRegistration: true
      },
      email: {
        fromName: 'My Blog',
        fromEmail: 'noreply@example.com',
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpSecure: true
      },
      social: {
        enableSharing: true,
        enableSocialLogin: false,
        platforms: ['twitter', 'facebook', 'linkedin']
      },
      seo: {
        enableSitemap: true,
        enableRobots: true,
        metaDescription: '',
        metaKeywords: []
      },
      security: {
        enableTwoFactor: false,
        passwordMinLength: 8,
        sessionTimeout: 86400,
        maxLoginAttempts: 5,
        enableCaptcha: false
      },
      performance: {
        enableCaching: true,
        cacheTimeout: 3600,
        enableCompression: true,
        enableCdn: false
      },
      maintenance: {
        maintenanceMode: false,
        maintenanceMessage: 'Site is under maintenance',
        allowedIps: []
      }
    }

    // Override defaults with actual settings
    settings.forEach(setting => {
      const value = this.parseSettingValue(setting.value)
      this.setNestedValue(defaults, setting.key, value)
    })

    return defaults
  }

  private buildUserPreferences(settings: any[]): UserPreferences {
    const defaults: UserPreferences = {
      general: {
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h'
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: false,
        smsNotifications: false,
        notificationTypes: {
          newComment: true,
          newFollower: true,
          postPublished: true,
          systemUpdates: false,
          marketingEmails: false
        }
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showLastSeen: true,
        allowDirectMessages: true,
        allowTagging: true
      },
      appearance: {
        theme: 'light',
        accentColor: '#3b82f6',
        fontSize: 'medium',
        compactMode: false,
        animations: true
      },
      editor: {
        defaultEditor: 'rich',
        autoSave: true,
        autoSaveInterval: 30,
        enableSpellCheck: true,
        wordWrap: true
      },
      dashboard: {
        widgets: ['stats', 'activity', 'posts'],
        layout: 'grid',
        itemsPerPage: 20,
        showWelcomeMessage: true
      }
    }

    // Override defaults with actual settings
    settings.forEach(setting => {
      const key = setting.key.replace(/^user\.\w+\./, '') // Remove user.{userId}. prefix
      const value = this.parseSettingValue(setting.value)
      this.setNestedValue(defaults, key, value)
    })

    return defaults
  }

  private parseSettingValue(value: string): any {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {}
      }
      current = current[keys[i]]
    }

    current[keys[keys.length - 1]] = value
  }

  private determineSettingType(key: string): SettingType {
    if (key.startsWith('user.')) return 'USER'
    if (key.startsWith('theme.')) return 'THEME'
    if (key.startsWith('config.')) return 'CONFIG'
    return 'SYSTEM'
  }

  private async logSettingChange(key: string, value: any, userId: string, type: string): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'SETTING_CHANGED',
          resourceType: 'Setting',
          resourceId: key,
          metadata: {
            settingKey: key,
            settingType: type,
            newValue: value
          }
        }
      })
    } catch (error) {
      logger.warn('Failed to log setting change:', error)
    }
  }

  private async clearSystemSettingsCache(): Promise<void> {
    try {
      await redisClient.del('system_settings')
    } catch (error) {
      logger.warn('Failed to clear system settings cache:', error)
    }
  }

  private async clearUserPreferencesCache(userId: string): Promise<void> {
    try {
      await redisClient.del(`user_preferences:${userId}`)
    } catch (error) {
      logger.warn('Failed to clear user preferences cache:', error)
    }
  }

  private async clearAllSettingsCache(): Promise<void> {
    try {
      const keys = await redisClient.keys('*settings*')
      if (keys.length > 0) {
        await redisClient.del(...keys)
      }
    } catch (error) {
      logger.warn('Failed to clear all settings cache:', error)
    }
  }
}

export const settingsService = new SettingsService()