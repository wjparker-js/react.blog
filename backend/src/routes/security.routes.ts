import { Router } from 'express'
import { enhancedAuth } from '@/middleware/auth.security'
import { prisma } from '@/prisma/client'
import { redis } from '@/config/redis'

const router = Router()

// Security dashboard endpoint (admin only)
router.get('/dashboard', enhancedAuth, async (req, res) => {
  try {
    const user = (req as any).user
    
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' })
    }

    // Get security metrics
    const [
      activeSessions,
      recentLogins,
      failedAttempts,
      blockedIPs,
      securityLogs
    ] = await Promise.all([
      // Active sessions count
      prisma.userSession.count({
        where: {
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      }),
      
      // Recent successful logins (last 24h)
      prisma.userSession.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
      
      // Failed login attempts (from Redis)
      redis.keys('failed_attempts:*').then(keys => keys.length),
      
      // Blocked IPs (from Redis)
      redis.keys('blocked_ip:*').then(keys => keys.length),
      
      // Recent security events
      prisma.activityLog.findMany({
        where: {
          type: { in: ['LOGIN_FAILED', 'SECURITY_VIOLATION', 'ACCOUNT_LOCKED'] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ])

    res.json({
      success: true,
      data: {
        metrics: {
          activeSessions,
          recentLogins,
          failedAttempts,
          blockedIPs
        },
        recentEvents: securityLogs,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Security dashboard error:', error)
    res.status(500).json({ success: false, error: 'Failed to load security dashboard' })
  }
})

// Security alerts endpoint
router.post('/alert', enhancedAuth, async (req, res) => {
  try {
    const { type, severity, message, details } = req.body
    const user = (req as any).user

    // Log security alert
    await prisma.activityLog.create({
      data: {
        type: 'SECURITY_ALERT',
        description: `${type}: ${message}`,
        userId: user.id,
        metadata: details || {},
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    })

    // Send to external monitoring (if configured)
    if (process.env.SECURITY_WEBHOOK_URL) {
      fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          severity,
          message,
          details,
          timestamp: new Date().toISOString(),
          source: 'cms-security'
        })
      }).catch(err => console.error('Failed to send security alert:', err))
    }

    res.json({ success: true, message: 'Security alert logged' })
  } catch (error) {
    console.error('Security alert error:', error)
    res.status(500).json({ success: false, error: 'Failed to log security alert' })
  }
})

export default router 