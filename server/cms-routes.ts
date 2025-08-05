import type { Express } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { users, orders } from "@shared/schema";
import { sql } from "drizzle-orm";

// Role-based access middleware
const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Required roles: ${allowedRoles.join(', ')}` });
    }

    next();
  };
};

export function registerCMSRoutes(app: Express) {
  
  // ====================
  // ADMIN ONLY ROUTES - Website Maintenance & Development
  // ====================
  
  // API Configuration Management
  app.get("/api/cms/admin/api-configs", requireRole(['admin']), async (req, res) => {
    try {
      const configs = await storage.getApiConfigurations();
      res.json(configs);
    } catch (error) {
      console.error("Get API configurations error:", error);
      res.status(500).json({ message: "Failed to fetch API configurations" });
    }
  });

  app.post("/api/cms/admin/api-configs", requireRole(['admin']), async (req, res) => {
    try {
      const { serviceName, configType, configKey, configValue, description } = req.body;
      
      const config = await storage.createApiConfiguration({
        serviceName,
        configType,
        configKey,
        configValue,
        description,
        lastModifiedBy: req.user.id
      });
      
      res.json(config);
    } catch (error) {
      console.error("Create API configuration error:", error);
      res.status(500).json({ message: "Failed to create API configuration" });
    }
  });

  app.put("/api/cms/admin/api-configs/:id", requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body, lastModifiedBy: req.user.id };
      
      const config = await storage.updateApiConfiguration(parseInt(id), updates);
      res.json(config);
    } catch (error) {
      console.error("Update API configuration error:", error);
      res.status(500).json({ message: "Failed to update API configuration" });
    }
  });

  app.delete("/api/cms/admin/api-configs/:id", requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteApiConfiguration(parseInt(id));
      res.json({ message: "API configuration deleted successfully" });
    } catch (error) {
      console.error("Delete API configuration error:", error);
      res.status(500).json({ message: "Failed to delete API configuration" });
    }
  });

  // System Settings Management
  app.get("/api/cms/admin/system-settings", requireRole(['admin']), async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get system settings error:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.put("/api/cms/admin/system-settings/:key", requireRole(['admin']), async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      const setting = await storage.updateSystemSetting(key, value, req.user.id);
      res.json(setting);
    } catch (error) {
      console.error("Update system setting error:", error);
      res.status(500).json({ message: "Failed to update system setting" });
    }
  });

  // User Activity Logs (Admin view all)
  app.get("/api/cms/admin/activity-logs", requireRole(['admin']), async (req, res) => {
    try {
      const { userId, limit } = req.query;
      const logs = await storage.getUserActivityLogs(
        userId ? parseInt(userId as string) : undefined,
        limit ? parseInt(limit as string) : 100
      );
      res.json(logs);
    } catch (error) {
      console.error("Get activity logs error:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // ====================
  // MANAGER/HIGHER LEVEL STAFF - Email Template Management
  // ====================

  app.get("/api/cms/emails/templates", requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Get email templates error:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.get("/api/cms/emails/templates/:id", requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getEmailTemplate(parseInt(id));
      
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Get email template error:", error);
      res.status(500).json({ message: "Failed to fetch email template" });
    }
  });

  app.post("/api/cms/emails/templates", requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { templateName, subject, htmlContent, textContent, variables, category, description } = req.body;
      
      const template = await storage.createEmailTemplate({
        templateName,
        subject,
        htmlContent,
        textContent,
        variables,
        category,
        description,
        lastModifiedBy: req.user.id
      });
      
      res.json(template);
    } catch (error) {
      console.error("Create email template error:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.put("/api/cms/emails/templates/:id", requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body, lastModifiedBy: req.user.id };
      
      const template = await storage.updateEmailTemplate(parseInt(id), updates);
      res.json(template);
    } catch (error) {
      console.error("Update email template error:", error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.delete("/api/cms/emails/templates/:id", requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEmailTemplate(parseInt(id));
      res.json({ message: "Email template deleted successfully" });
    } catch (error) {
      console.error("Delete email template error:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // ====================
  // SUPPORT STAFF - Customer Relations & Order Management
  // ====================

  // Support Tickets
  app.get("/api/cms/support/tickets", requireRole(['admin', 'support', 'manager']), async (req, res) => {
    try {
      const { assignedTo, status, priority } = req.query;
      
      const filters: any = {};
      if (assignedTo) filters.assignedTo = parseInt(assignedTo as string);
      if (status) filters.status = status as string;
      if (priority) filters.priority = priority as string;
      
      // Support staff can only see their own tickets unless admin/manager
      if (req.user.role === 'support') {
        filters.assignedTo = req.user.id;
      }
      
      const tickets = await storage.getSupportTickets(filters);
      res.json(tickets);
    } catch (error) {
      console.error("Get support tickets error:", error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.get("/api/cms/support/tickets/:id", requireRole(['admin', 'support', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const ticket = await storage.getSupportTicket(parseInt(id));
      
      if (!ticket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
      
      // Support staff can only view their own tickets unless admin/manager
      if (req.user.role === 'support' && ticket.assignedTo !== req.user.id) {
        return res.status(403).json({ message: "Access denied to this ticket" });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Get support ticket error:", error);
      res.status(500).json({ message: "Failed to fetch support ticket" });
    }
  });

  app.post("/api/cms/support/tickets", requireRole(['admin', 'support', 'manager']), async (req, res) => {
    try {
      const { customerId, subject, description, priority, category, relatedOrderId } = req.body;
      
      const ticket = await storage.createSupportTicket({
        customerId,
        subject,
        description,
        priority: priority || 'medium',
        category,
        relatedOrderId,
        assignedTo: req.user.role === 'support' ? req.user.id : undefined
      });
      
      res.json(ticket);
    } catch (error) {
      console.error("Create support ticket error:", error);
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  app.put("/api/cms/support/tickets/:id", requireRole(['admin', 'support', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const ticket = await storage.getSupportTicket(parseInt(id));
      
      if (!ticket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
      
      // Support staff can only update their own tickets
      if (req.user.role === 'support' && ticket.assignedTo !== req.user.id) {
        return res.status(403).json({ message: "Access denied to this ticket" });
      }
      
      const updates = req.body;
      if (updates.status === 'resolved' && !ticket.resolvedAt) {
        updates.resolvedAt = new Date();
      }
      
      const updatedTicket = await storage.updateSupportTicket(parseInt(id), updates);
      res.json(updatedTicket);
    } catch (error) {
      console.error("Update support ticket error:", error);
      res.status(500).json({ message: "Failed to update support ticket" });
    }
  });

  // Support Ticket Messages
  app.get("/api/cms/support/tickets/:id/messages", requireRole(['admin', 'support', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getSupportTicketMessages(parseInt(id));
      res.json(messages);
    } catch (error) {
      console.error("Get ticket messages error:", error);
      res.status(500).json({ message: "Failed to fetch ticket messages" });
    }
  });

  app.post("/api/cms/support/tickets/:id/messages", requireRole(['admin', 'support', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const { message, isInternal } = req.body;
      
      const newMessage = await storage.createSupportTicketMessage({
        ticketId: parseInt(id),
        senderId: req.user.id,
        senderType: 'support',
        message,
        isInternal: isInternal || false
      });
      
      res.json(newMessage);
    } catch (error) {
      console.error("Create ticket message error:", error);
      res.status(500).json({ message: "Failed to create ticket message" });
    }
  });

  // Order Notes
  app.get("/api/cms/support/orders/:id/notes", requireRole(['admin', 'support', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const notes = await storage.getOrderNotes(parseInt(id));
      res.json(notes);
    } catch (error) {
      console.error("Get order notes error:", error);
      res.status(500).json({ message: "Failed to fetch order notes" });
    }
  });

  app.post("/api/cms/support/orders/:id/notes", requireRole(['admin', 'support', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const { noteType, content, isVisibleToCustomer } = req.body;
      
      const note = await storage.createOrderNote({
        orderId: parseInt(id),
        authorId: req.user.id,
        noteType,
        content,
        isVisibleToCustomer: isVisibleToCustomer || false
      });
      
      res.json(note);
    } catch (error) {
      console.error("Create order note error:", error);
      res.status(500).json({ message: "Failed to create order note" });
    }
  });

  // User Activity Logs (Support can view specific users)
  app.get("/api/cms/support/users/:userId/activity", requireRole(['admin', 'support', 'manager']), async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit } = req.query;
      
      const logs = await storage.getUserActivityLogs(
        parseInt(userId),
        limit ? parseInt(limit as string) : 50
      );
      
      res.json(logs);
    } catch (error) {
      console.error("Get user activity error:", error);
      res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  // ====================
  // SHARED ROUTES - Multiple Role Access
  // ====================

  // Dashboard Statistics
  app.get("/api/cms/dashboard/stats", requireRole(['admin', 'support', 'manager']), async (req, res) => {
    try {
      const stats: any = {};
      
      if (['admin', 'manager'].includes(req.user.role)) {
        // Admin and managers see all stats
        stats.totalUsers = await db.select({ count: sql`count(*)` }).from(users);
        stats.totalOrders = await db.select({ count: sql`count(*)` }).from(orders);
        stats.openTickets = await storage.getSupportTickets({ status: 'open' });
        stats.emailTemplates = await storage.getEmailTemplates();
      }
      
      if (['admin', 'support', 'manager'].includes(req.user.role)) {
        // All staff can see their assigned tickets
        const myTickets = await storage.getSupportTickets({ 
          assignedTo: req.user.role === 'support' ? req.user.id : undefined 
        });
        stats.myTickets = myTickets;
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });
}

export default registerCMSRoutes;