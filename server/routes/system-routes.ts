import { Router } from 'express';
import { db } from '../db';
import { 
  systemSettings,
  activityLogs,
  users,
  webhookLogs
} from '@shared/schema';
import { eq, desc, sql, and, gte, lte, like } from 'drizzle-orm';
import { ZohoService } from '../zoho-service';
import { rsrImageStatsHandler } from './rsr-image-stats';

const router = Router();

// NO AUTHENTICATION - CloudFlare handles security

// ===== RSR IMAGE STATS (from the attachment) =====
router.get('/rsr-image-stats', rsrImageStatsHandler);

// ===== ACTIVITY LOGS =====
router.get('/logs/activity', async (req, res) => {
  try {
    const { 
      userId,
      action,
      entityType,
      startDate,
      endDate,
      limit = '100'
    } = req.query;

    let query = db.select().from(activityLogs);
    
    const conditions = [];
    if (userId) conditions.push(eq(activityLogs.userId, parseInt(userId as string)));
    if (action) conditions.push(eq(activityLogs.action, action as string));
    if (entityType) conditions.push(eq(activityLogs.entityType, entityType as string));
    if (startDate) conditions.push(gte(activityLogs.createdAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(activityLogs.createdAt, new Date(endDate as string)));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const logs = await query
      .orderBy(desc(activityLogs.createdAt))
      .limit(parseInt(limit as string));
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

router.get('/logs/errors', async (req, res) => {
  try {
    const { limit = '100', severity = 'all' } = req.query;
    
    const [errorLogs] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'error_logs'))
      .limit(1);
    
    if (!errorLogs) {
      return res.json([]);
    }
    
    let logs = JSON.parse(errorLogs.value || '[]');
    
    if (severity !== 'all') {
      logs = logs.filter((log: any) => log.severity === severity);
    }
    
    logs = logs.slice(0, parseInt(limit as string));
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
});

// ===== INTEGRATION STATUS =====
router.get('/integrations/status', async (req, res) => {
  try {
    const zohoService = new ZohoService();
    const zohoStatus = zohoService.hasValidTokens();
    
    // Check RSR status
    const { rsrSchedulerService } = await import('../services/rsr-scheduler-service.js');
    const rsrStatus = rsrSchedulerService.getStatus();
    
    // Check Authorize.Net
    const authorizeNetConfigured = !!(
      process.env.AUTHORIZE_NET_API_LOGIN_ID && 
      process.env.AUTHORIZE_NET_TRANSACTION_KEY
    );
    
    // Check SendGrid
    const sendGridConfigured = !!process.env.SENDGRID_API_KEY;
    
    // Check Algolia
    const algoliaConfigured = !!(
      process.env.VITE_ALGOLIA_APP_ID && 
      process.env.VITE_ALGOLIA_API_KEY
    );
    
    res.json({
      zoho: {
        configured: zohoStatus,
        status: zohoStatus ? 'active' : 'inactive'
      },
      rsr: {
        configured: true,
        status: rsrStatus.isRunning ? 'active' : 'inactive',
        details: rsrStatus
      },
      authorizeNet: {
        configured: authorizeNetConfigured,
        status: authorizeNetConfigured ? 'active' : 'not_configured'
      },
      sendGrid: {
        configured: sendGridConfigured,
        status: sendGridConfigured ? 'active' : 'not_configured'
      },
      algolia: {
        configured: algoliaConfigured,
        status: algoliaConfigured ? 'active' : 'not_configured'
      }
    });
  } catch (error) {
    console.error('Error fetching integration status:', error);
    res.status(500).json({ error: 'Failed to fetch integration status' });
  }
});

router.post('/integrations/:service/test', async (req, res) => {
  try {
    const { service } = req.params;
    
    switch (service) {
      case 'zoho':
        const zohoService = new ZohoService();
        const testResult = await zohoService.testConnection();
        res.json({ service: 'zoho', success: testResult, timestamp: new Date() });
        break;
        
      case 'rsr':
        const { rsrAPI } = await import('../services/rsr-api');
        const rsrTest = await rsrAPI.testConnection();
        res.json({ service: 'rsr', success: rsrTest, timestamp: new Date() });
        break;
        
      case 'sendgrid':
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        try {
          await sgMail.send({
            to: 'test@example.com',
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@thegunfirm.com',
            subject: 'Integration Test',
            text: 'This is a test email',
            mailSettings: { sandboxMode: { enable: true } }
          });
          res.json({ service: 'sendgrid', success: true, timestamp: new Date() });
        } catch (err) {
          res.json({ service: 'sendgrid', success: false, error: err, timestamp: new Date() });
        }
        break;
        
      default:
        res.status(400).json({ error: 'Unknown service' });
    }
  } catch (error) {
    console.error(`Error testing ${req.params.service}:`, error);
    res.status(500).json({ error: `Failed to test ${req.params.service}` });
  }
});

// ===== WEBHOOK MANAGEMENT =====
router.get('/webhooks', async (req, res) => {
  try {
    const { source, status, limit = '50' } = req.query;
    
    let query = db.select().from(webhookLogs);
    
    const conditions = [];
    if (source) conditions.push(eq(webhookLogs.source, source as string));
    if (status) conditions.push(eq(webhookLogs.status, status as string));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const webhooks = await query
      .orderBy(desc(webhookLogs.createdAt))
      .limit(parseInt(limit as string));
    
    res.json(webhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

router.post('/webhooks/:id/replay', async (req, res) => {
  try {
    const webhookId = parseInt(req.params.id);
    
    const [webhook] = await db.select()
      .from(webhookLogs)
      .where(eq(webhookLogs.id, webhookId))
      .limit(1);
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    // Process webhook based on source
    let result;
    switch (webhook.source) {
      case 'authorize_net':
        const { authorizeNetService } = await import('../authorize-net-service');
        result = await authorizeNetService.processWebhook(webhook.payload);
        break;
      case 'zoho':
        const zohoService = new ZohoService();
        result = await zohoService.processWebhook(webhook.payload);
        break;
      default:
        return res.status(400).json({ error: 'Unknown webhook source' });
    }
    
    // Update webhook status
    await db.update(webhookLogs)
      .set({ 
        status: result.success ? 'processed' : 'failed',
        processedAt: new Date(),
        response: result
      })
      .where(eq(webhookLogs.id, webhookId));
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error replaying webhook:', error);
    res.status(500).json({ error: 'Failed to replay webhook' });
  }
});

// ===== API FIELD DISCOVERY =====
router.post('/api-discovery/analyze', async (req, res) => {
  try {
    const { service, endpoint, method = 'GET', payload } = req.body;
    
    let result;
    switch (service) {
      case 'zoho':
        const zohoService = new ZohoService();
        result = await zohoService.discoverFields(endpoint, method, payload);
        break;
      case 'rsr':
        const { rsrAPI } = await import('../services/rsr-api');
        result = await rsrAPI.discoverFields(endpoint, method, payload);
        break;
      default:
        return res.status(400).json({ error: 'Unknown service' });
    }
    
    res.json({
      service,
      endpoint,
      method,
      fields: result,
      analyzedAt: new Date()
    });
  } catch (error) {
    console.error('Error in API discovery:', error);
    res.status(500).json({ error: 'Failed to analyze API' });
  }
});

// ===== DATABASE MANAGEMENT =====
router.get('/database/status', async (req, res) => {
  try {
    // Check database connection
    const testQuery = await db.select({ count: sql<number>`1` }).from(users).limit(1);
    
    // Get table statistics
    const tableStats = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        n_live_tup AS row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);
    
    res.json({
      connected: true,
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[1]?.split('?')[0] || 'unknown',
      tables: tableStats.rows
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    res.status(500).json({ 
      connected: false,
      error: 'Failed to connect to database' 
    });
  }
});

router.post('/database/backup', async (req, res) => {
  try {
    const { tables = [] } = req.body;
    
    // Create backup metadata
    const backupId = Date.now().toString();
    const backupData: any = {
      id: backupId,
      timestamp: new Date().toISOString(),
      tables: {}
    };
    
    // Backup specified tables or all tables
    const tablesToBackup = tables.length > 0 ? tables : [
      'users', 'products', 'orders', 'orderItems', 'ffls', 
      'categoryRibbons', 'heroCarouselSlides', 'systemSettings'
    ];
    
    for (const table of tablesToBackup) {
      try {
        const data = await db.execute(sql`SELECT * FROM ${sql.identifier(table)}`);
        backupData.tables[table] = data.rows;
      } catch (err) {
        console.error(`Failed to backup table ${table}:`, err);
      }
    }
    
    // Store backup in system settings
    await db.insert(systemSettings)
      .values({ 
        key: `backup_${backupId}`,
        value: JSON.stringify(backupData)
      });
    
    res.json({
      backupId,
      timestamp: backupData.timestamp,
      tablesBackedUp: Object.keys(backupData.tables),
      totalRecords: Object.values(backupData.tables).reduce(
        (sum: number, rows: any) => sum + rows.length, 0
      )
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// ===== USER MANAGEMENT =====
router.get('/users', async (req, res) => {
  try {
    const { role, search, limit = '50' } = req.query;
    
    let query = db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      tier: users.tier,
      createdAt: users.createdAt,
      emailVerified: users.emailVerified
    }).from(users);
    
    const conditions = [];
    if (role) conditions.push(eq(users.role, role as string));
    if (search) {
      conditions.push(
        like(users.email, `%${search}%`)
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const userList = await query
      .orderBy(desc(users.createdAt))
      .limit(parseInt(limit as string));
    
    res.json(userList);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    const updated = await db.update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    
    // Log activity
    await db.insert(activityLogs).values({
      userId: 0, // System user
      action: 'user_role_change',
      entityType: 'user',
      entityId: userId.toString(),
      details: { newRole: role },
      createdAt: new Date()
    });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate reset token
    const { sendPasswordResetEmail } = await import('../services/email-service');
    await sendPasswordResetEmail(user.email);
    
    res.json({ 
      success: true, 
      message: `Password reset email sent to ${user.email}` 
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ===== CACHE MANAGEMENT =====
router.get('/cache/status', async (req, res) => {
  try {
    const [cacheSettings] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'cache_config'))
      .limit(1);
    
    const config = cacheSettings ? JSON.parse(cacheSettings.value) : {
      enabled: true,
      ttl: 3600,
      maxSize: 1000
    };
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching cache status:', error);
    res.status(500).json({ error: 'Failed to fetch cache status' });
  }
});

router.post('/cache/clear', async (req, res) => {
  try {
    const { type = 'all' } = req.body;
    
    // Clear specific cache types
    if (type === 'products' || type === 'all') {
      // Clear product cache
      await db.update(systemSettings)
        .set({ value: '{}' })
        .where(eq(systemSettings.key, 'product_cache'));
    }
    
    if (type === 'search' || type === 'all') {
      // Clear search cache
      await db.update(systemSettings)
        .set({ value: '{}' })
        .where(eq(systemSettings.key, 'search_cache'));
    }
    
    if (type === 'images' || type === 'all') {
      // Clear image cache
      await db.update(systemSettings)
        .set({ value: '{}' })
        .where(eq(systemSettings.key, 'image_cache'));
    }
    
    res.json({ 
      success: true, 
      cleared: type,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;