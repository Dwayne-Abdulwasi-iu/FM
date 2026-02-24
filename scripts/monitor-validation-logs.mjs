/**
 * Validation Error Log Monitor
 * 
 * Monitors application logs for validation-related errors that might indicate
 * security fixes causing unexpected issues.
 * 
 * Usage:
 * - Real-time: npm run logs:monitor
 * - Or: node scripts/monitor-validation-logs.mjs
 * 
 * Watches for errors related to:
 * - Price validation (negative, NaN, too high)
 * - Quantity validation (non-integer, negative)
 * - Category validation (rejected, unknown)
 * - Email validation (duplicate accounts)
 * - Discount validation (floor pricing)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logsDir = path.join(__dirname, '../logs')

// Patterns to watch for
const VALIDATION_PATTERNS = {
  price: /price.*(?:negative|NaN|Infinity|invalid|bounds|exceeds)/i,
  quantity: /quantity.*(?:non-integer|decimal|negative|invalid)/i,
  category: /category.*(?:rejected|invalid|not allowed|whitelist)/i,
  email: /email.*(?:duplicate|already exists|normalized)/i,
  discount: /discount.*(?:floor|zero|invalid|exceeds)/i,
  refund: /refund.*(?:exceeds|invalid|mismatch)/i,
  rateLimit: /rate limit|429|Too Many Requests/i,
  idempotency: /idempotency|duplicate request|cache hit/i,
  csrf: /csrf|cross-site/i
}

const ERROR_LEVELS = {
  critical: '🔴 CRITICAL',
  error: '❌ ERROR',
  warn: '⚠️  WARNING',
  info: 'ℹ️  INFO',
  success: '✅ SUCCESS'
}

async function monitorLogs() {
  console.log('📋 Validation Error Log Monitor\n')
  console.log('Watching for validation-related errors...\n')
  
  try {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
    
    // Monitor recent log files
    const logFiles = fs.readdirSync(logsDir)
      .filter(f => f.endsWith('.log'))
      .sort()
      .reverse()
      .slice(0, 3)  // Last 3 log files
    
    if (logFiles.length === 0) {
      console.log('⚠️  No log files found in ./logs directory')
      console.log('\nTo enable logging, ensure your app logs to ./logs/\n')
      return
    }
    
    console.log(`Found ${logFiles.length} log files:\n`)
    
    const errors = {
      critical: [],
      error: [],
      warn: [],
      info: [],
      success: []
    }
    
    for (const logFile of logFiles) {
      const logPath = path.join(logsDir, logFile)
      const content = fs.readFileSync(logPath, 'utf8')
      const lines = content.split('\n')
      
      for (const line of lines) {
        if (!line.trim()) continue
        
        // Check against each pattern
        for (const [category, pattern] of Object.entries(VALIDATION_PATTERNS)) {
          if (pattern.test(line)) {
            // Determine error level
            let level = 'info'
            if (line.includes('CRITICAL') || line.includes('fatal')) level = 'critical'
            else if (line.includes('ERROR') || line.includes('error')) level = 'error'
            else if (line.includes('WARN') || line.includes('warn')) level = 'warn'
            else if (line.includes('SUCCESS') || line.includes('success')) level = 'success'
            
            errors[level].push({
              file: logFile,
              category,
              message: line.trim().substring(0, 120)
            })
          }
        }
      }
    }
    
    // Report findings
    console.log('📊 Validation Error Summary:\n')
    
    let totalErrors = 0
    for (const [level, items] of Object.entries(errors)) {
      if (items.length > 0) {
        console.log(`${ERROR_LEVELS[level] || level.toUpperCase()}: ${items.length} found`)
        totalErrors += items.length
        
        // Show first 3 of each level
        for (const item of items.slice(0, 3)) {
          console.log(`  [${item.category.toUpperCase()}] ${item.message}`)
        }
        if (items.length > 3) {
          console.log(`  ... and ${items.length - 3} more`)
        }
        console.log()
      }
    }
    
    if (totalErrors === 0) {
      console.log('✅ No validation errors found in logs\n')
    }
    
    // Recommendations
    console.log('💡 Recommendations:\n')
    
    const criticalCount = errors.critical.length
    const errorCount = errors.error.length
    const warnCount = errors.warn.length
    
    if (criticalCount > 0) {
      console.log(`  ⚠️  ${criticalCount} critical errors - investigate immediately`)
    }
    if (errorCount > 0) {
      console.log(`  🔧 ${errorCount} validation errors - may need adjustment`)
    }
    if (warnCount > 0) {
      console.log(`  📝 ${warnCount} warnings - monitor for patterns`)
    }
    if (totalErrors === 0) {
      console.log('  ✅ No issues detected - deployments proceeding normally')
    }
    
    console.log('\n🔍 Categories monitored:')
    console.log('  • Price validation (negative, NaN, exceeds limits)')
    console.log('  • Quantity validation (non-integer, negative)')
    console.log('  • Category validation (unknown categories)')
    console.log('  • Email validation (duplicates, normalization)')
    console.log('  • Discount validation (floor pricing)')
    console.log('  • Refund validation (exceeds payment)')
    console.log('  • Rate limiting (429 responses)')
    console.log('  • Idempotency (duplicate requests)')
    console.log('  • CSRF (token validation)\n')
    
  } catch (error) {
    console.error('❌ Error monitoring logs:', error)
  }
}

// If run directly
monitorLogs()
