import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface SecurityReport {
  timestamp: string
  vulnerabilities: {
    npm: any[]
    dependencies: any[]
    docker: any[]
  }
  summary: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

class SecurityScanner {
  private reportPath = path.join(__dirname, '../reports/security-report.json')

  async runScan(): Promise<SecurityReport> {
    console.log('🔍 Running security vulnerability scan...')

    const report: SecurityReport = {
      timestamp: new Date().toISOString(),
      vulnerabilities: {
        npm: [],
        dependencies: [],
        docker: []
      },
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    }

    try {
      // NPM audit
      console.log('📦 Scanning NPM dependencies...')
      const npmAudit = this.runNpmAudit()
      report.vulnerabilities.npm = npmAudit

      // Dependency check
      console.log('🔗 Checking dependencies...')
      report.vulnerabilities.dependencies = this.checkDependencies()

      // Docker security check (if Dockerfile exists)
      if (fs.existsSync('Dockerfile')) {
        console.log('🐳 Scanning Docker configuration...')
        report.vulnerabilities.docker = this.checkDocker()
      }

      // Calculate summary
      this.calculateSummary(report)

      // Save report
      this.saveReport(report)

      console.log('✅ Security scan completed!')
      this.printSummary(report)

      return report

    } catch (error) {
      console.error('❌ Security scan failed:', error)
      throw error
    }
  }

  private runNpmAudit(): any[] {
    try {
      const result = execSync('npm audit --json', { encoding: 'utf8' })
      const auditData = JSON.parse(result)
      
      if (auditData.vulnerabilities) {
        return Object.values(auditData.vulnerabilities)
      }
      return []
    } catch (error) {
      console.warn('NPM audit check failed:', error)
      return []
    }
  }

  private checkDependencies(): any[] {
    const vulnerabilities: any[] = []
    
    try {
      // Check for known vulnerable packages
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }

      // Known vulnerable patterns (simplified check)
      const vulnerablePatterns = [
        { name: 'lodash', version: '<4.17.19', severity: 'high' },
        { name: 'axios', version: '<0.21.1', severity: 'medium' },
        { name: 'express', version: '<4.17.3', severity: 'medium' }
      ]

      for (const [name, version] of Object.entries(dependencies)) {
        const vulnerable = vulnerablePatterns.find(p => p.name === name)
        if (vulnerable) {
          vulnerabilities.push({
            name,
            version,
            vulnerability: vulnerable,
            severity: vulnerable.severity
          })
        }
      }

    } catch (error) {
      console.warn('Dependency check failed:', error)
    }

    return vulnerabilities
  }

  private checkDocker(): any[] {
    const issues: any[] = []

    try {
      const dockerfile = fs.readFileSync('Dockerfile', 'utf8')
      
      // Check for security issues in Dockerfile
      const checks = [
        {
          pattern: /FROM.*:latest/,
          message: 'Using :latest tag is not recommended for production',
          severity: 'medium'
        },
        {
          pattern: /USER root/,
          message: 'Running as root user is a security risk',
          severity: 'high'
        },
        {
          pattern: /ADD http/,
          message: 'Using ADD with URLs can be insecure, use COPY instead',
          severity: 'medium'
        }
      ]

      checks.forEach(check => {
        if (check.pattern.test(dockerfile)) {
          issues.push({
            type: 'dockerfile',
            message: check.message,
            severity: check.severity
          })
        }
      })

    } catch (error) {
      console.warn('Docker security check failed:', error)
    }

    return issues
  }

  private calculateSummary(report: SecurityReport) {
    const allVulns = [
      ...report.vulnerabilities.npm,
      ...report.vulnerabilities.dependencies,
      ...report.vulnerabilities.docker
    ]

    allVulns.forEach(vuln => {
      const severity = vuln.severity || 'low'
      switch (severity) {
        case 'critical':
          report.summary.critical++
          break
        case 'high':
          report.summary.high++
          break
        case 'medium':
          report.summary.medium++
          break
        default:
          report.summary.low++
      }
    })
  }

  private saveReport(report: SecurityReport) {
    const dir = path.dirname(this.reportPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2))
  }

  private printSummary(report: SecurityReport) {
    console.log('\n📊 Security Scan Summary:')
    console.log(`🔴 Critical: ${report.summary.critical}`)
    console.log(`🟠 High: ${report.summary.high}`)
    console.log(`🟡 Medium: ${report.summary.medium}`)
    console.log(`🟢 Low: ${report.summary.low}`)
    console.log(`\n📄 Full report saved to: ${this.reportPath}`)
  }
}

// CLI runner
if (require.main === module) {
  const scanner = new SecurityScanner()
  scanner.runScan().catch(console.error)
}

export { SecurityScanner } 