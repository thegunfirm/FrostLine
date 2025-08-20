/**
 * CMS Import Error Reporting Routes
 * Provides admin interface for viewing and managing import errors
 */

import { Router } from 'express';
import { importErrorReporting } from '../services/import-error-reporting';

const router = Router();

/**
 * Get import error summary for CMS dashboard
 */
router.get('/api/admin/import-errors/summary', async (req, res) => {
  try {
    const summary = importErrorReporting.getErrorSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching import error summary:', error);
    res.status(500).json({ error: 'Failed to fetch import error summary' });
  }
});

/**
 * Get filtered import errors
 */
router.get('/api/admin/import-errors', async (req, res) => {
  try {
    const { source, type, severity, limit } = req.query;
    
    const criteria = {
      ...(source && { source: source as string }),
      ...(type && { type: type as string }),
      ...(severity && { severity: severity as string }),
      ...(limit && { limit: parseInt(limit as string) })
    };

    const errors = importErrorReporting.getErrors(criteria);
    res.json(errors);
  } catch (error) {
    console.error('Error fetching import errors:', error);
    res.status(500).json({ error: 'Failed to fetch import errors' });
  }
});

/**
 * Clear all import errors (admin only)
 */
router.delete('/api/admin/import-errors', async (req, res) => {
  try {
    importErrorReporting.clearErrors();
    res.json({ success: true, message: 'All import errors cleared' });
  } catch (error) {
    console.error('Error clearing import errors:', error);
    res.status(500).json({ error: 'Failed to clear import errors' });
  }
});

/**
 * Get error statistics by date range
 */
router.get('/api/admin/import-errors/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const allErrors = importErrorReporting.getErrors();
    
    let filteredErrors = allErrors;
    
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string) : new Date(0);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      filteredErrors = allErrors.filter(error => {
        const errorDate = new Date(error.timestamp);
        return errorDate >= start && errorDate <= end;
      });
    }

    // Calculate statistics
    const stats = {
      totalErrors: filteredErrors.length,
      errorsByHour: {} as Record<string, number>,
      errorsByDay: {} as Record<string, number>,
      criticalErrors: filteredErrors.filter(e => e.severity === 'CRITICAL').length,
      highErrors: filteredErrors.filter(e => e.severity === 'HIGH').length,
      mediumErrors: filteredErrors.filter(e => e.severity === 'MEDIUM').length,
      lowErrors: filteredErrors.filter(e => e.severity === 'LOW').length,
      errorsBySource: {} as Record<string, number>,
      errorsByType: {} as Record<string, number>,
      mostCommonErrors: {} as Record<string, number>
    };

    // Group by hour and day
    filteredErrors.forEach(error => {
      const date = new Date(error.timestamp);
      const hour = date.getHours().toString().padStart(2, '0') + ':00';
      const day = date.toISOString().split('T')[0];
      
      stats.errorsByHour[hour] = (stats.errorsByHour[hour] || 0) + 1;
      stats.errorsByDay[day] = (stats.errorsByDay[day] || 0) + 1;
      stats.errorsBySource[error.source] = (stats.errorsBySource[error.source] || 0) + 1;
      stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
      
      const errorKey = `${error.fieldName}: ${error.errorMessage}`;
      stats.mostCommonErrors[errorKey] = (stats.mostCommonErrors[errorKey] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching import error stats:', error);
    res.status(500).json({ error: 'Failed to fetch import error statistics' });
  }
});

export { router as importErrorRoutes };