/**
 * Zoho Order Fields Service
 * Maps TGF order data to Zoho CRM Deal fields for comprehensive order tracking
 */

export interface ZohoOrderFieldMapping {
  // Core Order Information
  TGF_Order: string;           // Actual TGF Order Number from APP/RSR Engine response
  Fulfillment_Type: 'In-House' | 'Drop-Ship';
  Flow: 'Outbound' | 'Return';
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

export interface ZohoProductFieldMapping {
  // Core Product Identification
  Deal_Name: string;                  // Product name or "Mixed Order" for multi-product
  Product_Code?: string;              // Internal SKU identifier
  Vendor_Part_Number?: string;        // RSR distributor stock number
  
  // Pricing and Quantity
  Quantity?: number;                  // Number of items ordered
  Unit_Price?: number;                // Price per individual item
  Amount: number;                     // Total deal value (standard Zoho field)
  
  // Product Classification
  Product_Category?: string;          // Handguns, Rifles, Shotguns, Accessories, etc.
  Manufacturer?: string;              // Brand/manufacturer name
  Description?: string;               // Product description (standard Zoho field)
  
  // Compliance and Fulfillment Attributes
  FFL_Required?: boolean;             // Whether item requires FFL transfer
  Drop_Ship_Eligible?: boolean;       // Can be drop-shipped from distributor
  In_House_Only?: boolean;            // Requires TGF in-house processing
  
  // Extended Product Information
  Product_Specifications?: string;    // Technical specs, dimensions, etc.
  Product_Images?: string;            // JSON array of image URLs
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
      Flow: 'Outbound',
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

  /**
   * Determine shipping outcomes from order items
   */
  analyzeShippingOutcomes(orderItems: Array<{
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    fflRequired?: boolean;
    dropShipEligible?: boolean;
    inHouseOnly?: boolean;
    rsrStockNumber?: string;
  }>): Array<{
    outcome: 'DS_TO_CUSTOMER' | 'DS_TO_FFL' | 'IN_HOUSE';
    items: typeof orderItems;
    fulfillmentType: 'Drop-Ship' | 'In-House';
    orderingAccount: '99901' | '99902' | '63824' | '60742';
    consignee: 'Customer' | 'FFL' | 'TGF';
    receiverCode: 'I' | 'C' | 'F';
  }> {
    const outcomes: Array<{
      outcome: 'DS_TO_CUSTOMER' | 'DS_TO_FFL' | 'IN_HOUSE';
      items: typeof orderItems;
      fulfillmentType: 'Drop-Ship' | 'In-House';
      orderingAccount: '99901' | '99902' | '63824' | '60742';
      consignee: 'Customer' | 'FFL' | 'TGF';
      receiverCode: 'I' | 'C' | 'F';
    }> = [];

    // Group items by shipping outcome
    const dsToCustomerItems: typeof orderItems = [];
    const dsToFflItems: typeof orderItems = [];
    const inHouseItems: typeof orderItems = [];

    orderItems.forEach(item => {
      const requiresFFL = item.fflRequired || false;
      const canDropShip = item.dropShipEligible || false;
      const mustBeInHouse = item.inHouseOnly || false;

      if (mustBeInHouse) {
        // Items that must ship to TGF first (in-house fulfillment)
        inHouseItems.push(item);
      } else if (canDropShip && requiresFFL) {
        // Firearms that can drop-ship to FFL
        dsToFflItems.push(item);
      } else if (canDropShip && !requiresFFL) {
        // Non-firearms that can drop-ship to customer
        dsToCustomerItems.push(item);
      } else {
        // Default to in-house for items without specific shipping requirements
        inHouseItems.push(item);
      }
    });

    // Determine if we're in test or production mode
    const isProduction = process.env.NODE_ENV === 'production';

    // Create outcomes for each group that has items
    if (dsToCustomerItems.length > 0) {
      outcomes.push({
        outcome: 'DS_TO_CUSTOMER',
        items: dsToCustomerItems,
        fulfillmentType: 'Drop-Ship',
        orderingAccount: isProduction ? '63824' : '99902',
        consignee: 'Customer',
        receiverCode: 'C'
      });
    }

    if (dsToFflItems.length > 0) {
      outcomes.push({
        outcome: 'DS_TO_FFL',
        items: dsToFflItems,
        fulfillmentType: 'Drop-Ship',
        orderingAccount: isProduction ? '63824' : '99902',
        consignee: 'FFL',
        receiverCode: 'F'
      });
    }

    if (inHouseItems.length > 0) {
      outcomes.push({
        outcome: 'IN_HOUSE',
        items: inHouseItems,
        fulfillmentType: 'In-House',
        orderingAccount: isProduction ? '60742' : '99901',
        consignee: 'TGF',
        receiverCode: 'I'
      });
    }

    return outcomes;
  }

  /**
   * Generate TGF order numbers for split orders
   */
  generateSplitOrderNumbers(
    baseOrderNumber: number,
    outcomes: Array<{ receiverCode: 'I' | 'C' | 'F' }>,
    isTest: boolean = false
  ): string[] {
    if (outcomes.length === 1) {
      // Single shipping outcome - ends in '0'
      const base = isTest ? `test${baseOrderNumber.toString().padStart(6, '0')}` : baseOrderNumber.toString().padStart(7, '0');
      return [`${base}${outcomes[0].receiverCode}0`];
    } else {
      // Multiple shipping outcomes - ends in A, B, C, etc.
      return outcomes.map((outcome, index) => {
        const base = isTest ? `test${baseOrderNumber.toString().padStart(6, '0')}` : baseOrderNumber.toString().padStart(7, '0');
        const suffix = String.fromCharCode(65 + index); // A, B, C, etc.
        return `${base}${outcome.receiverCode}${suffix}`;
      });
    }
  }

  /**
   * Map product data to Zoho Deal product fields
   */
  mapProductToZohoDeal(productData: any, totalOrderValue?: number): ZohoProductFieldMapping {
    const productFields: ZohoProductFieldMapping = {
      Deal_Name: productData.productName || productData.name || 'Product Order',
      Amount: totalOrderValue || productData.totalPrice || productData.unitPrice || 0
    };

    // Core product identification
    if (productData.sku) {
      productFields.Product_Code = productData.sku;
    }
    if (productData.rsrStockNumber) {
      productFields.Vendor_Part_Number = productData.rsrStockNumber;
    }

    // Pricing and quantity
    if (productData.quantity !== undefined) {
      productFields.Quantity = productData.quantity;
    }
    if (productData.unitPrice !== undefined) {
      productFields.Unit_Price = productData.unitPrice;
    }

    // Product classification
    if (productData.category) {
      productFields.Product_Category = productData.category;
    }
    if (productData.manufacturer) {
      productFields.Manufacturer = productData.manufacturer;
    }
    if (productData.description) {
      productFields.Description = productData.description;
    }

    // Compliance and fulfillment attributes
    if (productData.fflRequired !== undefined) {
      productFields.FFL_Required = productData.fflRequired;
    }
    if (productData.dropShipEligible !== undefined) {
      productFields.Drop_Ship_Eligible = productData.dropShipEligible;
    }
    if (productData.inHouseOnly !== undefined) {
      productFields.In_House_Only = productData.inHouseOnly;
    }

    // Extended product information
    if (productData.specifications) {
      productFields.Product_Specifications = productData.specifications;
    }
    if (productData.images && Array.isArray(productData.images)) {
      productFields.Product_Images = JSON.stringify(productData.images);
    }

    return productFields;
  }

  /**
   * Map multiple products to a single "Mixed Order" Deal
   */
  mapMultipleProductsToZohoDeal(products: any[], totalOrderValue: number): ZohoProductFieldMapping {
    const productNames = products.map(p => p.productName || p.name).filter(Boolean);
    const dealName = productNames.length > 2 
      ? `Mixed Order (${products.length} items)` 
      : productNames.join(' + ');

    const productFields: ZohoProductFieldMapping = {
      Deal_Name: dealName,
      Amount: totalOrderValue,
      Quantity: products.reduce((sum, p) => sum + (p.quantity || 1), 0)
    };

    // Aggregate product information
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const manufacturers = [...new Set(products.map(p => p.manufacturer).filter(Boolean))];
    
    if (categories.length > 0) {
      productFields.Product_Category = categories.join(', ');
    }
    if (manufacturers.length > 0) {
      productFields.Manufacturer = manufacturers.join(', ');
    }

    // Check if any products require FFL or special handling
    const requiresFFL = products.some(p => p.fflRequired);
    const canDropShip = products.some(p => p.dropShipEligible);
    const inHouseOnly = products.some(p => p.inHouseOnly);

    productFields.FFL_Required = requiresFFL;
    productFields.Drop_Ship_Eligible = canDropShip;
    productFields.In_House_Only = inHouseOnly;

    // Create detailed description
    const descriptions = products.map(p => 
      `${p.productName || p.name} (${p.quantity || 1}x @ $${p.unitPrice || 0})`
    ).filter(Boolean);
    
    if (descriptions.length > 0) {
      productFields.Description = descriptions.join('\n');
    }

    return productFields;
  }

  /**
   * Validate product field mapping
   */
  validateProductFields(productFields: ZohoProductFieldMapping): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!productFields.Deal_Name) {
      errors.push('Deal_Name is required');
    }
    if (productFields.Amount === undefined || productFields.Amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    // Data type validation
    if (productFields.Quantity !== undefined && (!Number.isInteger(productFields.Quantity) || productFields.Quantity <= 0)) {
      errors.push('Quantity must be a positive integer');
    }
    if (productFields.Unit_Price !== undefined && productFields.Unit_Price < 0) {
      errors.push('Unit_Price cannot be negative');
    }

    // Field length validation (based on typical Zoho limits)
    if (productFields.Deal_Name && productFields.Deal_Name.length > 100) {
      errors.push('Deal_Name exceeds 100 character limit');
    }
    if (productFields.Product_Code && productFields.Product_Code.length > 100) {
      errors.push('Product_Code exceeds 100 character limit');
    }
    if (productFields.Manufacturer && productFields.Manufacturer.length > 100) {
      errors.push('Manufacturer exceeds 100 character limit');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const zohoOrderFieldsService = new ZohoOrderFieldsService();