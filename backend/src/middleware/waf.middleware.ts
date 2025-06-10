import { Request, Response, NextFunction } from 'express'

interface SecurityRule {
  name: string
  pattern: RegExp
  action: 'block' | 'log' | 'captcha'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const securityRules: SecurityRule[] = [
  // SQL Injection patterns
  {
    name: 'SQL_INJECTION_UNION',
    pattern: /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
    action: 'block',
    severity: 'critical'
  },
  {
    name: 'SQL_INJECTION_COMMENTS',
    pattern: /(\/\*|\*\/|--|\#)/,
    action: 'block',
    severity: 'high'
  },
  
  // XSS patterns
  {
    name: 'XSS_SCRIPT_TAG',
    pattern: /<script[^>]*>.*?<\/script>/gi,
    action: 'block',
    severity: 'critical'
  },
  {
    name: 'XSS_EVENT_HANDLERS',
    pattern: /on\w+\s*=\s*["'][^"']*["']/gi,
    action: 'block',
    severity: 'high'
  },
  {
    name: 'XSS_JAVASCRIPT_PROTOCOL',
    pattern: /javascript\s*:/gi,
    action: 'block',
    severity: 'high'
  },
  
  // Path traversal
  {
    name: 'PATH_TRAVERSAL',
    pattern: /(\.\.[\/\\]){2,}/,
    action: 'block',
    severity: 'high'
  },
  
  // Command injection
  {
    name: 'COMMAND_INJECTION',
    pattern: /[;&|`$(){}[\]]/,
    action: 'log',
    severity: 'medium'
  },
  
  // Suspicious user agents
  {
    name: 'SUSPICIOUS_USER_AGENT',
    pattern: /(sqlmap|nmap|nikto|dirb|gobuster|masscan|nessus|burp|owasp)/i,
    action: 'block',
    severity: 'high'
  }
]

export const webApplicationFirewall = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  const checkData = [
    req.url,
    JSON.stringify(req.query),
    JSON.stringify(req.body),
    req.get('User-Agent') || '',
    req.get('Referer') || ''
  ].join(' ')

  for (const rule of securityRules) {
    if (rule.pattern.test(checkData)) {
      const incident = {
        timestamp: new Date().toISOString(),
        rule: rule.name,
        severity: rule.severity,
        action: rule.action,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        matchedContent: checkData.match(rule.pattern)?.[0] || 'N/A'
      }

      // Log security incident
      console.warn('Security rule triggered:', incident)

      // Send to security monitoring
      if (process.env.SECURITY_WEBHOOK_URL) {
        fetch(process.env.SECURITY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incident)
        }).catch(err => console.error('Failed to send security alert:', err))
      }

      if (rule.action === 'block') {
        return res.status(403).json({
          success: false,
          error: 'Request blocked by security policy',
          code: 'SECURITY_VIOLATION',
          timestamp: new Date().toISOString()
        })
      }
    }
  }

  next()
}

// Geo-blocking middleware (optional)
export const geoBlocker = (blockedCountries: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const country = req.get('CF-IPCountry') || req.get('X-Country-Code')
    
    if (country && blockedCountries.includes(country.toUpperCase())) {
      console.warn('Geo-blocked request:', {
        ip: req.ip,
        country,
        url: req.url,
        userAgent: req.get('User-Agent')
      })
      
      return res.status(403).json({
        success: false,
        error: 'Access denied from your location',
        code: 'GEO_BLOCKED'
      })
    }
    
    next()
  }
} 