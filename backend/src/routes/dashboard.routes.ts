import { Router } from 'express'
import { authMiddleware } from '@/middleware/auth'
import { permissionMiddleware } from '@/middleware/permissions'
import { validateRequest } from '@/middleware/validation'
import { dashboardService } from '@/services/dashboard.service'
import {
  analyticsQuerySchema,
  dashboardFiltersSchema,
  topContentQuerySchema,
  systemMetricsQuerySchema,
  userActivityQuerySchema,
  contentPerformanceQuerySchema,
  moderationFiltersSchema,
  securityAlertsQuerySchema,
  reportGenerationSchema,
  widgetConfigSchema,
  dashboardLayoutSchema,
  type AnalyticsQuery,
  type DashboardFilters,
  type TopContentQuery,
  type SystemMetricsQuery,
  type UserActivityQuery,
  type ContentPerformanceQuery,
  type ModerationFilters,
  type SecurityAlertsQuery,
  type ReportGeneration,
  type WidgetConfig,
  type DashboardLayout
} from '@/validation/dashboard.validation'
import { asyncHandler } from '@/utils/asyncHandler'
import { ApiResponse } from '@/types/api'

const router = Router()

// Get dashboard overview stats
router.get('/stats',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  asyncHandler(async (req, res) => {
    const stats = await dashboardService.getDashboardStats()
    
    res.json({
      success: true,
      data: stats,
      message: 'Dashboard statistics retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Get analytics data
router.get('/analytics',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ query: analyticsQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as AnalyticsQuery
    const analytics = await dashboardService.getAnalytics(query.timeframe)
    
    res.json({
      success: true,
      data: analytics,
      message: 'Analytics data retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Get top performing content
router.get('/top-content',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator', 'author']),
  validateRequest({ query: topContentQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as TopContentQuery
    const { type, timeframe, limit, sortBy } = query
    
    let topContent
    switch (type) {
      case 'posts':
        topContent = await dashboardService.getTopPosts(timeframe, limit, sortBy)
        break
      case 'categories':
        topContent = await dashboardService.getTopCategories(timeframe, limit)
        break
      case 'tags':
        topContent = await dashboardService.getTopTags(timeframe, limit)
        break
      case 'authors':
        topContent = await dashboardService.getTopAuthors(timeframe, limit)
        break
    }
    
    res.json({
      success: true,
      data: topContent,
      message: `Top ${type} retrieved successfully`
    } satisfies ApiResponse)
  })
)

// Get system health metrics
router.get('/system/health',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const health = await dashboardService.getSystemHealth()
    
    res.json({
      success: true,
      data: health,
      message: 'System health retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Get system performance metrics
router.get('/system/metrics',
  authMiddleware,
  permissionMiddleware(['admin']),
  validateRequest({ query: systemMetricsQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as SystemMetricsQuery
    const metrics = await dashboardService.getSystemMetrics(query)
    
    res.json({
      success: true,
      data: metrics,
      message: 'System metrics retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Get user activity data
router.get('/activity/users',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ query: userActivityQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as UserActivityQuery
    const activity = await dashboardService.getUserActivity(query)
    
    res.json({
      success: true,
      data: activity.activities,
      pagination: activity.pagination,
      message: 'User activity retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Get content performance metrics
router.get('/content/performance',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator', 'author']),
  validateRequest({ query: contentPerformanceQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as ContentPerformanceQuery
    const performance = await dashboardService.getContentPerformance(query)
    
    res.json({
      success: true,
      data: performance,
      message: 'Content performance retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Get moderation queue
router.get('/moderation/queue',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ query: moderationFiltersSchema }),
  asyncHandler(async (req, res) => {
    const filters = req.query as ModerationFilters
    const queue = await dashboardService.getModerationQueue(filters)
    
    res.json({
      success: true,
      data: queue,
      message: 'Moderation queue retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Get security alerts
router.get('/security/alerts',
  authMiddleware,
  permissionMiddleware(['admin']),
  validateRequest({ query: securityAlertsQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as SecurityAlertsQuery
    const alerts = await dashboardService.getSecurityAlerts(query)
    
    res.json({
      success: true,
      data: alerts,
      message: 'Security alerts retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Generate reports
router.post('/reports/generate',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ body: reportGenerationSchema }),
  asyncHandler(async (req, res) => {
    const reportConfig = req.body as ReportGeneration
    const report = await dashboardService.generateReport(reportConfig, req.user.id)
    
    if (reportConfig.format === 'json') {
      res.json({
        success: true,
        data: report,
        message: 'Report generated successfully'
      } satisfies ApiResponse)
    } else {
      // For non-JSON formats, return the file
      const fileName = `report-${reportConfig.type}-${Date.now()}.${reportConfig.format}`
      
      res.setHeader('Content-Type', getContentType(reportConfig.format))
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`)
      res.send(report)
    }
  })
)

// Get report history
router.get('/reports/history',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query
    const reports = await dashboardService.getReportHistory(
      Number(page),
      Number(limit),
      req.user.id
    )
    
    res.json({
      success: true,
      data: reports.reports,
      pagination: reports.pagination,
      message: 'Report history retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Real-time dashboard data (WebSocket endpoint would be better)
router.get('/realtime/stats',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  asyncHandler(async (req, res) => {
    const realtimeStats = await dashboardService.getRealtimeStats()
    
    res.json({
      success: true,
      data: realtimeStats,
      message: 'Real-time statistics retrieved successfully'
    } satisfies ApiResponse)
  })
)

// Dashboard widgets management
router.get('/widgets',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  asyncHandler(async (req, res) => {
    const widgets = await dashboardService.getUserWidgets(req.user.id)
    
    res.json({
      success: true,
      data: widgets,
      message: 'Dashboard widgets retrieved successfully'
    } satisfies ApiResponse)
  })
)

router.post('/widgets',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ body: widgetConfigSchema }),
  asyncHandler(async (req, res) => {
    const widgetConfig = req.body as WidgetConfig
    const widget = await dashboardService.createWidget(widgetConfig, req.user.id)
    
    res.status(201).json({
      success: true,
      data: widget,
      message: 'Widget created successfully'
    } satisfies ApiResponse)
  })
)

router.put('/widgets/:id',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  validateRequest({ body: widgetConfigSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const widgetConfig = req.body as WidgetConfig
    const widget = await dashboardService.updateWidget(id, widgetConfig, req.user.id)
    
    res.json({
      success: true,
      data: widget,
      message: 'Widget updated successfully'
    } satisfies ApiResponse)
  })
)

router.delete('/widgets/:id',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    await dashboardService.deleteWidget(id, req.user.id)
    
    res.json({
      success: true,
      message: 'Widget deleted successfully'
    } satisfies ApiResponse)
  })
)

// Dashboard layouts management
router.get('/layouts',
  authMiddleware,
  permissionMiddleware(['admin', 'moderator']),
  asyncHandler(async (req, res) => {
    const layouts = await dashboardService.getDashboardLayouts(req.user.role)
    
    res.json({
      success: true,
      data: layouts,
      message: 'Dashboard layouts retrieved successfully'
    } satisfies ApiResponse)
  })
)

router.post('/layouts',
  authMiddleware,
  permissionMiddleware(['admin']),
  validateRequest({ body: dashboardLayoutSchema }),
  asyncHandler(async (req, res) => {
    const layoutConfig = req.body as DashboardLayout
    const layout = await dashboardService.createDashboardLayout(layoutConfig, req.user.id)
    
    res.status(201).json({
      success: true,
      data: layout,
      message: 'Dashboard layout created successfully'
    } satisfies ApiResponse)
  })
)

router.put('/layouts/:id',
  authMiddleware,
  permissionMiddleware(['admin']),
  validateRequest({ body: dashboardLayoutSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const layoutConfig = req.body as DashboardLayout
    const layout = await dashboardService.updateDashboardLayout(id, layoutConfig, req.user.id)
    
    res.json({
      success: true,
      data: layout,
      message: 'Dashboard layout updated successfully'
    } satisfies ApiResponse)
  })
)

router.delete('/layouts/:id',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params
    await dashboardService.deleteDashboardLayout(id, req.user.id)
    
    res.json({
      success: true,
      message: 'Dashboard layout deleted successfully'
    } satisfies ApiResponse)
  })
)

// Export dashboard data
router.get('/export',
  authMiddleware,
  permissionMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const { format = 'json', include = [] } = req.query as { 
      format?: 'json' | 'csv' | 'excel'
      include?: string[] 
    }
    
    const exportData = await dashboardService.exportDashboardData(
      Array.isArray(include) ? include : [include].filter(Boolean),
      format
    )
    
    const fileName = `dashboard-export-${Date.now()}.${format}`
    
    res.setHeader('Content-Type', getContentType(format))
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`)
    res.send(exportData)
  })
)

// Utility function for content types
function getContentType(format: string): string {
  switch (format) {
    case 'csv':
      return 'text/csv'
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'pdf':
      return 'application/pdf'
    default:
      return 'application/json'
  }
}

export { router as dashboardRoutes } 