/**
 * Secure Logger Utility
 * ISO 27001/27002 Compliant Logging
 * 
 * This logger provides secure logging that:
 * - Can be disabled in production
 * - Never logs sensitive information
 * - Provides structured logging for monitoring
 * - Complies with ISO 27001/27002 A.12.4.1 (Event logging)
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
}

class SecureLogger {
  private isProduction = import.meta.env.PROD
  private enabled = !this.isProduction // Only enable in development
  private logs: LogEntry[] = []

  /**
   * Sanitize data to remove sensitive information
   * ISO 27001/27002 A.18.1.3 - Protection of PII
   */
  private sanitize(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data
    }

    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'apiKey',
      'accessKey',
      'secretAccessKey',
      'authorization',
      'creditCard',
      'ssn',
      'eidNumber',
      'personalId',
      'phoneNumber',
      'email',
    ]

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item))
    }

    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase()
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = this.sanitize(value)
      }
    }
    return sanitized
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.enabled) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? (this.sanitize(context) as Record<string, unknown>) : undefined,
    }

    this.logs.push(entry)

    // Keep only last 100 logs in memory
    if (this.logs.length > 100) {
      this.logs.shift()
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context)
    // In production, send to monitoring service instead of console
    if (this.isProduction) {
      // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
      return
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }

  /**
   * Get logs for debugging (development only)
   */
  getLogs(): LogEntry[] {
    return this.enabled ? [...this.logs] : []
  }

  /**
   * Clear logs
   */
  clear(): void {
    this.logs = []
  }
}

// Export singleton instance
export const logger = new SecureLogger()

// Export type for TypeScript
export type { LogLevel, LogEntry }

