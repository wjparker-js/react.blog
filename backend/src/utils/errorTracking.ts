import * as Sentry from '@sentry/node'
import { Request, Response, NextFunction } from 'express'
import { logger } from './logger'

// Initialize Sentry
export const initializeErrorTracking = () => {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend: (event) => {
        // Don't send events in test environment
        if (process.env.NODE_ENV === 'test') return null
        
        // Filter out sensitive data
        if (event.request?.data) {
          const sensitiveFields = ['password', 'token', 'secret', 'key']
          const data = event.request.data
          
          if (typeof data === 'object') {
            sensitiveFields.forEach(field => {
              if (data[field]) {
                data[field] = '[REDACTED]'
              }
            })
          }
        }
        
        return event
      }
    })
  }
}

interface ErrorContext {
  userId?: string
  ip: string
  userAgent?: string
  endpoint: string
  method: string
  body?: any
  query?: any
  params?: any
  timestamp: string
}

interface SecurityEvent {
  type: 'AUTH_FAILURE' | 'RATE_LIMIT' | 'INVALID_INPUT' | 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  context: ErrorContext
  details: string
}

class ErrorTracker {
  private securityEvents: SecurityEvent[] = []
  private readonly maxEvents = 1000

  logSecurityEvent(event: SecurityEvent) {
    this.securityEvents.push(event)
    
    // Keep only recent events
    if (this.securityEvents.length > this.maxEvents) {
      this.securityEvents = this.securityEvents.slice(-this.maxEvents)
    }

    // Log based on severity
    const logData = {
      type: event.type,
      severity: event.severity,
      details: event.details,
      context: event.context
    }

    switch (event.severity) {
      case 'CRITICAL':
        logger.error('CRITICAL Security Event', logData)
        this.alertSecurity(event)
        break
      case 'HIGH':
        logger.error('HIGH Security Event', logData)
        break
      case 'MEDIUM':
        logger.warn('MEDIUM Security Event', logData)
        break
      case 'LOW':
        logger.info('LOW Security Event', logData)
        break
    }
  }

  private alertSecurity(event: SecurityEvent) {
    // In production, integrate with services like:
    // - Slack/Discord webhooks
    // - Email alerts
    // - PagerDuty
    // - Sentry
    
    console.log('🚨 CRITICAL SECURITY ALERT:', event.details)
  }

  getRecentEvents(limit = 50): SecurityEvent[] {
    return this.securityEvents.slice(-limit)
  }

  getEventsByType(type: SecurityEvent['type'], limit = 50): SecurityEvent[] {
    return this.securityEvents
      .filter(event => event.type === type)
      .slice(-limit)
  }
}

export const errorTracker = new ErrorTracker()

// Enhanced error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const context: ErrorContext = {
    userId: (req as any).user?.id,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent'),
    endpoint: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString()
  }

  // Determine error severity and type
  let severity: SecurityEvent['severity'] = 'LOW'
  let type: SecurityEvent['type'] = 'SUSPICIOUS_ACTIVITY'

  if (error.name === 'UnauthorizedError') {
    type = 'UNAUTHORIZED_ACCESS'
    severity = 'MEDIUM'
  } else if (error.message.includes('rate limit')) {
    type = 'RATE_LIMIT'
    severity = 'LOW'
  } else if (error.message.includes('validation')) {
    type = 'INVALID_INPUT'
    severity = 'LOW'
  } else if (error.stack?.includes('auth')) {
    type = 'AUTH_FAILURE'
    severity = 'HIGH'
  }

  // Log security event
  errorTracker.logSecurityEvent({
    type,
    severity,
    context,
    details: error.message
  })

  // Send appropriate response
  if (res.headersSent) {
    return next(error)
  }

  const statusCode = (error as any).statusCode || (error as any).status || 500
  const isDevelopment = process.env.NODE_ENV === 'development'

  res.status(statusCode).json({
    error: isDevelopment ? error.message : 'Internal server error',
    timestamp: context.timestamp,
    ...(isDevelopment && { stack: error.stack })
  })
}

// Security metrics endpoint (admin only)
export const getSecurityMetrics = (req: Request, res: Response) => {
  const recentEvents = errorTracker.getRecentEvents(100)
  
  const metrics = {
    totalEvents: recentEvents.length,
    eventsByType: {
      AUTH_FAILURE: errorTracker.getEventsByType('AUTH_FAILURE', 50).length,
      RATE_LIMIT: errorTracker.getEventsByType('RATE_LIMIT', 50).length,
      INVALID_INPUT: errorTracker.getEventsByType('INVALID_INPUT', 50).length,
      UNAUTHORIZED_ACCESS: errorTracker.getEventsByType('UNAUTHORIZED_ACCESS', 50).length,
      SUSPICIOUS_ACTIVITY: errorTracker.getEventsByType('SUSPICIOUS_ACTIVITY', 50).length
    },
    eventsBySeverity: {
      CRITICAL: recentEvents.filter(e => e.severity === 'CRITICAL').length,
      HIGH: recentEvents.filter(e => e.severity === 'HIGH').length,
      MEDIUM: recentEvents.filter(e => e.severity === 'MEDIUM').length,
      LOW: recentEvents.filter(e => e.severity === 'LOW').length
    },
    recentEvents: recentEvents.slice(-20)
  }

  res.json(metrics)
}

// Performance monitoring
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint()

  res.on('finish', () => {
    const endTime = process.hrtime.bigint()
    const duration = Number(endTime - startTime) / 1000000 // Convert to milliseconds

    // Log slow requests
    if (duration > 1000) { // Requests taking more than 1 second
      console.warn('Slow request detected:', {
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent')
      })

      // Send to monitoring service
      if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb({
          message: 'Slow API request',
          level: 'warning',
          data: {
            url: req.path,
            method: req.method,
            duration: duration,
            statusCode: res.statusCode
          }
        })
      }
    }
  })

  next()
} 