/**
 * Comprehensive Deal Field Mapper
 * Maps complete order data to all required Zoho Deal module fields
 */

export interface CompleteDealFieldMapping {
  // Core Deal Information
  Deal_Name: string;
  TGF_Order: string;
  Fulfillment_Type: 'In-House' | 'Drop-Ship';
  Flow: 'Outbound' | 'Return';
  Order_Status: 'Submitted' | 'Hold' | 'Confirmed' | 'Processing' | 'Partially Shipped' | 'Shipped' | 'Delivered' | 'Rejected' | 'Cancelled';
  Consignee: 'Customer' | 'FFL' | 'RSR' | 'TGF';
  Ordering_Account: '99901' | '99902' | '63824' | '60742';
  APP_Status: string;
  APP_Response: string;
  
  // Shipping Information
  Carrier?: string;
  Tracking_Number?: string;
  Estimated_Ship_Date?: string;
  Distributor_Order_Number?: string;
  
  // Timestamps
  Submitted: string;
  APP_Confirmed?: string;
  Last_Distributor_Update?: string;
  
  // Standard Zoho Deal Management Fields
  Deal_Owner?: string;
  Account_Name?: string;
  Contact_Name?: string;
  Type?: string;
  Next_Step?: string;
  Lead_Source?: string;
  
  // Sales Pipeline Fields
  Closing_Date?: string;
  Pipeline?: string;
  Stage?: string;
  Probability?: number;
  Expected_Revenue?: number;
  Campaign_Source?: string;
  
  // Extended Order Management Fields
  Conversion_Channel?: string;
  Confirmed?: string;
  Hold_Type?: string;
  Hold_Started_At?: string;
  Hold_Cleared_At?: string;
  Return_Status?: string;
  Consignee_Type?: string;
  
  // System Fields
  Modified_By?: string;
  Created_By?: string;
  
  // Financial Fields
  Amount: number;
  Description?: string;
  
  // Product Subform (array of products)
  Product_Details?: Array<{
    Product_Lookup?: { id: string };
    'Product Code (SKU)': string;
    'Distributor Part Number'?: string;
    Distributor: string;
    Manufacturer?: string;
    'Product Category'?: string;
    'Unit Price': number;
    Quantity: number;
    'FFL Required': boolean;
    'Drop Ship Eligible': boolean;
    'In House Only': boolean;
  }>;
}

export interface OrderDataForMapping {
  orderId: number;
  tgfOrderNumber: string;
  orderItems: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: number;
    fflRequired: boolean;
    manufacturer?: string;
    category?: string;
    rsrStockNumber?: string;
  }>;
  customerInfo: {
    email: string;
    firstName: string;
    lastName: string;
    membershipTier: string;
  };
  fflInfo?: {
    fflId: number;
    businessName: string;
    licenseNumber: string;
    city?: string;
    state?: string;
  };
  shippingOutcome: 'direct_to_customer' | 'drop_ship_ffl' | 'in_house_ffl';
  totalAmount: number;
  appResponseData?: any;
}

export class ComprehensiveDealFieldMapper {
  
  /**
   * Map complete order data to Zoho Deal fields
   */
  static mapOrderToDealFields(orderData: OrderDataForMapping): CompleteDealFieldMapping {
    const timestamp = new Date().toISOString();
    
    return {
      // Core Deal Information
      Deal_Name: this.generateDealName(orderData.tgfOrderNumber, orderData.shippingOutcome),
      TGF_Order: orderData.tgfOrderNumber,
      Fulfillment_Type: this.mapFulfillmentType(orderData.shippingOutcome),
      Flow: 'Outbound',
      Order_Status: 'Submitted',
      Consignee: this.mapConsignee(orderData.shippingOutcome, orderData.fflInfo),
      Ordering_Account: this.determineOrderingAccount(orderData.customerInfo.membershipTier),
      APP_Status: 'Order processed successfully',
      APP_Response: this.generateAppResponse(orderData),
      
      // Shipping Information
      Carrier: undefined, // Will be set when order ships
      Tracking_Number: undefined, // Will be set when order ships
      Estimated_Ship_Date: this.calculateEstimatedShipDate(orderData.shippingOutcome),
      Distributor_Order_Number: `RSR-${orderData.tgfOrderNumber}`,
      
      // Timestamps
      Submitted: timestamp,
      APP_Confirmed: timestamp,
      Last_Distributor_Update: undefined, // Will be set by RSR updates
      
      // Standard Zoho Deal Management Fields  
      Deal_Owner: 'Webservices App',
      Account_Name: 'Direct Customer',
      Contact_Name: `${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`,
      Type: 'E-commerce Order', 
      Next_Step: 'Process Order',
      Lead_Source: 'Website',
      
      // Sales Pipeline Fields
      Closing_Date: timestamp.split('T')[0], // Today's date
      Pipeline: 'E-commerce Sales',
      Stage: 'Submitted',
      Probability: 100, // 100% since order is submitted  
      Expected_Revenue: orderData.totalAmount,
      Campaign_Source: 'TheGunFirm.com',
      
      // Extended Order Management Fields
      Conversion_Channel: 'Website',
      Confirmed: 'Yes',
      Hold_Type: undefined, // Will be set if order goes on hold
      Hold_Started_At: undefined, // Will be set if order goes on hold
      Hold_Cleared_At: undefined, // Will be set when hold is cleared
      Return_Status: undefined, // Will be set for returns
      Consignee_Type: this.mapConsignee(orderData.shippingOutcome, orderData.fflInfo),
      
      // System Fields
      Modified_By: 'Webservices App',
      Created_By: 'Webservices App',
      
      // Financial Fields
      Amount: orderData.totalAmount,
      Description: this.generateOrderDescription(orderData),
      
      // Product Subform
      Product_Details: this.mapProductSubform(orderData.orderItems)
    };
  }
  
  /**
   * Generate appropriate deal name based on shipping outcome
   */
  private static generateDealName(tgfOrderNumber: string, shippingOutcome: string): string {
    const outcomeMap = {
      'direct_to_customer': 'Direct Shipment',
      'drop_ship_ffl': 'FFL Shipment', 
      'in_house_ffl': 'In-House Processing'
    };
    
    return `TGF Order ${tgfOrderNumber} - ${outcomeMap[shippingOutcome as keyof typeof outcomeMap] || 'Standard'}`;
  }
  
  /**
   * Map shipping outcome to fulfillment type
   */
  private static mapFulfillmentType(shippingOutcome: string): 'In-House' | 'Drop-Ship' {
    return shippingOutcome === 'in_house_ffl' ? 'In-House' : 'Drop-Ship';
  }
  
  /**
   * Map shipping outcome to consignee
   */
  private static mapConsignee(shippingOutcome: string, fflInfo?: any): 'Customer' | 'FFL' | 'RSR' | 'TGF' {
    switch (shippingOutcome) {
      case 'direct_to_customer': return 'Customer';
      case 'drop_ship_ffl': return 'FFL';
      case 'in_house_ffl': return 'TGF';
      default: return 'Customer';
    }
  }
  
  /**
   * Determine ordering account based on membership tier
   */
  private static determineOrderingAccount(membershipTier: string): '99901' | '99902' | '63824' | '60742' {
    // Map membership tiers to ordering accounts
    const tierAccountMap = {
      'Bronze': '63824',
      'Gold Monthly': '99901',
      'Gold Annually': '99901',
      'Platinum Monthly': '99902',
      'Platinum Founder': '99902',
      'Platinum Annual': '99902'
    };
    
    return (tierAccountMap as any)[membershipTier] || '63824';
  }
  
  /**
   * Generate comprehensive APP Response data
   */
  private static generateAppResponse(orderData: OrderDataForMapping): string {
    const response = {
      orderId: orderData.orderId,
      tgfOrderNumber: orderData.tgfOrderNumber,
      status: 'SUCCESS',
      message: 'Order processed successfully with enhanced activity logging',
      itemCount: orderData.orderItems.length,
      totalAmount: orderData.totalAmount,
      shippingOutcome: orderData.shippingOutcome,
      consignee: this.mapConsignee(orderData.shippingOutcome, orderData.fflInfo),
      fulfillmentType: this.mapFulfillmentType(orderData.shippingOutcome),
      timestamp: new Date().toISOString(),
      appResponseData: orderData.appResponseData
    };
    
    return JSON.stringify(response, null, 2);
  }
  
  /**
   * Generate order description
   */
  private static generateOrderDescription(orderData: OrderDataForMapping): string {
    const itemsList = orderData.orderItems.map(item => 
      `${item.quantity}x ${item.name} (${item.sku})`
    ).join(', ');
    
    return `TGF Order ${orderData.tgfOrderNumber}: ${itemsList}. Customer: ${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}. Shipping: ${orderData.shippingOutcome}.`;
  }
  
  /**
   * Calculate estimated ship date based on shipping outcome
   */
  private static calculateEstimatedShipDate(shippingOutcome: string): string {
    const today = new Date();
    let daysToAdd = 1; // Default 1 business day
    
    switch (shippingOutcome) {
      case 'direct_to_customer': daysToAdd = 1; break; // Drop-ship fast
      case 'drop_ship_ffl': daysToAdd = 2; break; // FFL coordination
      case 'in_house_ffl': daysToAdd = 3; break; // In-house processing
    }
    
    const shipDate = new Date(today);
    shipDate.setDate(today.getDate() + daysToAdd);
    
    return shipDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  
  /**
   * Map product items to subform structure
   */
  private static mapProductSubform(orderItems: any[]): Array<any> {
    return orderItems.map(item => ({
      Product_Lookup: { id: `zoho_product_${item.sku}_${Date.now()}` }, // Generated Zoho Product ID
      'Product Code (SKU)': item.sku,
      'Distributor Part Number': item.rsrStockNumber || item.sku,
      Distributor: 'RSR',
      Manufacturer: item.manufacturer || 'Unknown',
      'Product Category': this.mapProductCategory(item.category, item.fflRequired),
      'Unit Price': item.price,
      Quantity: item.quantity,
      'FFL Required': item.fflRequired,
      'Drop Ship Eligible': true, // Most RSR products are drop-ship eligible
      'In House Only': false // Default to false unless specifically marked
    }));
  }
  
  /**
   * Map product category to standard categories
   */
  private static mapProductCategory(category?: string, fflRequired?: boolean): string {
    if (!category) {
      return fflRequired ? 'Handguns' : 'Accessories';
    }
    
    const categoryMap = {
      'Handguns': 'Handguns',
      'Rifles': 'Rifles', 
      'Shotguns': 'Shotguns',
      'Ammunition': 'Ammunition',
      'Magazines': 'Magazines',
      'Accessories': 'Accessories',
      'Optics': 'Optics',
      'Parts': 'Parts & Components',
      'Services': 'Services',
      'Holsters': 'Holsters',
      'Safes': 'Safes & Storage'
    };
    
    return (categoryMap as any)[category] || 'Accessories';
  }
  
  /**
   * Create complete deal data for Zoho API
   */
  static createCompleteDealData(orderData: OrderDataForMapping): any {
    const dealFields = this.mapOrderToDealFields(orderData);
    
    return {
      data: [{
        ...dealFields,
        // Add any additional Zoho-specific formatting here
        Stage: 'Qualification', // Default stage
        Pipeline: 'Standard', // Default pipeline
        Deal_Owner: '1', // Will be set to appropriate owner
        Currency: 'USD',
        Exchange_Rate: 1.0
      }]
    };
  }
}

export default ComprehensiveDealFieldMapper;