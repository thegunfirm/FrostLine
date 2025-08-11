import { ZohoService } from './zoho-service';

export interface OrderToZohoData {
  orderNumber: string;
  totalAmount: number;
  customerEmail: string;
  customerName: string;
  membershipTier: string;
  orderItems: Array<{
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    fflRequired?: boolean;
  }>;
  fflDealerName?: string;
  orderStatus: string;
  zohoContactId?: string;
}

/**
 * Service to handle integration between TheGunFirm orders and Zoho CRM deals
 */
export class OrderZohoIntegration {
  private zohoService: ZohoService;

  constructor() {
    this.zohoService = new ZohoService({
      clientId: process.env.ZOHO_CLIENT_ID!,
      clientSecret: process.env.ZOHO_CLIENT_SECRET!,
      redirectUri: process.env.ZOHO_REDIRECT_URI!,
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
      apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com',
      accessToken: process.env.ZOHO_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN
    });
  }

  /**
   * Create or update a Zoho Deal for a TheGunFirm order
   */
  async processOrderToDeal(orderData: OrderToZohoData): Promise<{
    success: boolean;
    dealId?: string;
    contactId?: string;
    error?: string;
  }> {
    try {
      console.log(`🔄 Processing order ${orderData.orderNumber} to Zoho CRM...`);

      // 1. Find or create customer contact
      let contactId = orderData.zohoContactId;
      
      if (!contactId) {
        const existingContact = await this.zohoService.findContactByEmail(orderData.customerEmail);
        
        if (existingContact) {
          contactId = existingContact.id;
          console.log(`✅ Found existing contact: ${contactId}`);
        } else {
          // Create new contact if customer doesn't exist
          const nameParts = orderData.customerName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const newContact = await this.zohoService.createContact({
            Email: orderData.customerEmail,
            First_Name: firstName,
            Last_Name: lastName,
            Lead_Source: 'TheGunFirm.com',
            Description: JSON.stringify({
              membershipTier: orderData.membershipTier,
              accountType: 'Customer',
              createdFrom: 'Order Processing'
            })
          });

          contactId = newContact.id;
          console.log(`✅ Created new contact: ${contactId}`);
        }
      }

      // 2. Check for existing deal
      const existingDeal = await this.zohoService.getDealByOrderNumber(orderData.orderNumber);
      
      if (existingDeal) {
        // Update existing deal if status changed
        const updated = await this.zohoService.updateDealStage(existingDeal.id, orderData.orderStatus);
        console.log(`📝 Updated existing deal ${existingDeal.id}: ${updated ? 'success' : 'failed'}`);
        
        return {
          success: true,
          dealId: existingDeal.id,
          contactId
        };
      }

      // 3. Create new deal
      const fflRequired = orderData.orderItems.some(item => item.fflRequired);
      
      const dealResult = await this.zohoService.createOrderDeal({
        contactId,
        orderNumber: orderData.orderNumber,
        totalAmount: orderData.totalAmount,
        orderItems: orderData.orderItems,
        membershipTier: orderData.membershipTier,
        fflRequired,
        fflDealerName: orderData.fflDealerName,
        orderStatus: orderData.orderStatus
      });

      if (dealResult.success) {
        console.log(`✅ Created new deal ${dealResult.dealId} for order ${orderData.orderNumber}`);
        return {
          success: true,
          dealId: dealResult.dealId,
          contactId
        };
      } else {
        console.error(`❌ Failed to create deal: ${dealResult.error}`);
        return {
          success: false,
          error: dealResult.error
        };
      }

    } catch (error: any) {
      console.error('Order-to-Zoho integration error:', error);
      return {
        success: false,
        error: `Integration error: ${error.message}`
      };
    }
  }

  /**
   * Update deal status when order status changes
   */
  async updateOrderStatus(orderNumber: string, newStatus: string): Promise<boolean> {
    try {
      const existingDeal = await this.zohoService.getDealByOrderNumber(orderNumber);
      
      if (existingDeal) {
        const updated = await this.zohoService.updateDealStage(existingDeal.id, newStatus);
        console.log(`📝 Updated deal ${existingDeal.id} status to ${newStatus}: ${updated ? 'success' : 'failed'}`);
        return updated;
      }

      console.log(`⚠️  No deal found for order ${orderNumber}`);
      return false;
    } catch (error: any) {
      console.error('Deal status update error:', error);
      return false;
    }
  }

  /**
   * Extract order data from various order formats for Zoho integration
   */
  static formatOrderForZoho(order: any, customerInfo: any): OrderToZohoData {
    return {
      orderNumber: order.id?.toString() || order.orderNumber || `ORD-${Date.now()}`,
      totalAmount: parseFloat(order.totalPrice?.toString() || '0'),
      customerEmail: customerInfo.email || order.customerEmail || '',
      customerName: customerInfo.name || 
                   `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() ||
                   order.customerName || 'Customer',
      membershipTier: customerInfo.membershipTier || order.membershipTier || 'Bronze',
      orderItems: (order.items || []).map((item: any) => ({
        productName: item.name || item.description || item.productName || 'Product',
        sku: item.sku || item.rsrStock || item.id?.toString() || '',
        quantity: parseInt(item.quantity?.toString() || '1'),
        unitPrice: parseFloat(item.price?.toString() || item.unitPrice?.toString() || '0'),
        totalPrice: parseFloat(item.totalPrice?.toString() || (item.price * item.quantity)?.toString() || '0'),
        fflRequired: item.fflRequired || item.requiresFFL || false
      })),
      fflDealerName: order.fflDealerName || customerInfo.fflDealerName,
      orderStatus: order.status || 'pending',
      zohoContactId: customerInfo.zohoContactId || order.zohoContactId
    };
  }
}

// Export singleton instance
export const orderZohoIntegration = new OrderZohoIntegration();