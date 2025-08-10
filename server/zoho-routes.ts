import type { Express } from "express";
import { syncCustomerToZoho, recordOrderInZoho, syncFFLToZoho, createZohoSupportTicket, batchSyncToZoho } from "./zoho-integration";
import { createZohoService } from "./zoho-service";

export function registerZohoRoutes(app: Express): void {
  // Check if Zoho service is available
  const checkZohoService = async () => {
    const zohoService = await createZohoService();
    if (!zohoService) {
      throw new Error("Zoho service not configured. Please configure through CMS Admin → Zoho Integration");
    }
    return zohoService;
  };

  // OAuth initiation endpoint
  app.get("/api/zoho/auth/url", async (req, res) => {
    try {
      const service = await checkZohoService();
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
      const zohoService = await createZohoService();
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
      const service = checkZohoService();
      const result = await service.testConnection();
      res.json(result);
    } catch (error: any) {
      console.error("Zoho test error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Disconnect endpoint
  app.post("/api/zoho/disconnect", async (req, res) => {
    try {
      const service = checkZohoService();
      await service.disconnect();
      res.json({ message: "Disconnected from Zoho successfully" });
    } catch (error: any) {
      console.error("Zoho disconnect error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // OAuth callback endpoint
  app.get("/api/zoho/auth/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      
      if (error) {
        console.error("OAuth error from Zoho:", error);
        return res.status(400).send(`
          <html><body>
            <h2>OAuth Error</h2>
            <p>Error: ${error}</p>
            <p>This usually means the Zoho app configuration doesn't match our setup.</p>
            <p><a href="/">Return to homepage</a></p>
          </body></html>
        `);
      }
      
      if (!code) {
        return res.status(400).send(`
          <html><body>
            <h2>Missing Authorization Code</h2>
            <p>No authorization code received from Zoho.</p>
            <p><a href="/">Return to homepage</a></p>
          </body></html>
        `);
      }

      const service = await checkZohoService();
      const tokens = await service.exchangeCodeForTokens(code as string);
      
      // Store tokens securely
      process.env.ZOHO_ACCESS_TOKEN = tokens.access_token;
      if (tokens.refresh_token) {
        process.env.ZOHO_REFRESH_TOKEN = tokens.refresh_token;
      }

      // Success page with test account creation
      res.send(`
        <html><body>
          <h2>✅ Zoho Integration Complete!</h2>
          <p>Access token obtained successfully.</p>
          <p>Creating test account...</p>
          <script>
            fetch('/api/zoho/create-test-account', { method: 'POST' })
              .then(r => r.json())
              .then(data => {
                document.body.innerHTML += '<p><strong>Test Account Created:</strong> ' + JSON.stringify(data) + '</p>';
              })
              .catch(e => {
                document.body.innerHTML += '<p><strong>Test Account Error:</strong> ' + e.message + '</p>';
              });
          </script>
          <p><a href="/">Return to homepage</a></p>
        </body></html>
      `);
    } catch (error: any) {
      console.error("Zoho OAuth callback error:", error);
      res.status(500).send(`
        <html><body>
          <h2>OAuth Callback Error</h2>
          <p>Error: ${error.message}</p>
          <p><a href="/">Return to homepage</a></p>
        </body></html>
      `);
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

  // Create test account endpoint
  app.post("/api/zoho/create-test-account", async (req, res) => {
    try {
      const service = await checkZohoService();
      const testData = {
        First_Name: 'Test',
        Last_Name: 'Account', 
        Email: 'zoho.test.verification@thegunfirm.com',
        Phone: '555-0199',
        Lead_Source: 'Website',
        Membership_Tier: 'Bronze Monthly',
        Account_Name: 'Test Account'
      };
      
      const contact = await service.createContact(testData);
      res.json({ 
        message: "Test account created successfully",
        contactId: contact.id,
        email: testData.Email
      });
    } catch (error: any) {
      console.error("Test account creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create customer in Zoho (for FAP integration)
  app.post("/api/zoho/customers", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, subscriptionTier, fapUserId } = req.body;
      
      if (!firstName || !lastName || !email || !subscriptionTier || !fapUserId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { createCustomerInZoho } = await import("./zoho-integration");
      const zohoContactId = await createCustomerInZoho({
        firstName,
        lastName,
        email,
        phone,
        subscriptionTier,
        fapUserId
      });

      res.json({ 
        message: "Customer created in Zoho successfully",
        zohoContactId 
      });
    } catch (error: any) {
      console.error("Customer creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update customer tier in Zoho
  app.put("/api/zoho/customers/:userId/tier", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { tier } = req.body;
      
      if (!tier) {
        return res.status(400).json({ error: "Tier is required" });
      }

      const { updateCustomerTierInZoho } = await import("./zoho-integration");
      await updateCustomerTierInZoho(userId, tier);
      
      res.json({ message: "Customer tier updated in Zoho successfully" });
    } catch (error: any) {
      console.error("Customer tier update error:", error);
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
      const service = checkZohoService();
      const { state, zipCode, fflNumber } = req.query;
      const ffls = await service.searchFFLVendors({
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

  // FAP Authentication endpoint
  app.post("/api/zoho/auth/fap", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const { authenticateWithFAP } = await import("./zoho-integration");
      const result = await authenticateWithFAP(email, password);
      
      if (result.success) {
        res.json({ 
          success: true, 
          user: result.user,
          message: "Authentication successful"
        });
      } else {
        res.status(401).json({ 
          success: false, 
          error: result.error 
        });
      }
    } catch (error: any) {
      console.error("FAP authentication error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Sync user from FAP
  app.post("/api/zoho/sync/fap-user/:fapUserId", async (req, res) => {
    try {
      const { fapUserId } = req.params;
      
      const { syncUserFromFAP } = await import("./zoho-integration");
      await syncUserFromFAP(fapUserId);
      
      res.json({ message: "User synced from FAP successfully" });
    } catch (error: any) {
      console.error("FAP user sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Order tracking endpoints
  app.post("/api/zoho/orders/:orderId/record", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      const { recordOrderInZoho } = await import("./zoho-integration");
      await recordOrderInZoho(orderId);
      
      res.json({ message: "Order recorded in Zoho successfully" });
    } catch (error: any) {
      console.error("Order recording error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Support ticket creation
  app.post("/api/zoho/support/tickets", async (req, res) => {
    try {
      const { customerId, subject, description, priority, category } = req.body;
      
      if (!customerId || !subject || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { createZohoSupportTicket } = await import("./zoho-integration");
      const ticketId = await createZohoSupportTicket({
        customerId: parseInt(customerId),
        subject,
        description,
        priority: priority || 'Medium',
        category
      });
      
      res.json({ 
        message: "Support ticket created successfully",
        ticketId 
      });
    } catch (error: any) {
      console.error("Support ticket creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Batch synchronization
  app.post("/api/zoho/batch-sync", async (req, res) => {
    try {
      const { customers = [], orders = [], ffls = [] } = req.body;
      
      const { batchSyncToZoho } = await import("./zoho-integration");
      await batchSyncToZoho({ customers, orders, ffls });
      
      res.json({ message: "Batch synchronization completed successfully" });
    } catch (error: any) {
      console.error("Batch sync error:", error);
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