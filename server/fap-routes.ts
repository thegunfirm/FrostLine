import type { Express } from "express";
import { fapIntegration } from "./services/fap-integration";
import { storage } from "./storage";

// Middleware to verify FAP webhook signatures
const verifyFAPWebhook = (req: any, res: any, next: any) => {
  const signature = req.headers['x-fap-signature'];
  const webhookSecret = process.env.FAP_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('FAP webhook secret not configured');
    return next();
  }

  // TODO: Implement signature verification
  // const computedSignature = crypto.createHmac('sha256', webhookSecret)
  //   .update(JSON.stringify(req.body))
  //   .digest('hex');

  // if (signature !== computedSignature) {
  //   return res.status(401).json({ error: 'Invalid webhook signature' });
  // }

  next();
};

// Role-based access middleware for FAP integration
const requireAdminRole = (req: any, res: any, next: any) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!['admin'].includes(req.session.user.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

const requireSupportRole = (req: any, res: any, next: any) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!['admin', 'support', 'manager'].includes(req.session.user.role)) {
    return res.status(403).json({ message: "Support access required" });
  }

  next();
};

export function registerFAPRoutes(app: Express) {
  
  // ====================
  // FAP WEBHOOKS - Public endpoints for FAP to call
  // ====================

  app.post("/api/fap/webhooks/user-updated", verifyFAPWebhook, async (req, res) => {
    try {
      const { userId } = req.body;
      await fapIntegration.syncUser(userId);
      res.json({ success: true, message: "User synchronized successfully" });
    } catch (error: any) {
      console.error("FAP user update webhook error:", error);
      res.status(500).json({ error: "Failed to process user update" });
    }
  });

  app.post("/api/fap/webhooks/subscription-updated", verifyFAPWebhook, async (req, res) => {
    try {
      await fapIntegration.processWebhook('subscription.updated', req.body);
      res.json({ success: true, message: "Subscription update processed" });
    } catch (error: any) {
      console.error("FAP subscription update webhook error:", error);
      res.status(500).json({ error: "Failed to process subscription update" });
    }
  });

  app.post("/api/fap/webhooks/support-ticket", verifyFAPWebhook, async (req, res) => {
    try {
      await fapIntegration.processWebhook('support.ticket.created', req.body);
      res.json({ success: true, message: "Cross-platform ticket created" });
    } catch (error: any) {
      console.error("FAP support ticket webhook error:", error);
      res.status(500).json({ error: "Failed to process support ticket" });
    }
  });

  // ====================
  // USER SYNCHRONIZATION - Admin only
  // ====================

  app.post("/api/fap/sync/user/:userId", requireAdminRole, async (req, res) => {
    try {
      const { userId } = req.params;
      await fapIntegration.syncUser(userId);
      res.json({ success: true, message: `User ${userId} synchronized from FAP` });
    } catch (error: any) {
      console.error("Manual user sync error:", error);
      res.status(500).json({ error: "Failed to sync user from FAP" });
    }
  });

  app.post("/api/fap/sync/users/all", requireAdminRole, async (req, res) => {
    try {
      await fapIntegration.syncAllUsers();
      res.json({ success: true, message: "All users synchronized from FAP" });
    } catch (error: any) {
      console.error("Bulk user sync error:", error);
      res.status(500).json({ error: "Failed to sync all users from FAP" });
    }
  });

  // ====================
  // SUBSCRIPTION MANAGEMENT - Admin/Support
  // ====================

  app.get("/api/fap/subscription/:userId", requireSupportRole, async (req, res) => {
    try {
      const { userId } = req.params;
      const subscription = await fapIntegration.getUserSubscription(userId);
      res.json(subscription);
    } catch (error: any) {
      console.error("Get FAP subscription error:", error);
      res.status(500).json({ error: "Failed to fetch FAP subscription" });
    }
  });

  app.put("/api/fap/subscription/:userId/status", requireAdminRole, async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      
      await fapIntegration.updateSubscriptionStatus(userId, status);
      res.json({ success: true, message: "Subscription status updated in FAP" });
    } catch (error: any) {
      console.error("Update FAP subscription error:", error);
      res.status(500).json({ error: "Failed to update subscription status in FAP" });
    }
  });

  // ====================
  // CROSS-PLATFORM SUPPORT TICKETS
  // ====================

  app.get("/api/fap/support/tickets", requireSupportRole, async (req, res) => {
    try {
      const { userId } = req.query;
      const fapTickets = await fapIntegration.getFAPSupportTickets(userId as string);
      res.json(fapTickets);
    } catch (error: any) {
      console.error("Get FAP support tickets error:", error);
      res.status(500).json({ error: "Failed to fetch FAP support tickets" });
    }
  });

  app.post("/api/fap/support/tickets", requireSupportRole, async (req, res) => {
    try {
      const ticketData = req.body;
      const fapTicket = await fapIntegration.createFAPSupportTicket(ticketData);
      
      // Also create local ticket for tracking
      const localTicket = await storage.createSupportTicket({
        ...ticketData,
        source: 'fap_created',
        assignedTo: req.user.id,
      });

      res.json({ 
        fapTicket, 
        localTicket,
        message: "Cross-platform support ticket created" 
      });
    } catch (error: any) {
      console.error("Create cross-platform ticket error:", error);
      res.status(500).json({ error: "Failed to create cross-platform support ticket" });
    }
  });

  app.put("/api/fap/support/tickets/:id/sync", requireSupportRole, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      await fapIntegration.syncSupportTicket(id, updates);
      res.json({ success: true, message: "Ticket synchronized to FAP" });
    } catch (error: any) {
      console.error("Sync ticket to FAP error:", error);
      res.status(500).json({ error: "Failed to sync ticket to FAP" });
    }
  });

  // ====================
  // EMAIL TEMPLATE SYNCHRONIZATION
  // ====================

  app.get("/api/fap/email-templates", requireAdminRole, async (req, res) => {
    try {
      const fapTemplates = await fapIntegration.getFAPEmailTemplates();
      res.json(fapTemplates);
    } catch (error: any) {
      console.error("Get FAP email templates error:", error);
      res.status(500).json({ error: "Failed to fetch FAP email templates" });
    }
  });

  app.post("/api/fap/email-templates/sync", requireAdminRole, async (req, res) => {
    try {
      const templateData = req.body;
      await fapIntegration.syncEmailTemplate(templateData);
      res.json({ success: true, message: "Email template synchronized to FAP" });
    } catch (error: any) {
      console.error("Sync email template to FAP error:", error);
      res.status(500).json({ error: "Failed to sync email template to FAP" });
    }
  });

  app.post("/api/fap/email-templates/sync-all", requireAdminRole, async (req, res) => {
    try {
      const localTemplates = await storage.getEmailTemplates();
      
      for (const template of localTemplates) {
        await fapIntegration.syncEmailTemplate({
          templateName: template.templateName,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent || undefined,
          category: template.category,
          variables: template.variables || [],
        });
      }

      res.json({ 
        success: true, 
        message: `${localTemplates.length} email templates synchronized to FAP` 
      });
    } catch (error: any) {
      console.error("Bulk sync email templates error:", error);
      res.status(500).json({ error: "Failed to sync all email templates to FAP" });
    }
  });

  // ====================
  // CROSS-PLATFORM ANALYTICS
  // ====================

  app.post("/api/fap/analytics/event", requireSupportRole, async (req, res) => {
    try {
      const { event, properties, userId } = req.body;
      
      await fapIntegration.sendAnalyticsData({
        userId,
        event,
        properties,
        timestamp: new Date(),
      });

      res.json({ success: true, message: "Analytics event sent to FAP" });
    } catch (error: any) {
      console.error("Send analytics to FAP error:", error);
      res.status(500).json({ error: "Failed to send analytics to FAP" });
    }
  });

  app.get("/api/fap/analytics/cross-platform", requireAdminRole, async (req, res) => {
    try {
      const { startDate, endDate, userId, event } = req.query;
      
      const analytics = await fapIntegration.getCrossplatformAnalytics({
        startDate: startDate as string,
        endDate: endDate as string,
        userId: userId as string,
        event: event as string,
      });

      res.json(analytics);
    } catch (error: any) {
      console.error("Get cross-platform analytics error:", error);
      res.status(500).json({ error: "Failed to fetch cross-platform analytics" });
    }
  });

  // ====================
  // AUTHENTICATION VERIFICATION
  // ====================

  app.post("/api/fap/auth/verify", async (req, res) => {
    try {
      const { sessionToken } = req.body;
      const user = await fapIntegration.verifyFAPSession(sessionToken);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid FAP session" });
      }

      // Sync user data if verified
      await fapIntegration.syncUser(user.id);
      
      res.json({ user, message: "FAP session verified and user synchronized" });
    } catch (error: any) {
      console.error("Verify FAP session error:", error);
      res.status(500).json({ error: "Failed to verify FAP session" });
    }
  });

  // ====================
  // HEALTH MONITORING
  // ====================

  app.get("/api/fap/health", requireAdminRole, async (req, res) => {
    try {
      const isHealthy = await fapIntegration.healthCheck();
      res.json({ 
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
        message: isHealthy ? "FAP integration is healthy" : "FAP integration is down"
      });
    } catch (error: any) {
      console.error("FAP health check error:", error);
      res.status(500).json({ 
        healthy: false,
        error: "Health check failed",
        timestamp: new Date().toISOString()
      });
    }
  });

  // ====================
  // CONFIGURATION MANAGEMENT
  // ====================

  app.get("/api/fap/config", requireAdminRole, async (req, res) => {
    try {
      res.json({
        baseUrl: process.env.FAP_API_BASE || 'https://freeamericanpeople.com/api',
        hasApiKey: !!process.env.FAP_API_KEY,
        hasWebhookSecret: !!process.env.FAP_WEBHOOK_SECRET,
        version: '1.0',
      });
    } catch (error: any) {
      console.error("Get FAP config error:", error);
      res.status(500).json({ error: "Failed to fetch FAP configuration" });
    }
  });

  app.put("/api/fap/config", requireAdminRole, async (req, res) => {
    try {
      const { baseUrl, apiKey, webhookSecret } = req.body;
      
      // Update environment variables (in production, this would be handled differently)
      if (baseUrl) process.env.FAP_API_BASE = baseUrl;
      if (apiKey) process.env.FAP_API_KEY = apiKey;
      if (webhookSecret) process.env.FAP_WEBHOOK_SECRET = webhookSecret;

      res.json({ success: true, message: "FAP configuration updated" });
    } catch (error: any) {
      console.error("Update FAP config error:", error);
      res.status(500).json({ error: "Failed to update FAP configuration" });
    }
  });
}

export default registerFAPRoutes;