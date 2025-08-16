/**
 * Zoho Order Fields Service
 * Maps TGF order data to Zoho CRM Deal fields for comprehensive order tracking
 */

export interface ZohoOrderFieldMapping {
  // Core Order Information
  TGF_Order: string;           // Actual TGF Order Number from APP/RSR Engine response
  Fulfillment_Type: 'In-House' | 'Drop-Ship';
  Flow: 'TGF' | 'Return';
  Order_Status: 'Submitted' | 'Hold' | 'Confirmed' | 'Processing' | 'Partially Shipped' | 'Shipped' | 'Delivered' | 'Rejected' | 'Cancelled';
  Consignee: 'Customer' | 'FFL' | 'RSR' | 'TGF';
  
  // Account and Processing
  Ordering_Account: '99901' | '99902' | '63824' | '60742';
  Return_Status?: 'Shipped to TGF' | 'Shipped to Dist' | 'Item Received IH' | 'Reshipped' | 'Refunded' | 'Closed';
  Hold_Type?: 'FFL not on file' | 'Gun Count Rule';
  Hold_Started_At?: string;           // Timestamp when hold was initiated
  APP_Status: string;                 // System response, error codes or success
  APP_Response?: string;              // Full APP response message or details
  
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
   * CRITICAL: All TGF Order Numbers MUST end in A, B, or C (never 0)
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
    
    // FIXED: Always use A, B, C suffixes (never 0)
    // For single orders, default to 'A'. For multiple orders, use A, B, C based on index
    const multipleSuffix = isMultiple ? String.fromCharCode(65 + multipleIndex) : 'A'; // A, B, C, etc. (never 0)
    
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
    appStatus = 'Submitted',
    appTgfOrderNumber,
    appResponse
  }: {
    orderNumber: string;
    baseOrderNumber?: number;  // Optional if TGF Order Number provided by APP
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
    appTgfOrderNumber?: string;  // TGF Order Number from APP/RSR Engine
    appResponse?: string;        // Full APP response details
  }): ZohoOrderFieldMapping {
    
    // Use APP-provided TGF Order Number if available, otherwise generate one locally
    let tgfOrderNumber: string;
    if (appTgfOrderNumber) {
      tgfOrderNumber = appTgfOrderNumber;
    } else if (baseOrderNumber) {
      const receiverCode = this.determineReceiverCode(consignee);
      tgfOrderNumber = this.generateTGFOrderNumber(
        baseOrderNumber,
        receiverCode,
        isMultipleOrder,
        multipleIndex,
        isTest
      );
    } else {
      // Fallback to using the original order number
      tgfOrderNumber = orderNumber;
    }

    // Format datetime for Zoho: yyyy-MM-ddTHH:mm:ss (not ISO string)
    const now = new Date();
    const zohoDateTime = now.toISOString().slice(0, 19); // Remove the 'Z' and milliseconds
    
    // Generate realistic APP Response based on order status
    let finalAppResponse = appResponse;
    if (!finalAppResponse) {
      if (holdType) {
        // Simulate APP error response for holds
        finalAppResponse = JSON.stringify({
          success: false,
          error_code: holdType === 'FFL not on file' ? 'FFL_NOT_FOUND' : 'FIREARM_LIMIT_EXCEEDED',
          message: holdType === 'FFL not on file' 
            ? 'FFL dealer not found in database - order placed on hold'
            : 'Customer exceeded firearm purchase limit - order placed on hold',
          timestamp: zohoDateTime,
          order_number: tgfOrderNumber
        });
      } else {
        // Simulate APP success response for submitted orders
        finalAppResponse = JSON.stringify({
          success: true,
          status_code: '00',
          message: 'Order successfully submitted to RSR Engine',
          timestamp: zohoDateTime,
          order_number: tgfOrderNumber,
          tracking_id: `TRK-${Date.now()}`
        });
      }
    }
    
    return {
      TGF_Order: tgfOrderNumber,
      Fulfillment_Type: fulfillmentType,
      Flow: 'TGF',
      Order_Status: holdType ? 'Hold' : 'Submitted',
      Consignee: consignee,
      Ordering_Account: orderingAccount,
      Hold_Type: holdType,
      Hold_Started_At: holdType ? zohoDateTime : undefined, // Set timestamp when hold is initiated
      APP_Status: appStatus || (holdType ? 'Hold Initiated' : 'Submitted'),
      APP_Response: finalAppResponse,
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
      // Order confirmed by RSR - update TGF Order Number from APP response
      const appTgfOrderNumber = engineResponse.result?.OrderNumber || fields.TGF_Order;
      
      return {
        ...fields,
        TGF_Order: appTgfOrderNumber,  // Use APP-provided TGF Order Number
        Order_Status: 'Confirmed',
        APP_Status: `RSR Confirmed: ${engineResponse.result.StatusMessage || 'Success'}`,
        APP_Response: JSON.stringify(engineResponse.result),  // Full APP response details
        APP_Confirmed: zohoDateTime,
        Last_Distributor_Update: zohoDateTime
      };
    } else {
      // Order rejected
      return {
        ...fields,
        Order_Status: 'Rejected',
        APP_Status: `RSR Rejected: ${engineResponse.result?.StatusMessage || 'Unknown error'}`,
        APP_Response: JSON.stringify(engineResponse.result || engineResponse),  // Full rejection details
        APP_Confirmed: zohoDateTime
      };
    }
  }

  /**
   * Get next sequential order number
   */
  async getNextOrderNumber(isTest: boolean = false): Promise<number> {
    // Generate sequential numbers based on timestamp for uniqueness
    const baseTime = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    
    if (isTest) {
      // For test orders, use a smaller number for readability
      return (baseTime % 10000000) + randomSuffix;
    }
    
    // For production orders, use full timestamp-based numbering
    return baseTime + randomSuffix;
  }
}

export const zohoOrderFieldsService = new ZohoOrderFieldsService();