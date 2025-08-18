// Manual order creation endpoint for testing
import type { Request, Response } from 'express';

export async function registerManualOrderToZohoEndpoint(app: any) {
  // Manual order-to-Zoho for testing complete sales
  app.post("/api/test/manual-order-to-zoho", async (req: Request, res: Response) => {
    try {
      console.log('🧪 Manual order-to-Zoho test initiated...');
      
      const orderData = req.body;
      
      if (!orderData.orderNumber || !orderData.customerEmail || !orderData.orderItems) {
        return res.status(400).json({
          success: false,
          error: 'Missing required order data (orderNumber, customerEmail, orderItems)'
        });
      }
      
      console.log(`📋 Processing manual order: ${orderData.orderNumber}`);
      console.log(`📧 Customer: ${orderData.customerEmail}`);
      console.log(`🛒 Items: ${orderData.orderItems.length}`);
      console.log(`💰 Total: $${orderData.totalAmount}`);
      
      const { orderZohoIntegration } = await import('./order-zoho-integration');
      
      // Process the order through our existing integration
      const result = await orderZohoIntegration.processOrderToDeal(orderData);
      
      if (result.success) {
        console.log('✅ Manual order processed successfully!');
        console.log(`🆔 Deal ID: ${result.dealId}`);
        console.log(`👤 Contact ID: ${result.contactId}`);
        
        res.json({
          success: true,
          dealId: result.dealId,
          contactId: result.contactId,
          orderNumber: orderData.orderNumber,
          message: 'Manual order processed to Zoho successfully'
        });
      } else {
        console.error('❌ Manual order processing failed:', result.error);
        res.status(500).json({
          success: false,
          error: result.error,
          message: 'Manual order processing failed'
        });
      }
      
    } catch (error: any) {
      console.error('💥 Manual order test error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Manual order test execution failed'
      });
    }
  });

  // Deal details endpoint for verification
  app.get("/api/zoho/deal-details/:dealId", async (req: Request, res: Response) => {
    try {
      const { dealId } = req.params;
      
      const { ZohoService } = await import('./zoho-service');
      const zohoService = new ZohoService({
        clientId: process.env.ZOHO_WEBSERVICES_CLIENT_ID!,
        clientSecret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET!,
        redirectUri: process.env.ZOHO_REDIRECT_URI!,
        accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
        apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com',
        accessToken: process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN,
        refreshToken: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN
      });
      
      const dealDetails = await zohoService.getDealById(dealId);
      
      if (dealDetails) {
        res.json({
          success: true,
          deal: dealDetails,
          message: 'Deal details retrieved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Deal not found',
          message: 'Could not retrieve deal details'
        });
      }
      
    } catch (error: any) {
      console.error('Deal details error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to retrieve deal details'
      });
    }
  });

  // Product verification endpoint
  app.get("/api/zoho/verify-product", async (req: Request, res: Response) => {
    try {
      const { sku } = req.query;
      
      if (!sku) {
        return res.status(400).json({
          success: false,
          error: 'SKU parameter required'
        });
      }
      
      const { productLookupService } = await import('./services/product-lookup-service');
      
      // Check if product exists in our database (which means it can be found/created in Zoho)
      const product = await productLookupService.findProductBySku(sku as string);
      
      if (product) {
        res.json({
          success: true,
          found: true,
          product: {
            sku: product.sku,
            name: product.name,
            manufacturer: product.manufacturer
          },
          message: 'Product verified in system'
        });
      } else {
        res.json({
          success: false,
          found: false,
          message: 'Product not found in system'
        });
      }
      
    } catch (error: any) {
      console.error('Product verification error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Product verification failed'
      });
    }
  });
}