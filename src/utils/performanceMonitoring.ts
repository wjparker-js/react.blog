// Frontend Performance Monitoring with Core Web Vitals
interface PerformanceMetrics {
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  fcp: number // First Contentful Paint
  ttfb: number // Time to First Byte
  tti: number // Time to Interactive
}

interface PagePerformance {
  url: string
  metrics: Partial<PerformanceMetrics>
  timestamp: number
  userAgent: string
  connectionType?: string
  deviceMemory?: number
}

class PerformanceTracker {
  private metrics: Partial<PerformanceMetrics> = {}
  private endpoint = process.env.GATSBY_PERFORMANCE_API || 'http://localhost:3001/api/performance'
  private budget = {
    lcp: 2500,    // 2.5s
    fid: 100,     // 100ms
    cls: 0.1,     // 0.1
    fcp: 1800,    // 1.8s
    ttfb: 600,    // 600ms
    tti: 3800     // 3.8s
  }

  constructor() {
    this.initializeTracking()
  }

  private initializeTracking() {
    // Track Core Web Vitals using web-vitals library
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(this.onCLS.bind(this), true)
        getFID(this.onFID.bind(this))
        getFCP(this.onFCP.bind(this))
        getLCP(this.onLCP.bind(this), true)
        getTTFB(this.onTTFB.bind(this))
      })

      // Track Time to Interactive
      this.trackTTI()
      
      // Track page navigation performance
      this.trackNavigationTiming()
      
      // Track resource loading performance
      this.trackResourceTiming()
      
      // Monitor frame rate and janks
      this.trackFrameRate()
    }
  }

  private onCLS(metric: any) {
    this.metrics.cls = metric.value
    this.checkBudget('cls', metric.value)
    this.sendMetric('cls', metric.value)
  }

  private onFID(metric: any) {
    this.metrics.fid = metric.value
    this.checkBudget('fid', metric.value)
    this.sendMetric('fid', metric.value)
  }

  private onFCP(metric: any) {
    this.metrics.fcp = metric.value
    this.checkBudget('fcp', metric.value)
    this.sendMetric('fcp', metric.value)
  }

  private onLCP(metric: any) {
    this.metrics.lcp = metric.value
    this.checkBudget('lcp', metric.value)
    this.sendMetric('lcp', metric.value)
  }

  private onTTFB(metric: any) {
    this.metrics.ttfb = metric.value
    this.checkBudget('ttfb', metric.value)
    this.sendMetric('ttfb', metric.value)
  }

  private trackTTI() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            const tti = navEntry.domInteractive - navEntry.fetchStart
            this.metrics.tti = tti
            this.checkBudget('tti', tti)
            this.sendMetric('tti', tti)
          }
        }
      })
      observer.observe({ entryTypes: ['navigation'] })
    }
  }

  private trackNavigationTiming() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      const timings = {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        ssl: navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
        request: navigation.responseStart - navigation.requestStart,
        response: navigation.responseEnd - navigation.responseStart,
        dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        total: navigation.loadEventEnd - navigation.fetchStart
      }

      this.sendNavigationMetrics(timings)
    })
  }

  private trackResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const resources = list.getEntries().map(entry => ({
          name: entry.name,
          duration: entry.duration,
          size: (entry as any).transferSize || 0,
          type: this.getResourceType(entry.name)
        }))

        // Track slow resources
        const slowResources = resources.filter(r => r.duration > 1000)
        if (slowResources.length > 0) {
          this.sendSlowResourceAlert(slowResources)
        }
      })
      observer.observe({ entryTypes: ['resource'] })
    }
  }

  private trackFrameRate() {
    let frameCount = 0
    let lastTime = performance.now()
    
    const countFrames = () => {
      frameCount++
      const currentTime = performance.now()
      
      if (currentTime - lastTime >= 1000) {
        const fps = frameCount
        frameCount = 0
        lastTime = currentTime
        
        // Alert on low frame rate
        if (fps < 30) {
          console.warn(`⚠️ Low frame rate detected: ${fps} FPS`)
          this.sendMetric('fps', fps)
        }
      }
      
      requestAnimationFrame(countFrames)
    }
    
    requestAnimationFrame(countFrames)
  }

  private checkBudget(metric: keyof PerformanceMetrics, value: number) {
    const budgetValue = this.budget[metric]
    if (value > budgetValue) {
      console.warn(`⚠️ Performance budget exceeded for ${metric}: ${value} > ${budgetValue}`)
      this.sendBudgetAlert(metric, value, budgetValue)
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script'
    if (url.includes('.css')) return 'stylesheet'
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font'
    return 'other'
  }

  private async sendMetric(metric: string, value: number) {
    try {
      await fetch(`${this.endpoint}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          value,
          url: window.location.href,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          connectionType: (navigator as any).connection?.effectiveType,
          deviceMemory: (navigator as any).deviceMemory
        })
      })
    } catch (error) {
      console.error('Failed to send performance metric:', error)
    }
  }

  private async sendNavigationMetrics(timings: Record<string, number>) {
    try {
      await fetch(`${this.endpoint}/navigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timings,
          url: window.location.href,
          timestamp: Date.now()
        })
      })
    } catch (error) {
      console.error('Failed to send navigation metrics:', error)
    }
  }

  private async sendBudgetAlert(metric: string, value: number, budget: number) {
    try {
      await fetch(`${this.endpoint}/budget-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          value,
          budget,
          url: window.location.href,
          timestamp: Date.now(),
          severity: value > budget * 1.5 ? 'high' : 'medium'
        })
      })
    } catch (error) {
      console.error('Failed to send budget alert:', error)
    }
  }

  private async sendSlowResourceAlert(resources: any[]) {
    try {
      await fetch(`${this.endpoint}/slow-resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resources,
          url: window.location.href,
          timestamp: Date.now()
        })
      })
    } catch (error) {
      console.error('Failed to send slow resource alert:', error)
    }
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics }
  }

  getBudgetStatus() {
    return Object.entries(this.budget).map(([metric, budget]) => ({
      metric,
      budget,
      current: this.metrics[metric as keyof PerformanceMetrics] || 0,
      status: (this.metrics[metric as keyof PerformanceMetrics] || 0) <= budget ? 'pass' : 'fail'
    }))
  }
}

// Global performance tracker
export const performanceTracker = new PerformanceTracker()

// Hook for React components
export const usePerformance = () => {
  return {
    metrics: performanceTracker.getMetrics(),
    budgetStatus: performanceTracker.getBudgetStatus()
  }
} 
} 