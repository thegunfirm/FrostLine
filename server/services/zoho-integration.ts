/**
 * Zoho Integration Service
 * Syncs RSR product data with Zoho CRM/Inventory
 */

import axios from 'axios';
import { db } from '../db';
import { products } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  refreshToken?: string;
  accessToken?: string;
  apiDomain: string; // e.g., 'https://www.zohoapis.com'
}

interface ZohoProduct {
  Product_Name: string;
  Product_Code: string;
  Category: string;
  Manufacturer: string;
  Unit_Price: number;
  Qty_in_Stock: number;
  Description: string;
  Product_Active: boolean;
  Vendor_Name: string;
  Cost_Price: number;
  Tax: string;
  Reorder_Level: number;
}

export class ZohoIntegrationService {
  private config: ZohoConfig;

  constructor() {
    this.config = {
      clientId: process.env.ZOHO_CLIENT_ID || '',
      clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
      redirectUri: process.env.ZOHO_REDIRECT_URI || '',
      scope: 'ZohoCRM.modules.ALL,ZohoInventory.FullAccess.all',
      refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
      apiDomain: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com'
    };
  }

  /**
   * Get Zoho access token using refresh token
   */
  async getAccessToken(): Promise<string> {
    try {
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          refresh_token: this.config.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Error getting Zoho access token:', error);
      throw new Error('Failed to authenticate with Zoho');
    }
  }

  /**
   * Transform RSR product to Zoho format
   */
  private transformProductToZoho(product: any): ZohoProduct {
    return {
      Product_Name: product.name,
      Product_Code: product.stockNo || product.sku || `RSR-${product.id}`,
      Category: product.category,
      Manufacturer: product.manufacturer || 'Unknown',
      Unit_Price: parseFloat(product.priceBronze || product.priceWholesale || '0'),
      Qty_in_Stock: product.stockQuantity || 0,
      Description: product.description || product.fullDescription || '',
      Product_Active: true,
      Vendor_Name: 'RSR Group',
      Cost_Price: parseFloat(product.priceWholesale || '0'),
      Tax: 'Taxable',
      Reorder_Level: 5
    };
  }

  /**
   * Create or update product in Zoho Inventory
   */
  async syncProductToZoho(product: any): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const zohoProduct = this.transformProductToZoho(product);

      const headers = {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      };

      // First, check if product exists
      const searchResponse = await axios.get(
        `${this.config.apiDomain}/inventory/v1/items`,
        {
          headers,
          params: {
            sku: zohoProduct.Product_Code
          }
        }
      );

      let response;
      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        // Update existing product
        const itemId = searchResponse.data.items[0].item_id;
        response = await axios.put(
          `${this.config.apiDomain}/inventory/v1/items/${itemId}`,
          zohoProduct,
          { headers }
        );
      } else {
        // Create new product
        response = await axios.post(
          `${this.config.apiDomain}/inventory/v1/items`,
          zohoProduct,
          { headers }
        );
      }

      return response.data.code === 0;
    } catch (error) {
      console.error('Error syncing product to Zoho:', error);
      return false;
    }
  }

  /**
   * Sync all RSR products to Zoho in batches
   */
  async syncAllProductsToZoho(batchSize: number = 50): Promise<{
    total: number;
    synced: number;
    failed: number;
  }> {
    const allProducts = await db.select().from(products);
    const total = allProducts.length;
    let synced = 0;
    let failed = 0;

    console.log(`Starting Zoho sync for ${total} products...`);

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      
      const promises = batch.map(async (product) => {
        const success = await this.syncProductToZoho(product);
        if (success) {
          synced++;
        } else {
          failed++;
        }
        return success;
      });

      await Promise.all(promises);
      
      // Rate limiting - wait between batches
      if (i + batchSize < allProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`Processed ${Math.min(i + batchSize, total)}/${total} products`);
    }

    return { total, synced, failed };
  }

  /**
   * Create Zoho webhook to sync back inventory updates
   */
  async createZohoWebhook(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      const webhookData = {
        webhook_url: `${process.env.BASE_URL || 'http://localhost:5000'}/api/zoho/webhook`,
        event: 'item.update',
        format: 'json'
      };

      const response = await axios.post(
        `${this.config.apiDomain}/inventory/v1/webhooks`,
        webhookData,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.code === 0;
    } catch (error) {
      console.error('Error creating Zoho webhook:', error);
      return false;
    }
  }

  /**
   * Handle incoming Zoho webhook data
   */
  async handleZohoWebhook(webhookData: any): Promise<boolean> {
    try {
      const { event_type, data } = webhookData;
      
      if (event_type === 'item.update' && data.item) {
        const zohoItem = data.item;
        
        // Find matching product by SKU
        const matchingProducts = await db.select().from(products)
          .where(eq(products.stockNo, zohoItem.sku))
          .limit(1);

        if (matchingProducts.length > 0) {
          // Update local product with Zoho data
          await db.update(products)
            .set({
              stockQuantity: zohoItem.available_stock || 0,
              priceBronze: zohoItem.rate?.toString() || matchingProducts[0].priceBronze
            })
            .where(eq(products.id, matchingProducts[0].id));
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error handling Zoho webhook:', error);
      return false;
    }
  }

  /**
   * Get Zoho integration status
   */
  async getIntegrationStatus(): Promise<{
    connected: boolean;
    lastSync?: Date;
    productsInZoho?: number;
    error?: string;
  }> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.config.apiDomain}/inventory/v1/items`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`
          },
          params: {
            page: 1,
            per_page: 1
          }
        }
      );

      return {
        connected: true,
        productsInZoho: response.data.page_context?.total || 0
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

export const zohoIntegration = new ZohoIntegrationService();