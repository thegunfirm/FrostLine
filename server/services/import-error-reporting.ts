/**
 * Import Error Reporting Service
 * Records and manages import issues for CMS error reporting
 * NO FALLBACK SOLUTIONS - All missing data must be reported as errors
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface ImportError {
  id: string;
  timestamp: string;
  source: 'RSR_FILE' | 'RSR_API' | 'OTHER_DISTRIBUTOR';
  type: 'MISSING_REQUIRED_FIELD' | 'INVALID_FORMAT' | 'PARSING_ERROR' | 'VALIDATION_ERROR';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recordIdentifier: string; // SKU, stock number, or other identifier
  fieldName: string;
  expectedValue: string;
  actualValue: string;
  errorMessage: string;
  rawData?: string; // Original raw record for debugging
}

export interface ImportErrorSummary {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySource: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: ImportError[];
  lastUpdated: string;
}

class ImportErrorReportingService {
  private errorsDirectory = join(process.cwd(), 'app', 'logs', 'import-errors');
  private errorsFile = join(this.errorsDirectory, 'import-errors.json');
  private maxErrors = 10000; // Maximum errors to keep in memory

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!existsSync(this.errorsDirectory)) {
      mkdirSync(this.errorsDirectory, { recursive: true });
    }
  }

  /**
   * Report a critical missing field error
   */
  reportMissingRequiredField(
    source: ImportError['source'],
    recordIdentifier: string,
    fieldName: string,
    rawData?: string
  ): void {
    const error: ImportError = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      source,
      type: 'MISSING_REQUIRED_FIELD',
      severity: 'CRITICAL',
      recordIdentifier,
      fieldName,
      expectedValue: 'Non-empty value',
      actualValue: 'null/undefined/empty',
      errorMessage: `Required field '${fieldName}' is missing or empty for record '${recordIdentifier}'`,
      rawData
    };

    this.recordError(error);
    console.error(`🚨 IMPORT ERROR: Missing required field '${fieldName}' for record '${recordIdentifier}'`);
  }

  /**
   * Report invalid format error
   */
  reportInvalidFormat(
    source: ImportError['source'],
    recordIdentifier: string,
    fieldName: string,
    expectedValue: string,
    actualValue: string,
    rawData?: string
  ): void {
    const error: ImportError = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      source,
      type: 'INVALID_FORMAT',
      severity: 'HIGH',
      recordIdentifier,
      fieldName,
      expectedValue,
      actualValue,
      errorMessage: `Field '${fieldName}' has invalid format. Expected: ${expectedValue}, Got: ${actualValue}`,
      rawData
    };

    this.recordError(error);
    console.error(`🚨 IMPORT ERROR: Invalid format in field '${fieldName}' for record '${recordIdentifier}': expected ${expectedValue}, got ${actualValue}`);
  }

  /**
   * Report parsing error
   */
  reportParsingError(
    source: ImportError['source'],
    recordIdentifier: string,
    errorMessage: string,
    rawData?: string
  ): void {
    const error: ImportError = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      source,
      type: 'PARSING_ERROR',
      severity: 'HIGH',
      recordIdentifier,
      fieldName: 'N/A',
      expectedValue: 'Valid parseable data',
      actualValue: 'Unparseable data',
      errorMessage,
      rawData
    };

    this.recordError(error);
    console.error(`🚨 IMPORT ERROR: Parsing error for record '${recordIdentifier}': ${errorMessage}`);
  }

  /**
   * Record error to persistent storage
   */
  private recordError(error: ImportError): void {
    let errors: ImportError[] = [];
    
    // Load existing errors
    if (existsSync(this.errorsFile)) {
      try {
        const fileContent = readFileSync(this.errorsFile, 'utf-8');
        errors = JSON.parse(fileContent);
      } catch (parseError) {
        console.warn('Failed to parse existing error log, starting fresh');
        errors = [];
      }
    }

    // Add new error
    errors.unshift(error); // Add to beginning for most recent first

    // Maintain maximum error count
    if (errors.length > this.maxErrors) {
      errors = errors.slice(0, this.maxErrors);
    }

    // Save errors
    try {
      writeFileSync(this.errorsFile, JSON.stringify(errors, null, 2));
    } catch (writeError) {
      console.error('Failed to save import error log:', writeError);
    }
  }

  /**
   * Get error summary for CMS dashboard
   */
  getErrorSummary(): ImportErrorSummary {
    let errors: ImportError[] = [];
    
    if (existsSync(this.errorsFile)) {
      try {
        const fileContent = readFileSync(this.errorsFile, 'utf-8');
        errors = JSON.parse(fileContent);
      } catch (parseError) {
        console.warn('Failed to parse error log for summary');
        errors = [];
      }
    }

    const errorsByType: Record<string, number> = {};
    const errorsBySource: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySource[error.source] = (errorsBySource[error.source] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: errors.length,
      errorsByType,
      errorsBySource,
      errorsBySeverity,
      recentErrors: errors.slice(0, 50), // Most recent 50 errors
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get errors by criteria
   */
  getErrors(criteria?: {
    source?: ImportError['source'];
    type?: ImportError['type'];
    severity?: ImportError['severity'];
    limit?: number;
  }): ImportError[] {
    let errors: ImportError[] = [];
    
    if (existsSync(this.errorsFile)) {
      try {
        const fileContent = readFileSync(this.errorsFile, 'utf-8');
        errors = JSON.parse(fileContent);
      } catch (parseError) {
        console.warn('Failed to parse error log');
        return [];
      }
    }

    // Apply filters
    if (criteria) {
      if (criteria.source) {
        errors = errors.filter(e => e.source === criteria.source);
      }
      if (criteria.type) {
        errors = errors.filter(e => e.type === criteria.type);
      }
      if (criteria.severity) {
        errors = errors.filter(e => e.severity === criteria.severity);
      }
      if (criteria.limit) {
        errors = errors.slice(0, criteria.limit);
      }
    }

    return errors;
  }

  /**
   * Clear all errors (admin function)
   */
  clearErrors(): void {
    try {
      writeFileSync(this.errorsFile, JSON.stringify([], null, 2));
      console.log('✅ Import error log cleared');
    } catch (error) {
      console.error('Failed to clear import error log:', error);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `import-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate required field and report error if missing
   * REPLACES ALL FALLBACK LOGIC - if field is missing, report error and reject record
   */
  validateRequiredField(
    source: ImportError['source'],
    recordIdentifier: string,
    fieldName: string,
    value: any,
    rawData?: string
  ): boolean {
    if (value === null || value === undefined || value === '' || value === '0' && fieldName.includes('Price')) {
      this.reportMissingRequiredField(source, recordIdentifier, fieldName, rawData);
      return false;
    }
    return true;
  }

  /**
   * Validate field format and report error if invalid
   */
  validateFieldFormat(
    source: ImportError['source'],
    recordIdentifier: string,
    fieldName: string,
    value: any,
    expectedFormat: string,
    validator: (value: any) => boolean,
    rawData?: string
  ): boolean {
    if (!validator(value)) {
      this.reportInvalidFormat(source, recordIdentifier, fieldName, expectedFormat, String(value), rawData);
      return false;
    }
    return true;
  }
}

// Export singleton instance
export const importErrorReporting = new ImportErrorReportingService();