/**
 * Zoho Order Fields Service
 * Maps TGF order data to Zoho CRM Deal fields for comprehensive order tracking
 */

export interface ZohoOrderFieldMapping {
  // Core Order Information
  TGF_Order_Number: string;           // Sequential 7-digit + receiver + multiple suffix
  Fulfillment_Type: 'In-House' | 'Drop-Ship';
  Flow: 'TGF' | 'Return';
  Order_Status: 'Submitted' | 'Hold' | 'Confirmed' | 'Processing' | 'Partially Shipped' | 'Shipped' | 'Delivered' | 'Rejected' | 'Cancelled';
  Consignee: 'Customer' | 'FFL' | 'RSR' | 'TGF';
  Deal_Fulfillment_Summary: 'Shipped to Customer' | 'Delivered to TGF' | 'Shipped to TGF (Return)' | 'Item Received In-House (Return)';
  
  // Account and Processing
  Ordering_Account: '99901' | '99902' | '63824' | '60742';
  Return_Status?: 'Shipped to TGF' | 'Shipped to Dist' | 'Item Received IH' | 'Reshipped' | 'Refunded' | 'Closed';
  Hold_Type?: 'FFL not on file' | 'Gun Count Rule';
  APP_Status: string;                 // System response, error codes or success
  
  // Shipping Information
  Carrier?: string;
  Tracking_Number?: string;
  Estimated_Ship_Date?: string;       // ISO date string
  
  // Timestamps
  Submitted: string;                  // ISO timestamp when first submitted
  APP_Confirmed?: string;             // Last timestamp from APP
  Last_Distributor_Update?: string;   // Last update from distributor (RSR)
}

export class ZohoOrderFieldsService {
  
  /**
   * Generate TGF Order Number with proper formatting
   */
  generateTGFOrderNumber(
    baseNumber: number,
    receiver: 'I' | 'C' | 'F',  // I=In-House, C=Customer, F=FFL
    isMultiple: boolean = false,
    multipleIndex: number = 0,
    isTest: boolean = false
  ): string {
    // Base number formatting
    const base = isTest ? `test${baseNumber.toString().padStart(3, '0')}` : baseNumber.toString().padStart(7, '0');
    
    // Multiple order suffix
    const multipleSuffix = isMultiple ? String.fromCharCode(65 + multipleIndex) : '0'; // A, B, C, etc. or 0
    
    return `${base}${receiver}${multipleSuffix}`;
  }

  /**
   * Determine fulfillment type based on order characteristics
   */
  determineFulfillmentType(orderingAccount: string, requiresDropShip: boolean): 'In-House' | 'Drop-Ship' {
    // Drop-ship accounts: 99902 (test), 63824 (prod)
    if (orderingAccount === '99902' || orderingAccount === '63824') {
      return 'Drop-Ship';
    }
    // In-house accounts: 99901 (test), 60742 (prod)
    return 'In-House';
  }

  /**
   * Determine consignee based on FFL requirement and fulfillment type
   */
  determineConsignee(
    fulfillmentType: 'In-House' | 'Drop-Ship',
    requiresFFL: boolean,
    isReturn: boolean = false
  ): 'Customer' | 'FFL' | 'RSR' | 'TGF' {
    if (isReturn) {
      return 'RSR'; // Returns go to RSR
    }
    
    if (fulfillmentType === 'In-House') {
      return 'TGF'; // In-house orders ship to TGF first
    }
    
    // Drop-ship orders
    return requiresFFL ? 'FFL' : 'Customer';
  }

  /**
   * Determine receiver code for order number
   */
  determineReceiverCode(consignee: 'Customer' | 'FFL' | 'RSR' | 'TGF'): 'I' | 'C' | 'F' {
    switch (consignee) {
      case 'TGF':
        return 'I'; // In-House
      case 'Customer':
        return 'C'; // Customer
      case 'FFL':
      case 'RSR':
        return 'F'; // FFL
      default:
        return 'C';
    }
  }

  /**
   * Build complete Zoho order field mapping
   */
  buildOrderFieldMapping({
    orderNumber,
    baseOrderNumber,
    fulfillmentType,
    orderingAccount,
    consignee,
    requiresFFL,
    isMultipleOrder = false,
    multipleIndex = 0,
    isTest = false,
    holdType,
    carrier,
    trackingNumber,
    estimatedShipDate,
    appStatus = 'Submitted'
  }: {
    orderNumber: string;
    baseOrderNumber: number;
    fulfillmentType: 'In-House' | 'Drop-Ship';
    orderingAccount: '99901' | '99902' | '63824' | '60742';
    consignee: 'Customer' | 'FFL' | 'RSR' | 'TGF';
    requiresFFL: boolean;
    isMultipleOrder?: boolean;
    multipleIndex?: number;
    isTest?: boolean;
    holdType?: 'FFL not on file' | 'Gun Count Rule';
    carrier?: string;
    trackingNumber?: string;
    estimatedShipDate?: Date;
    appStatus?: string;
  }): ZohoOrderFieldMapping {
    
    const receiverCode = this.determineReceiverCode(consignee);
    const tgfOrderNumber = this.generateTGFOrderNumber(
      baseOrderNumber,
      receiverCode,
      isMultipleOrder,
      multipleIndex,
      isTest
    );

    // Format datetime for Zoho: yyyy-MM-ddTHH:mm:ss (not ISO string)
    const now = new Date();
    const zohoDateTime = now.toISOString().slice(0, 19); // Remove the 'Z' and milliseconds
    
    return {
      TGF_Order_Number: tgfOrderNumber,
      Fulfillment_Type: fulfillmentType,
      Flow: 'TGF',
      Order_Status: holdType ? 'Hold' : 'Submitted',
      Consignee: consignee,
      Deal_Fulfillment_Summary: consignee === 'Customer' ? 'Shipped to Customer' : 'Delivered to TGF',
      Ordering_Account: orderingAccount,
      Hold_Type: holdType,
      APP_Status: appStatus,
      Carrier: carrier,
      Tracking_Number: trackingNumber,
      Estimated_Ship_Date: estimatedShipDate ? estimatedShipDate.toISOString().slice(0, 19) : undefined,
      Submitted: zohoDateTime,
      APP_Confirmed: undefined,
      Last_Distributor_Update: undefined
    };
  }

  /**
   * Update order status based on RSR Engine response
   */
  updateOrderStatusFromEngineResponse(
    fields: ZohoOrderFieldMapping,
    engineResponse: any
  ): ZohoOrderFieldMapping {
    // Format datetime for Zoho: yyyy-MM-ddTHH:mm:ss (not ISO string)
    const zohoDateTime = new Date().toISOString().slice(0, 19);
    
    if (engineResponse.result?.StatusCode === '00') {
      // Order confirmed by RSR
      return {
        ...fields,
        Order_Status: 'Confirmed',
        APP_Status: `RSR Confirmed: ${engineResponse.result.StatusMessage || 'Success'}`,
        APP_Confirmed: zohoDateTime,
        Last_Distributor_Update: zohoDateTime
      };
    } else {
      // Order rejected
      return {
        ...fields,
        Order_Status: 'Rejected',
        APP_Status: `RSR Rejected: ${engineResponse.result?.StatusMessage || 'Unknown error'}`,
        APP_Confirmed: zohoDateTime
      };
    }
  }

  /**
   * Get next sequential order number (implement based on your database)
   */
  async getNextOrderNumber(isTest: boolean = false): Promise<number> {
    // This should query your database for the highest order number
    // For now, return a placeholder - implement based on your order sequence logic
    if (isTest) {
      return 1; // test001, test002, etc.
    }
    return 1; // 0000001, 0000002, etc.
  }
}

export const zohoOrderFieldsService = new ZohoOrderFieldsService();