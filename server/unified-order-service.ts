/**
 * Unified Order Service
 * 
 * Treats Zoho as system of record for order data
 * Provides Amazon-style unified order experience across multiple shipments/deals
 */

import axios from 'axios';

export interface UnifiedOrderItem {
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fulfillmentType: 'In-House' | 'Drop-Ship to FFL' | 'Drop-Ship to Customer';
  dealId: string;
  shipmentGroup: string;
  isFirearm: boolean;
  manufacturerPartNumber?: string;
  rsrStockNumber?: string;
  upcCode?: string;
}

export interface UnifiedOrderSummary {
  masterOrderNumber: string;
  customerEmail: string;
  orderDate: string;
  totalAmount: number;
  overallStatus: string;
  paymentStatus: string;
  
  // Amazon-style shipment groups
  shipmentGroups: {
    [key: string]: {
      fulfillmentType: 'In-House' | 'Drop-Ship to FFL' | 'Drop-Ship to Customer';
      status: string;
      estimatedDelivery?: string;
      trackingNumber?: string;
      dealId: string;
      items: UnifiedOrderItem[];
      subtotal: number;
    };
  };
  
  // Summary totals
  summary: {
    totalItems: number;
    totalDeals: number;
    inHouseItems: number;
    dropShipToFflItems: number;
    dropShipToCustomerItems: number;
  };
  
  // Order-level metadata
  metadata: {
    hasFirearms: boolean;
    requiresFfl: boolean;
    holdStatus?: string;
    complianceNotes?: string;
  };
}

export class UnifiedOrderService {
  
  /**
   * Get unified order summary from Zoho (system of record)
   * Groups related deals by master order number into Amazon-style view
   */
  async getUnifiedOrderSummary(masterOrderNumber: string): Promise<UnifiedOrderSummary | null> {
    try {
      console.log(`🔍 Fetching unified order summary for ${masterOrderNumber} from Zoho`);
      
      // Search for all deals with this master order number
      const relatedDeals = await this.findRelatedDeals(masterOrderNumber);
      
      if (!relatedDeals || relatedDeals.length === 0) {
        console.log(`❌ No deals found for master order ${masterOrderNumber}`);
        return null;
      }
      
      console.log(`✅ Found ${relatedDeals.length} related deals for ${masterOrderNumber}`);
      console.log(`📊 Sample deal data:`, JSON.stringify(relatedDeals[0], null, 2));
      
      // Build unified summary from Zoho data
      return this.buildUnifiedSummary(masterOrderNumber, relatedDeals);
      
    } catch (error) {
      console.error(`❌ Error fetching unified order summary:`, error);
      throw error;
    }
  }
  
  /**
   * Find all deals related to a master order number in Zoho
   */
  private async findRelatedDeals(masterOrderNumber: string): Promise<any[]> {
    try {
      // Use internal Zoho API endpoint that handles token management
      const response = await axios.get(
        `http://localhost:5000/api/zoho/deals/search?criteria=${encodeURIComponent(`(TGF_Order_Number:equals:${masterOrderNumber})`)}`
      );
      
      return response.data.data || [];
      
    } catch (error) {
      console.error(`❌ Error searching for related deals:`, error);
      throw error;
    }
  }
  
  /**
   * Build unified order summary from Zoho deal data
   */
  private buildUnifiedSummary(masterOrderNumber: string, deals: any[]): UnifiedOrderSummary {
    const shipmentGroups: { [key: string]: any } = {};
    let totalAmount = 0;
    let totalItems = 0;
    let hasFirearms = false;
    let requiresFfl = false;
    
    // Process each deal as a shipment group
    for (const deal of deals) {
      const fulfillmentType = deal.Fulfillment_Type || 'In-House';
      const dealId = deal.id;
      const groupKey = `${fulfillmentType}-${dealId}`;
      
      // Extract line items from deal
      const lineItems = this.extractLineItemsFromDeal(deal);
      
      // Calculate group subtotal
      const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
      totalAmount += subtotal;
      totalItems += lineItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Check for firearms
      const groupHasFirearms = lineItems.some(item => item.isFirearm);
      if (groupHasFirearms) {
        hasFirearms = true;
        if (fulfillmentType === 'Drop-Ship to FFL') {
          requiresFfl = true;
        }
      }
      
      shipmentGroups[groupKey] = {
        fulfillmentType,
        status: deal.Stage || 'Processing',
        estimatedDelivery: deal.Estimated_Delivery_Date,
        trackingNumber: deal.Tracking_Number,
        dealId,
        items: lineItems,
        subtotal
      };
    }
    
    // Build summary counts
    const summary = {
      totalItems,
      totalDeals: deals.length,
      inHouseItems: Object.values(shipmentGroups).reduce((sum: number, group: any) => 
        sum + (group.fulfillmentType === 'In-House' ? group.items.length : 0), 0),
      dropShipToFflItems: Object.values(shipmentGroups).reduce((sum: number, group: any) => 
        sum + (group.fulfillmentType === 'Drop-Ship to FFL' ? group.items.length : 0), 0),
      dropShipToCustomerItems: Object.values(shipmentGroups).reduce((sum: number, group: any) => 
        sum + (group.fulfillmentType === 'Drop-Ship to Customer' ? group.items.length : 0), 0)
    };
    
    // Get primary deal for order-level data
    const primaryDeal = deals[0];
    
    return {
      masterOrderNumber,
      customerEmail: primaryDeal.Email || '',
      orderDate: primaryDeal.Created_Time || '',
      totalAmount,
      overallStatus: this.determineOverallStatus(deals),
      paymentStatus: primaryDeal.Payment_Status || 'Unknown',
      shipmentGroups,
      summary,
      metadata: {
        hasFirearms,
        requiresFfl,
        holdStatus: primaryDeal.Hold_Type,
        complianceNotes: primaryDeal.Compliance_Notes
      }
    };
  }
  
  /**
   * Extract line items from Zoho deal data
   */
  private extractLineItemsFromDeal(deal: any): UnifiedOrderItem[] {
    const items: UnifiedOrderItem[] = [];
    
    // Handle both product details and line items
    if (deal.Product_Details) {
      // Parse product details from deal
      const products = Array.isArray(deal.Product_Details) ? deal.Product_Details : [deal.Product_Details];
      
      for (const product of products) {
        items.push({
          productName: product.product?.Product_Name || product.Product_Name || 'Unknown Product',
          productCode: product.Product_Code || product.product?.Product_Code || '',
          quantity: parseInt(product.quantity) || 1,
          unitPrice: parseFloat(product.list_price) || 0,
          totalPrice: parseFloat(product.total) || 0,
          fulfillmentType: deal.Fulfillment_Type || 'In-House',
          dealId: deal.id,
          shipmentGroup: `${deal.Fulfillment_Type}-${deal.id}`,
          isFirearm: product.Is_Firearm === 'true' || product.Is_Firearm === true,
          manufacturerPartNumber: product.Manufacturer_Part_Number,
          rsrStockNumber: product.RSR_Stock_Number,
          upcCode: product.UPC_Code
        });
      }
    }
    
    // Fallback to deal-level product data if no line items
    if (items.length === 0 && deal.Deal_Name) {
      items.push({
        productName: deal.Deal_Name,
        productCode: deal.Product_Code || '',
        quantity: 1,
        unitPrice: parseFloat(deal.Amount) || 0,
        totalPrice: parseFloat(deal.Amount) || 0,
        fulfillmentType: deal.Fulfillment_Type || 'In-House',
        dealId: deal.id,
        shipmentGroup: `${deal.Fulfillment_Type}-${deal.id}`,
        isFirearm: deal.Contains_Firearms === 'true' || deal.Contains_Firearms === true
      });
    }
    
    return items;
  }
  
  /**
   * Determine overall order status from all related deals
   */
  private determineOverallStatus(deals: any[]): string {
    const statuses = deals.map(deal => deal.Stage || 'Processing');
    
    // Order of priority for status determination
    if (statuses.includes('Cancelled')) return 'Cancelled';
    if (statuses.includes('On Hold')) return 'On Hold';
    if (statuses.includes('Processing')) return 'Processing';
    if (statuses.includes('Shipped')) {
      // If all are shipped, order is shipped
      if (statuses.every(status => status === 'Shipped')) return 'Shipped';
      return 'Partially Shipped';
    }
    if (statuses.includes('Delivered')) {
      // If all are delivered, order is delivered
      if (statuses.every(status => status === 'Delivered')) return 'Delivered';
      return 'Partially Delivered';
    }
    
    return 'Processing';
  }
  
  /**
   * Get customer order history with unified summaries
   */
  async getCustomerOrderHistory(email: string): Promise<UnifiedOrderSummary[]> {
    try {
      console.log(`🔍 Fetching order history for ${email}`);
      
      // Use internal Zoho API endpoint that handles token management
      const response = await axios.get(
        `http://localhost:5000/api/zoho/deals/search?criteria=${encodeURIComponent(`(Email:equals:${email})`)}`
      );
      
      const deals = response.data.data || [];
      
      // Group deals by master order number
      const orderGroups: { [key: string]: any[] } = {};
      
      for (const deal of deals) {
        const masterOrderNumber = deal.TGF_Order_Number;
        if (masterOrderNumber) {
          if (!orderGroups[masterOrderNumber]) {
            orderGroups[masterOrderNumber] = [];
          }
          orderGroups[masterOrderNumber].push(deal);
        }
      }
      
      // Build unified summaries for each order
      const unifiedOrders: UnifiedOrderSummary[] = [];
      
      for (const [masterOrderNumber, orderDeals] of Object.entries(orderGroups)) {
        const unifiedSummary = this.buildUnifiedSummary(masterOrderNumber, orderDeals);
        unifiedOrders.push(unifiedSummary);
      }
      
      // Sort by order date (newest first)
      unifiedOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      
      return unifiedOrders;
      
    } catch (error) {
      console.error(`❌ Error fetching customer order history:`, error);
      throw error;
    }
  }
}

export const unifiedOrderService = new UnifiedOrderService();