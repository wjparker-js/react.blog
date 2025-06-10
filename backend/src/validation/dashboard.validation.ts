import { z } from 'zod'

// Analytics query validation
export const analyticsQuerySchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'year']).default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metrics: z.array(z.enum(['views', 'posts', 'comments', 'users'])).optional(),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).optional()
})

// Dashboard filters validation
export const dashboardFiltersSchema = z.object({
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  category: z.string().uuid().optional(),
  author: z.string().uuid().optional(),
  status: z.enum(['published', 'draft', 'scheduled']).optional()
})

// Top content query validation
export const topContentQuerySchema = z.object({
  type: z.enum(['posts', 'categories', 'tags', 'authors']),
  timeframe: z.enum(['day', 'week', 'month', 'year', 'all']).default('month'),
  limit: z.coerce.number().min(1).max(50).default(10),
  sortBy: z.enum(['views', 'comments', 'shares', 'engagement']).default('views')
})

// System metrics query validation
export const systemMetricsQuerySchema = z.object({
  metrics: z.array(z.enum(['cpu', 'memory', 'disk', 'network'])).optional(),
  timeframe: z.enum(['hour', 'day', 'week']).default('hour'),
  interval: z.coerce.number().min(1).max(60).default(5) // minutes
})

// User activity query validation
export const userActivityQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  activityType: z.enum(['login', 'post', 'comment', 'view', 'edit']).optional(),
  timeframe: z.enum(['day', 'week', 'month']).default('week'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
})

// Content performance query validation
export const contentPerformanceQuerySchema = z.object({
  postId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  timeframe: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  metrics: z.array(z.enum(['views', 'comments', 'shares', 'time_on_page', 'bounce_rate'])).optional()
})

// Moderation queue filters validation
export const moderationFiltersSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'spam']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignee: z.string().uuid().optional(),
  reportReason: z.enum(['spam', 'abuse', 'offensive', 'off-topic', 'other']).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
})

// Security alerts query validation
export const securityAlertsQuerySchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z.enum(['failed_login', 'suspicious_activity', 'system_alert', 'security_breach']).optional(),
  resolved: z.boolean().optional(),
  timeframe: z.enum(['hour', 'day', 'week', 'month']).default('week'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
})

// Report generation validation
export const reportGenerationSchema = z.object({
  type: z.enum(['analytics', 'content', 'users', 'security', 'performance']),
  format: z.enum(['pdf', 'csv', 'json', 'excel']).default('pdf'),
  timeframe: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  includeCharts: z.boolean().default(true),
  includeRawData: z.boolean().default(false),
  recipients: z.array(z.string().email()).optional(),
  schedule: z.object({
    frequency: z.enum(['once', 'daily', 'weekly', 'monthly']).default('once'),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM format
    dayOfWeek: z.number().min(0).max(6).optional(), // 0 = Sunday
    dayOfMonth: z.number().min(1).max(31).optional()
  }).optional()
})

// Dashboard widget configuration validation
export const widgetConfigSchema = z.object({
  type: z.enum(['stats', 'chart', 'table', 'metric', 'activity']),
  title: z.string().min(1).max(100),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  position: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().min(1),
    height: z.number().min(1)
  }),
  config: z.object({
    metric: z.string().optional(),
    timeframe: z.enum(['day', 'week', 'month', 'year']).optional(),
    chartType: z.enum(['line', 'bar', 'pie', 'area', 'donut']).optional(),
    filters: z.record(z.any()).optional(),
    refreshInterval: z.number().min(30).max(3600).optional() // seconds
  }),
  isVisible: z.boolean().default(true)
})

// Dashboard layout validation
export const dashboardLayoutSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  widgets: z.array(widgetConfigSchema),
  permissions: z.array(z.enum(['admin', 'moderator', 'author', 'viewer'])).default(['admin'])
})

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>
export type TopContentQuery = z.infer<typeof topContentQuerySchema>
export type SystemMetricsQuery = z.infer<typeof systemMetricsQuerySchema>
export type UserActivityQuery = z.infer<typeof userActivityQuerySchema>
export type ContentPerformanceQuery = z.infer<typeof contentPerformanceQuerySchema>
export type ModerationFilters = z.infer<typeof moderationFiltersSchema>
export type SecurityAlertsQuery = z.infer<typeof securityAlertsQuerySchema>
export type ReportGeneration = z.infer<typeof reportGenerationSchema>
export type WidgetConfig = z.infer<typeof widgetConfigSchema>
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema> 