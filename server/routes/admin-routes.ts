import { Router } from 'express';
import { db } from '../db';
import { 
  systemSettings, 
  tierPricingRules, 
  deliveryTimeSettings,
  filterConfigurations,
  ffls,
  products
} from '@shared/schema';
import { eq, desc, sql, and, like, or } from 'drizzle-orm';
import { rsrFTPClient } from '../services/rsr-ftp-client';
import { rsrFileUpload } from '../services/rsr-file-upload';
import { inventorySync } from '../services/inventory-sync';
import { syncHealthMonitor } from '../services/sync-health-monitor';
import { imageService } from '../services/image-service';
import { storage } from '../storage';

const router = Router();

// NO AUTHENTICATION - CloudFlare handles security

// ===== PRICING MANAGEMENT =====
router.get('/pricing-rules', async (req, res) => {
  try {
    const rules = await db.select().from(tierPricingRules);
    res.json(rules);
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    res.status(500).json({ error: 'Failed to fetch pricing rules' });
  }
});

router.post('/pricing-rules', async (req, res) => {
  try {
    const newRule = await db.insert(tierPricingRules).values(req.body).returning();
    res.json(newRule[0]);
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    res.status(500).json({ error: 'Failed to create pricing rule' });
  }
});

router.put('/pricing-rules/:id', async (req, res) => {
  try {
    const updated = await db
      .update(tierPricingRules)
      .set(req.body)
      .where(eq(tierPricingRules.id, parseInt(req.params.id)))
      .returning();
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    res.status(500).json({ error: 'Failed to update pricing rule' });
  }
});

router.get('/pricing-rules/active', async (req, res) => {
  try {
    const [activeRule] = await db.select()
      .from(tierPricingRules)
      .where(eq(tierPricingRules.isActive, true))
      .limit(1);
    res.json(activeRule || null);
  } catch (error) {
    console.error('Error fetching active pricing rule:', error);
    res.status(500).json({ error: 'Failed to fetch active pricing rule' });
  }
});

router.get('/pricing/department-discounts', async (req, res) => {
  try {
    const discountSettings = await db.select()
      .from(systemSettings)
      .where(like(systemSettings.key, 'department_discount_%'));
    
    const discounts = discountSettings.reduce((acc: any, setting) => {
      const department = setting.key.replace('department_discount_', '');
      acc[department] = parseFloat(setting.value || '0');
      return acc;
    }, {});
    
    res.json(discounts);
  } catch (error) {
    console.error('Error fetching department discounts:', error);
    res.status(500).json({ error: 'Failed to fetch department discounts' });
  }
});

router.post('/pricing/department-discounts', async (req, res) => {
  try {
    const { department, discount } = req.body;
    const key = `department_discount_${department}`;
    
    await db.insert(systemSettings)
      .values({ key, value: discount.toString() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: discount.toString() }
      });
    
    res.json({ success: true, department, discount });
  } catch (error) {
    console.error('Error updating department discount:', error);
    res.status(500).json({ error: 'Failed to update department discount' });
  }
});

// ===== INVENTORY MANAGEMENT =====
router.get('/sync-configurations', async (req, res) => {
  try {
    const configurations = inventorySync.getSyncConfigurations();
    res.json(configurations);
  } catch (error) {
    console.error('Error fetching sync configurations:', error);
    res.status(500).json({ error: 'Failed to fetch sync configurations' });
  }
});

router.get('/sync-results', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const results = inventorySync.getRecentSyncResults(limit);
    res.json(results);
  } catch (error) {
    console.error('Error fetching sync results:', error);
    res.status(500).json({ error: 'Failed to fetch sync results' });
  }
});

router.post('/sync-rsr-inventory', async (req, res) => {
  try {
    const result = await inventorySync.syncRSRInventory();
    res.json(result);
  } catch (error) {
    console.error('Error syncing RSR inventory:', error);
    res.status(500).json({ error: 'Failed to sync RSR inventory' });
  }
});

router.get('/sync-status', async (req, res) => {
  try {
    const runningJobs = inventorySync.getRunningJobs();
    const lastSync = inventorySync.getLastSyncInfo('rsr');
    res.json({ runningJobs, lastSync });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

router.get('/sync-health', async (req, res) => {
  try {
    const healthStatus = await syncHealthMonitor.getSyncHealthStatus();
    res.json(healthStatus);
  } catch (error) {
    console.error('Error fetching sync health:', error);
    res.status(500).json({ error: 'Failed to fetch sync health' });
  }
});

// ===== RSR COMPREHENSIVE IMPORT SYSTEM =====
router.get('/rsr/comprehensive-status', async (req, res) => {
  try {
    const { rsrSchedulerService } = await import('../services/rsr-scheduler-service.js');
    const { rsrFTPService } = await import('../services/rsr-ftp-service.js');
    const { rsrMonitoringService } = await import('../services/rsr-monitoring-service.js');
    
    const schedulerStatus = rsrSchedulerService.getStatus();
    const monitoringStatus = rsrMonitoringService.getStatus();
    const fileStatuses = rsrFTPService.getAllFileStatuses();

    res.json({
      scheduler: schedulerStatus,
      monitoring: monitoringStatus,
      files: fileStatuses,
      timestamp: new Date().toISOString(),
      message: "RSR Comprehensive Import System - Operational"
    });
  } catch (error) {
    console.error('RSR comprehensive status error:', error);
    res.status(500).json({ error: 'Failed to fetch RSR comprehensive status' });
  }
});

router.post('/rsr/comprehensive-import/trigger', async (req, res) => {
  try {
    const { rsrSchedulerService } = await import('../services/rsr-scheduler-service.js');
    const { type = 'inventory' } = req.body;
    
    let result;
    if (type === 'inventory') {
      result = await rsrSchedulerService.triggerManualInventoryUpdate();
    } else if (type === 'quantity') {
      result = await rsrSchedulerService.triggerManualQuantityUpdate();
    } else if (type === 'monitoring') {
      result = await rsrSchedulerService.triggerManualMonitoring();
    } else {
      return res.status(400).json({ error: 'Invalid import type' });
    }
    
    res.json({
      success: true,
      type,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('RSR manual import error:', error);
    res.status(500).json({ error: 'Failed to trigger manual import' });
  }
});

router.post('/rsr/comprehensive-import/reset', async (req, res) => {
  try {
    const { rsrSchedulerService } = await import('../services/rsr-scheduler-service.js');
    const { rsrMonitoringService } = await import('../services/rsr-monitoring-service.js');
    
    rsrSchedulerService.stop();
    rsrMonitoringService.clearMonitoring();
    await rsrSchedulerService.start();
    
    res.json({
      success: true,
      message: 'RSR Comprehensive Import System reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('RSR reset error:', error);
    res.status(500).json({ error: 'Failed to reset RSR import system' });
  }
});

// ===== FFL MANAGEMENT =====
router.get('/ffls', async (req, res) => {
  try {
    const allFFLs = await db.select().from(ffls);
    res.json(allFFLs);
  } catch (error) {
    console.error('Error fetching FFLs:', error);
    res.status(500).json({ error: 'Failed to fetch FFLs' });
  }
});

router.get('/ffls/preferred', async (req, res) => {
  try {
    const preferredFFLs = await db.select()
      .from(ffls)
      .where(eq(ffls.isPreferred, true));
    res.json(preferredFFLs);
  } catch (error) {
    console.error('Error fetching preferred FFLs:', error);
    res.status(500).json({ error: 'Failed to fetch preferred FFLs' });
  }
});

router.post('/ffls/:id/preferred', async (req, res) => {
  try {
    const fflId = parseInt(req.params.id);
    const { isPreferred } = req.body;
    
    const updated = await db.update(ffls)
      .set({ isPreferred })
      .where(eq(ffls.id, fflId))
      .returning();
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating FFL preferred status:', error);
    res.status(500).json({ error: 'Failed to update FFL preferred status' });
  }
});

// ===== PRODUCT MANAGEMENT =====
router.get('/product-images/:sku', async (req, res) => {
  try {
    const sku = req.params.sku;
    const images = await imageService.findProductImages(sku);
    res.json({ sku, images });
  } catch (error) {
    console.error('Error fetching product images:', error);
    res.status(500).json({ error: 'Failed to fetch product images' });
  }
});

router.post('/product-images/sync-batch', async (req, res) => {
  try {
    const { skus, overwrite = false } = req.body;
    
    if (!Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ error: 'SKUs array is required' });
    }
    
    const results = await imageService.syncMultipleProducts(skus, overwrite);
    res.json({ results });
  } catch (error) {
    console.error('Error syncing product images:', error);
    res.status(500).json({ error: 'Failed to sync product images' });
  }
});

// ===== ANALYTICS & REPORTS =====
router.get('/search-analytics', async (req, res) => {
  try {
    const { aiSearchLearning } = await import('../services/ai-search-learning');
    const topSearches = await aiSearchLearning.getTopSearches(100);
    const searchPatterns = await aiSearchLearning.getSearchPatterns();
    const conversionMetrics = await aiSearchLearning.getConversionMetrics();
    
    res.json({
      topSearches,
      searchPatterns,
      conversionMetrics,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching search analytics:', error);
    res.status(500).json({ error: 'Failed to fetch search analytics' });
  }
});

// ===== FINANCIAL REPORTS =====
router.get('/financial/revenue-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await storage.getRevenueSummary(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json(summary);
  } catch (error) {
    console.error('Error fetching revenue summary:', error);
    res.status(500).json({ error: 'Failed to fetch revenue summary' });
  }
});

router.get('/financial/tier-revenue', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const tierRevenue = await storage.getTierRevenue(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json(tierRevenue);
  } catch (error) {
    console.error('Error fetching tier revenue:', error);
    res.status(500).json({ error: 'Failed to fetch tier revenue' });
  }
});

// ===== COMPLIANCE CONFIGURATION =====
router.get('/compliance/firearms-config', async (req, res) => {
  try {
    const config = await storage.getFirearmsComplianceConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching compliance config:', error);
    res.status(500).json({ error: 'Failed to fetch compliance configuration' });
  }
});

router.put('/compliance/firearms-config', async (req, res) => {
  try {
    const updated = await storage.updateFirearmsComplianceConfig(req.body);
    res.json(updated);
  } catch (error) {
    console.error('Error updating compliance config:', error);
    res.status(500).json({ error: 'Failed to update compliance configuration' });
  }
});

// ===== SYSTEM SETTINGS =====
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.select().from(systemSettings);
    const settingsObj = settings.reduce((acc: any, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    await db.insert(systemSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value }
      });
    
    res.json({ key, value });
  } catch (error) {
    console.error('Error updating system setting:', error);
    res.status(500).json({ error: 'Failed to update system setting' });
  }
});

// ===== DELIVERY TIME SETTINGS =====
router.get('/delivery-time-settings', async (req, res) => {
  try {
    const settings = await db.select().from(deliveryTimeSettings);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching delivery time settings:', error);
    res.status(500).json({ error: 'Failed to fetch delivery time settings' });
  }
});

router.put('/delivery-time-settings/:id', async (req, res) => {
  try {
    const updated = await db
      .update(deliveryTimeSettings)
      .set(req.body)
      .where(eq(deliveryTimeSettings.id, parseInt(req.params.id)))
      .returning();
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating delivery time settings:', error);
    res.status(500).json({ error: 'Failed to update delivery time settings' });
  }
});

// ===== FILTER CONFIGURATIONS =====
router.get('/filter-configurations', async (req, res) => {
  try {
    const configs = await db.select().from(filterConfigurations);
    res.json(configs);
  } catch (error) {
    console.error('Error fetching filter configurations:', error);
    res.status(500).json({ error: 'Failed to fetch filter configurations' });
  }
});

router.put('/filter-configurations/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const updated = await db
      .update(filterConfigurations)
      .set(req.body)
      .where(eq(filterConfigurations.category, category))
      .returning();
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating filter configuration:', error);
    res.status(500).json({ error: 'Failed to update filter configuration' });
  }
});

// ===== CATEGORY SETTINGS =====
// Note: Category settings are stored in system_settings table
router.get('/category-settings', async (req, res) => {
  try {
    const settings = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'category_settings'));
    
    if (settings.length === 0) {
      return res.json([]);
    }
    
    res.json(JSON.parse(settings[0].value || '[]'));
  } catch (error) {
    console.error('Error fetching category settings:', error);
    res.status(500).json({ error: 'Failed to fetch category settings' });
  }
});

router.put('/category-settings', async (req, res) => {
  try {
    await db.insert(systemSettings)
      .values({ 
        key: 'category_settings',
        value: JSON.stringify(req.body)
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: JSON.stringify(req.body) }
      });
    
    res.json(req.body);
  } catch (error) {
    console.error('Error updating category settings:', error);
    res.status(500).json({ error: 'Failed to update category settings' });
  }
});

export default router;