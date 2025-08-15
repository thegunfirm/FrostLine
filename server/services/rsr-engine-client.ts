import axios from 'axios';

/**
 * RSR Engine Client for TheGunFirm.com
 * Submits orders to your Engine endpoint which then forwards to RSR
 */

export interface EngineOrderPayload {
  Storename: string;
  ShipAddress: string;
  ShipAddress2?: string;
  ShipCity: string;
  ShipState: string;
  ShipZip: string;
  ShipToStore: 'Y' | 'N';
  ShipAcccount: string; // Note: 3 'c' characters as per Engine spec
  ShipFFL: string;
  ContactNum: string;
  POS: string;
  PONum: string;
  Email: string;
  Items: Array<{
    PartNum: string;
    WishQTY: number;
  }>;
  FillOrKill: 0 | 1;
}

export interface EngineOrderResult {
  success: boolean;
  rsrOrderNumber?: string;
  estimatedShipDate?: Date;
  error?: string;
  engineResponse?: any;
}

export class RSREngineClient {
  private engineUrl: string;
  private apiKey: string;
  private storeName: string;

  constructor() {
    this.engineUrl = process.env.ENGINE_ORDER_URL || 'https://engine.thegunfirmapp.com/webhook/api/rsr/create-order';
    this.apiKey = process.env.RS_GROUP_API_KEY || '';
    this.storeName = process.env.STORE_NAME || 'THE GUN FIRM';

    if (!this.apiKey) {
      throw new Error('RS_GROUP_API_KEY environment variable is required for RSR Engine integration');
    }
  }

  /**
   * Submit order to RSR Engine
   */
  async submitOrder(orderPayload: EngineOrderPayload): Promise<EngineOrderResult> {
    try {
      console.log(`🚀 Submitting order to RSR Engine: ${orderPayload.PONum}`);

      const headers = {
        'Content-Type': 'application/json',
        'TGF-API-KEY': this.apiKey
      };

      const response = await axios.post(this.engineUrl, orderPayload, { 
        headers, 
        timeout: 30000 
      });

      const data = response.data;
      
      if (data.result && data.result.StatusCode === '00') {
        console.log(`✅ RSR Engine order submitted successfully: ${orderPayload.PONum}`);
        return {
          success: true,
          rsrOrderNumber: data.result.OrderNumber || orderPayload.PONum,
          engineResponse: data
        };
      } else {
        console.error(`⚠️ RSR Engine order failed:`, data);
        return {
          success: false,
          error: `Engine submission failed: ${data.result?.StatusMessage || 'Unknown error'}`,
          engineResponse: data
        };
      }

    } catch (error: any) {
      console.error('RSR Engine submission error:', error);
      return {
        success: false,
        error: `Engine request failed: ${error.message}`
      };
    }
  }

  /**
   * Build Engine order payload from TheGunFirm order data
   */
  buildOrderPayload({
    orderNumber,
    shippingAddress,
    customerInfo,
    items,
    fflLicense,
    dropShip = false
  }: {
    orderNumber: string;
    shippingAddress: any;
    customerInfo: any;
    items: Array<{ rsrStockNumber: string; quantity: number }>;
    fflLicense?: string;
    dropShip?: boolean;
  }): EngineOrderPayload {
    return {
      Storename: this.storeName,
      ShipAddress: shippingAddress.address1,
      ShipAddress2: shippingAddress.address2 || '',
      ShipCity: shippingAddress.city,
      ShipState: shippingAddress.state,
      ShipZip: shippingAddress.zip,
      ShipToStore: dropShip ? 'N' : 'Y', // Y = ship to store first, N = drop ship
      ShipAcccount: '', // Account mapping handled by Engine
      ShipFFL: fflLicense || process.env.FFL_FALLBACK || '',
      ContactNum: customerInfo.phone || '0000000000',
      POS: 'I', // Internet order
      PONum: orderNumber,
      Email: customerInfo.email,
      Items: items.map(item => ({
        PartNum: item.rsrStockNumber,
        WishQTY: item.quantity
      })),
      FillOrKill: 1 // Partial shipments not allowed
    };
  }

  /**
   * Health check for Engine availability
   */
  async healthCheck(): Promise<{ available: boolean; error?: string }> {
    try {
      // Try a simple GET to see if Engine is responding
      const response = await axios.get(this.engineUrl.replace('/webhook/api/rsr/create-order', '/health'), {
        headers: { 'TGF-API-KEY': this.apiKey },
        timeout: 5000
      });
      
      return { available: response.status === 200 };
    } catch (error: any) {
      return { 
        available: false, 
        error: `Engine health check failed: ${error.message}` 
      };
    }
  }
}

// Export singleton instance
export const rsrEngineClient = new RSREngineClient();