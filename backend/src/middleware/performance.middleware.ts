import { Request, Response, NextFunction } from 'express'
import { redis } from '@/config/redis'
import { performance } from 'perf_hooks'

interface PerformanceData {
  method: string
  path: string
  duration: number
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
  timestamp: number
  statusCode: number
  contentLength: number
}

class BackendPerformanceMonitor {
  private metrics: PerformanceData[] = []
  private slowRequestThreshold = 1000 // 1 second
  private memoryLeakThreshold = 500 * 1024 * 1024 // 500MB

  trackRequest(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()
    const startCpu = process.cpuUsage()

    res.on('finish', () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      const endMemory = process.memoryUsage()
      const endCpu = process.cpuUsage(startCpu)

      const perfData: PerformanceData = {
        method: req.method,
        path: req.path,
        duration,
        memoryUsage: endMemory,
        cpuUsage: endCpu,
        timestamp: Date.now(),
        statusCode: res.statusCode,
        contentLength: parseInt(res.get('Content-Length') || '0')
      }

      this.recordMetrics(perfData)
      this.checkPerformanceAlerts(perfData)
    })

    next()
  }

  private recordMetrics(data: PerformanceData) {
    // Keep last 1000 requests in memory
    this.metrics.push(data)
    if (this.metrics.length > 1000) {
      this.metrics.shift()
    }

    // Store in Redis for persistence
    redis.lpush('performance:requests', JSON.stringify(data))
    redis.ltrim('performance:requests', 0, 10000) // Keep last 10k requests

    // Update aggregated stats
    this.updateAggregatedStats(data)
  }

  private async updateAggregatedStats(data: PerformanceData) {
    const key = `perf:${data.method}:${data.path.replace(/\/\d+/g, '/:id')}`
    const stats = await redis.hgetall(key) || {}
    
    const count = parseInt(stats.count || '0') + 1
    const totalDuration = parseFloat(stats.totalDuration || '0') + data.duration
    const avgDuration = totalDuration / count
    const maxDuration = Math.max(parseFloat(stats.maxDuration || '0'), data.duration)

    await redis.hset(key, {
      count: count.toString(),
      totalDuration: totalDuration.toString(),
      avgDuration: avgDuration.toString(),
      maxDuration: maxDuration.toString(),
      lastUpdated: Date.now().toString()
    })

    // Set expiration for stats (7 days)
    await redis.expire(key, 7 * 24 * 60 * 60)
  }

  private checkPerformanceAlerts(data: PerformanceData) {
    // Slow request alert
    if (data.duration > this.slowRequestThreshold) {
      console.warn('Slow request detected:', {
        path: data.path,
        method: data.method,
        duration: `${data.duration.toFixed(2)}ms`,
        statusCode: data.statusCode
      })

      this.sendAlert('SLOW_REQUEST', {
        path: data.path,
        duration: data.duration,
        threshold: this.slowRequestThreshold
      })
    }

    // Memory leak detection
    if (data.memoryUsage.heapUsed > this.memoryLeakThreshold) {
      console.warn('High memory usage detected:', {
        heapUsed: `${(data.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(data.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`
      })

      this.sendAlert('HIGH_MEMORY', {
        heapUsed: data.memoryUsage.heapUsed,
        threshold: this.memoryLeakThreshold
      })
    }

    // High CPU usage detection
    if (data.cpuUsage.user > 100000) { // 100ms of user CPU time
      console.warn('High CPU usage detected:', {
        userCpu: `${(data.cpuUsage.user / 1000).toFixed(2)}ms`,
        systemCpu: `${(data.cpuUsage.system / 1000).toFixed(2)}ms`
      })
    }
  }

  private async sendAlert(type: string, data: any) {
    if (process.env.PERFORMANCE_WEBHOOK_URL) {
      try {
        await fetch(process.env.PERFORMANCE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            data,
            timestamp: new Date().toISOString(),
            service: 'backend-api'
          })
        })
      } catch (error) {
        console.error('Failed to send performance alert:', error)
      }
    }
  }

  getStats() {
    if (this.metrics.length === 0) return null

    const durations = this.metrics.map(m => m.duration)
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)]

    return {
      totalRequests: this.metrics.length,
      avgDuration: parseFloat(avgDuration.toFixed(2)),
      p95Duration: parseFloat(p95Duration.toFixed(2)),
      slowRequests: this.metrics.filter(m => m.duration > this.slowRequestThreshold).length,
      errorRate: this.metrics.filter(m => m.statusCode >= 400).length / this.metrics.length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  }
}

export const performanceMonitor = new BackendPerformanceMonitor()

// Middleware function
export const performanceTracking = (req: Request, res: Response, next: NextFunction) => {
  performanceMonitor.trackRequest(req, res, next)
} 