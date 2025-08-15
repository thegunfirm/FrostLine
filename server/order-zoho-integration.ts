import { ZohoService } from './zoho-service';
import { zohoOrderFieldsService, type ZohoOrderFieldMapping } from './services/zoho-order-fields-service';

export interface OrderToZohoData {
  orderNumber: string;
  totalAmount: number;
  customerEmail: string;
  customerName: string;
  membershipTier: string;
  orderItems: Array<{
    productName: string;
    sku: string;
    rsrStockNumber?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    fflRequired?: boolean;
  }>;
  fflDealerName?: string;
  orderStatus: string;
  zohoContactId?: string;
  // New RSR-specific fields
  fulfillmentType?: 'In-House' | 'Drop-Ship';
  orderingAccount?: '99901' | '99902' | '63824' | '60742';
  requiresDropShip?: boolean;
  holdType?: 'FFL not on file' | 'Gun Count Rule';
  engineResponse?: any;
  isTestOrder?: boolean;
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
   * Create or update a Zoho Deal with comprehensive RSR field mapping
   */
  async processOrderWithRSRFields(orderData: OrderToZohoData): Promise<{
    success: boolean;
    dealId?: string;
    tgfOrderNumber?: string;
    zohoFields?: ZohoOrderFieldMapping;
    error?: string;
  }> {
    try {
      console.log(`🔄 Processing RSR order ${orderData.orderNumber} with comprehensive field mapping...`);

      // 1. Get next sequential order number
      const baseOrderNumber = await zohoOrderFieldsService.getNextOrderNumber(orderData.isTestOrder);
      
      // 2. Determine order characteristics
      const fulfillmentType = orderData.fulfillmentType || 
        zohoOrderFieldsService.determineFulfillmentType(
          orderData.orderingAccount || '99901', 
          orderData.requiresDropShip || false
        );
      
      const requiresFFL = orderData.orderItems.some(item => item.fflRequired);
      const consignee = zohoOrderFieldsService.determineConsignee(fulfillmentType, requiresFFL);
      
      // 3. Build comprehensive Zoho field mapping
      const zohoFields = zohoOrderFieldsService.buildOrderFieldMapping({
        orderNumber: orderData.orderNumber,
        baseOrderNumber,
        fulfillmentType,
        orderingAccount: orderData.orderingAccount || '99901',
        consignee,
        requiresFFL,
        isTest: orderData.isTestOrder || false,
        holdType: orderData.holdType,
        appStatus: orderData.engineResponse ? 'Engine Submitted' : 'Submitted'
      });

      // 4. Update fields based on Engine response if available
      if (orderData.engineResponse) {
        const updatedFields = zohoOrderFieldsService.updateOrderStatusFromEngineResponse(
          zohoFields,
          orderData.engineResponse
        );
        Object.assign(zohoFields, updatedFields);
      }

      // 5. Find or create customer contact
      let contactId = orderData.zohoContactId;
      if (!contactId) {
        const existingContact = await this.zohoService.findContactByEmail(orderData.customerEmail);
        
        if (existingContact) {
          contactId = existingContact.id;
        } else {
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
              createdFrom: 'RSR Order Processing'
            })
          });
          contactId = newContact.id;
        }
      }

      // 6. Create Zoho Deal with comprehensive RSR fields
      const dealData = {
        Deal_Name: `TGF Order ${zohoFields.TGF_Order_Number}`,
        Contact_Name: contactId,
        Amount: orderData.totalAmount,
        Stage: this.mapOrderStatusToStage(zohoFields.Order_Status),
        
        // RSR-specific fields
        TGF_Order_Number: zohoFields.TGF_Order_Number,
        Fulfillment_Type: zohoFields.Fulfillment_Type,
        Flow: zohoFields.Flow,
        Order_Status: zohoFields.Order_Status,
        Consignee: zohoFields.Consignee,
        Deal_Fulfillment_Summary: zohoFields.Deal_Fulfillment_Summary,
        Ordering_Account: zohoFields.Ordering_Account,
        Hold_Type: zohoFields.Hold_Type,
        APP_Status: zohoFields.APP_Status,
        Carrier: zohoFields.Carrier,
        Tracking_Number: zohoFields.Tracking_Number,
        Estimated_Ship_Date: zohoFields.Estimated_Ship_Date,
        Submitted: zohoFields.Submitted,
        APP_Confirmed: zohoFields.APP_Confirmed,
        Last_Distributor_Update: zohoFields.Last_Distributor_Update,
        
        // Additional context
        Description: JSON.stringify({
          originalOrderNumber: orderData.orderNumber,
          membershipTier: orderData.membershipTier,
          fflDealer: orderData.fflDealerName,
          itemCount: orderData.orderItems.length,
          engineResponse: orderData.engineResponse ? 'Engine processed' : 'Local order'
        })
      };

      const dealResult = await this.zohoService.createOrderDeal({
        contactId: contactId!,
        orderNumber: orderData.orderNumber,
        totalAmount: orderData.totalAmount,
        orderItems: orderData.orderItems,
        membershipTier: orderData.membershipTier,
        fflRequired: requiresFFL,
        fflDealerName: orderData.fflDealerName,
        orderStatus: zohoFields.Order_Status,
        customFields: dealData
      });

      if (dealResult.success) {
        console.log(`✅ Created RSR deal ${dealResult.dealId} with TGF order number ${zohoFields.TGF_Order_Number}`);
        return {
          success: true,
          dealId: dealResult.dealId,
          tgfOrderNumber: zohoFields.TGF_Order_Number,
          zohoFields
        };
      } else {
        console.error(`❌ Failed to create RSR deal: ${dealResult.error}`);
        return {
          success: false,
          error: dealResult.error
        };
      }

    } catch (error: any) {
      console.error('RSR order-to-Zoho integration error:', error);
      return {
        success: false,
        error: `RSR integration error: ${error.message}`
      };
    }
  }

  /**
   * Update RSR order fields in existing Zoho deal
   */
  async updateRSROrderFields(
    dealId: string,
    updates: Partial<ZohoOrderFieldMapping>
  ): Promise<boolean> {
    try {
      const updateData: any = {};
      
      // Map updates to Zoho field names
      if (updates.Order_Status) updateData.Order_Status = updates.Order_Status;
      if (updates.APP_Status) updateData.APP_Status = updates.APP_Status;
      if (updates.Carrier) updateData.Carrier = updates.Carrier;
      if (updates.Tracking_Number) updateData.Tracking_Number = updates.Tracking_Number;
      if (updates.Estimated_Ship_Date) updateData.Estimated_Ship_Date = updates.Estimated_Ship_Date;
      if (updates.APP_Confirmed) updateData.APP_Confirmed = updates.APP_Confirmed;
      if (updates.Last_Distributor_Update) updateData.Last_Distributor_Update = updates.Last_Distributor_Update;
      
      // Update stage based on order status
      if (updates.Order_Status) {
        updateData.Stage = this.mapOrderStatusToStage(updates.Order_Status);
      }

      const result = await this.zohoService.updateDealStage(dealId, updateData.Stage || 'Qualification');
      console.log(`📝 Updated RSR fields for deal ${dealId}: ${result ? 'success' : 'failed'}`);
      return result;

    } catch (error: any) {
      console.error('RSR field update error:', error);
      return false;
    }
  }

  /**
   * Map order status to Zoho deal stage
   */
  private mapOrderStatusToStage(orderStatus: string): string {
    const stageMap: Record<string, string> = {
      'Submitted': 'Proposal/Price Quote',
      'Hold': 'Qualification',
      'Confirmed': 'Needs Analysis',
      'Processing': 'Value Proposition',
      'Partially Shipped': 'Id. Decision Makers',
      'Shipped': 'Perception Analysis',
      'Delivered': 'Closed Won',
      'Rejected': 'Closed Lost',
      'Cancelled': 'Closed Lost'
    };
    
    return stageMap[orderStatus] || 'Qualification';
  }

  /**
   * Create or update a Zoho Deal for a TheGunFirm order with comprehensive RSR field mapping
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
        const updated = await this.zohoService.updateDealStage(existingDeal.id, this.mapOrderStatusToStage(orderData.orderStatus));
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