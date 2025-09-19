// Admin endpoint for systematic order enrichment
// POST /api/admin/enrich-orders

const express = require('express');
const { scanAndEnrichOrders } = require('../../scripts/enrich-orders');

const router = express.Router();

router.post('/api/admin/enrich-orders', async (req, res) => {
  try {
    console.log('🚀 Starting systematic order enrichment via admin endpoint...');
    
    // Capture console output for response
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    await scanAndEnrichOrders();

    // Restore original console.log
    console.log = originalLog;

    res.json({
      success: true,
      message: 'Systematic order enrichment completed',
      logs: logs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Enrichment failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;