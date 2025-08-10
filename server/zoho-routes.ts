import type { Express } from "express";
import { syncCustomerToZoho, recordOrderInZoho, syncFFLToZoho, createZohoSupportTicket, batchSyncToZoho } from "./zoho-integration";
import { createZohoService } from "./zoho-service";

export function registerZohoRoutes(app: Express): void {
  const zohoService = createZohoService();

  // Check if Zoho service is available
  const checkZohoService = () => {
    if (!zohoService) {
      throw new Error("Zoho service not configured. Please provide ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET");
    }
    return zohoService;
  };

  // OAuth initiation endpoint
  app.get("/api/zoho/auth/url", async (req, res) => {
    try {
      const service = checkZohoService();
      const authUrl = service.getAuthorizationUrl();
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Zoho auth URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Connection status endpoint
  app.get("/api/zoho/status", async (req, res) => {
    try {
      if (!zohoService) {
        return res.json({ isConnected: false, error: "Zoho credentials not configured" });
      }
      const status = await zohoService.getConnectionStatus();
      res.json(status);
    } catch (error: any) {
      console.error("Zoho status error:", error);
      res.json({ isConnected: false });
    }
  });

  // Test connection endpoint
  app.get("/api/zoho/test", async (req, res) => {
    try {
      const result = await zohoService.testConnection();
      res.json(result);
    } catch (error: any) {
      console.error("Zoho test error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Disconnect endpoint
  app.post("/api/zoho/disconnect", async (req, res) => {
    try {
      await zohoService.disconnect();
      res.json({ message: "Disconnected from Zoho successfully" });
    } catch (error: any) {
      console.error("Zoho disconnect error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // OAuth callback endpoint
  app.get("/api/zoho/callback", async (req, res) => {
    try {
      const { code } = req.query;
      if (!code) {
        return res.status(400).json({ error: "Authorization code required" });
      }

      const tokens = await zohoService.exchangeCodeForTokens(code as string);
      
      // Store tokens securely (you may want to encrypt these)
      process.env.ZOHO_ACCESS_TOKEN = tokens.access_token;
      if (tokens.refresh_token) {
        process.env.ZOHO_REFRESH_TOKEN = tokens.refresh_token;
      }

      res.json({ 
        message: "Zoho integration configured successfully",
        apiDomain: tokens.api_domain
      });
    } catch (error: any) {
      console.error("Zoho OAuth callback error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Customer sync endpoints
  app.post("/api/zoho/sync/customer/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      await syncCustomerToZoho(userId);
      res.json({ message: "Customer synced to Zoho successfully" });
    } catch (error: any) {
      console.error("Customer sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Order recording endpoints
  app.post("/api/zoho/sync/order/:orderId", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      await recordOrderInZoho(orderId);
      res.json({ message: "Order recorded in Zoho successfully" });
    } catch (error: any) {
      console.error("Order sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // FFL sync endpoints
  app.post("/api/zoho/sync/ffl/:fflId", async (req, res) => {
    try {
      const fflId = parseInt(req.params.fflId);
      await syncFFLToZoho(fflId);
      res.json({ message: "FFL synced to Zoho successfully" });
    } catch (error: any) {
      console.error("FFL sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Batch sync endpoint
  app.post("/api/zoho/sync/batch", async (req, res) => {
    try {
      const { customers, orders, ffls } = req.body;
      await batchSyncToZoho({ customers, orders, ffls });
      res.json({ message: "Batch sync completed successfully" });
    } catch (error: any) {
      console.error("Batch sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Support ticket creation
  app.post("/api/zoho/support/ticket", async (req, res) => {
    try {
      const { userId, subject, description, priority, category } = req.body;
      const ticketId = await createZohoSupportTicket({
        userId,
        subject,
        description,
        priority,
        category
      });
      res.json({ ticketId, message: "Support ticket created successfully" });
    } catch (error: any) {
      console.error("Support ticket creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Customer order history from Zoho
  app.get("/api/zoho/customer/:userId/orders", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      // This would require getting the user's Zoho contact ID first
      // Then fetching their orders from Zoho
      res.json({ message: "Customer order history endpoint - to be implemented" });
    } catch (error: any) {
      console.error("Customer orders fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // FFL search in Zoho
  app.get("/api/zoho/ffls/search", async (req, res) => {
    try {
      const { state, zipCode, fflNumber } = req.query;
      const ffls = await zohoService.searchFFLVendors({
        state: state as string,
        zipCode: zipCode as string,
        fflNumber: fflNumber as string
      });
      res.json({ ffls });
    } catch (error: any) {
      console.error("FFL search error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check endpoint
  app.get("/api/zoho/health", async (req, res) => {
    try {
      // Use the testConnection method instead of private makeRequest
      const result = await zohoService.testConnection();
      if (result.success) {
        res.json({ status: "connected", message: "Zoho API connection is healthy" });
      } else {
        res.status(500).json({ status: "disconnected", error: result.message });
      }
    } catch (error: any) {
      console.error("Zoho health check failed:", error);
      res.status(500).json({ status: "disconnected", error: error.message });
    }
  });
}