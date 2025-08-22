import { db } from '../db';
import { orderActivityLogs, type InsertOrderActivityLog } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

export interface OrderActivityLogEvent {
  orderId: number;
  tgfOrderNumber: string;
  eventType: 'order_numbering' | 'inventory_verification' | 'ffl_verification' | 
            'contact_creation' | 'product_creation' | 'deal_creation' | 
            'payment_processing' | 'order_completion' | 'credit_card_error' | 
            'shipping_outcome_split';
  eventStatus: 'success' | 'failed' | 'warning' | 'pending';
  description: string;
  details: any;
}

export interface ContactCreationResult {
  contactId?: string;
  action: 'created' | 'found_existing' | 'failed';
  customerEmail: string;
  customerName: string;
  isFakeCustomer: boolean;
  zohoResponse?: any;
}

export interface ProductCreationResult {
  productResults: Array<{
    sku: string;
    productName: string;
    action: 'found_existing' | 'created_new' | 'failed';
    zohoProductId?: string;
    error?: string;
  }>;
  totalProducts: number;
  foundExisting: number;
  createdNew: number;
  failures: number;
}

export interface DealCreationResult {
  totalDeals: number;
  allSubformsComplete: boolean;
  shippingOutcomes: string[];
  dealBreakdown: Array<{
    dealId: string;
    dealName: string;
    shippingOutcome: 'direct_to_customer' | 'drop_ship_ffl' | 'in_house_ffl';
    subformComplete: boolean;
    productCount: number;
    comprehensiveFields?: any; // Comprehensive Deal fields from ComprehensiveDealFieldMapper
    products: Array<{
      sku: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }>;
}

export interface CreditCardErrorResult {
  errorCode?: string;
  errorMessage: string;
  transactionId?: string;
  isSandbox: boolean;
  cardNumber?: string; // Last 4 digits only
  amount: number;
  authorizeNetResponse?: any;
}

export class EnhancedOrderActivityLogger {
  
  /**
   * Log TGF order numbering with format verification
   */
  static async logOrderNumbering(
    orderId: number, 
    tgfOrderNumber: string,
    sequenceNumber: number,
    format: 'standard' | 'test' = 'test'
  ): Promise<void> {
    const details = {
      tgfOrderNumber,
      sequenceNumber,
      format: `TGF ${format} format`,
      generatedAt: new Date().toISOString(),
      isValidFormat: /^test\d{8}$/.test(tgfOrderNumber) || /^TGF\d{8}$/.test(tgfOrderNumber)
    };

    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'order_numbering',
      eventStatus: details.isValidFormat ? 'success' : 'warning',
      description: `TGF order number ${tgfOrderNumber} generated with ${format} format`,
      details
    });
  }

  /**
   * Log real inventory verification with authentic RSR data
   */
  static async logInventoryVerification(
    orderId: number,
    tgfOrderNumber: string,
    inventoryItems: Array<{
      sku: string;
      productName: string;
      isRealRSRData: boolean;
      stockQuantity?: number;
      verified: boolean;
    }>
  ): Promise<void> {
    const verifiedItems = inventoryItems.filter(item => item.verified).length;
    const realDataItems = inventoryItems.filter(item => item.isRealRSRData).length;
    const allRealData = realDataItems === inventoryItems.length;

    const details = {
      totalItems: inventoryItems.length,
      verifiedItems,
      realDataItems,
      allRealData,
      inventoryBreakdown: inventoryItems.map(item => ({
        sku: item.sku,
        productName: item.productName,
        verified: item.verified,
        isRealRSRData: item.isRealRSRData,
        stockQuantity: item.stockQuantity
      }))
    };

    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'inventory_verification',
      eventStatus: allRealData && verifiedItems === inventoryItems.length ? 'success' : 'warning',
      description: `Inventory verification: ${verifiedItems}/${inventoryItems.length} items verified, ${realDataItems} using real RSR data`,
      details
    });
  }

  /**
   * Log real FFL verification with authentic dealer data
   */
  static async logFFLVerification(
    orderId: number,
    tgfOrderNumber: string,
    fflInfo: {
      fflId: number;
      businessName: string;
      licenseNumber: string;
      isRealFFL: boolean;
      verified: boolean;
      city?: string;
      state?: string;
    }
  ): Promise<void> {
    const details = {
      fflId: fflInfo.fflId,
      businessName: fflInfo.businessName,
      licenseNumber: fflInfo.licenseNumber,
      location: fflInfo.city && fflInfo.state ? `${fflInfo.city}, ${fflInfo.state}` : 'Unknown',
      isRealFFL: fflInfo.isRealFFL,
      verified: fflInfo.verified,
      verificationTime: new Date().toISOString()
    };

    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'ffl_verification',
      eventStatus: fflInfo.verified && fflInfo.isRealFFL ? 'success' : 'warning',
      description: `FFL verification: ${fflInfo.businessName} (${fflInfo.licenseNumber}) - ${fflInfo.isRealFFL ? 'Real FFL data' : 'Test FFL data'}`,
      details
    });
  }

  /**
   * Log customer contact creation in Zoho Contacts module
   */
  static async logContactCreation(
    orderId: number,
    tgfOrderNumber: string,
    contactResult: ContactCreationResult
  ): Promise<void> {
    const details = {
      contactAction: contactResult.action,
      customerEmail: contactResult.customerEmail,
      customerName: contactResult.customerName,
      isFakeCustomer: contactResult.isFakeCustomer,
      zohoContactId: contactResult.contactId,
      processingTime: new Date().toISOString(),
      zohoResponse: contactResult.zohoResponse ? {
        id: contactResult.zohoResponse.id,
        status: contactResult.zohoResponse.status,
        message: contactResult.zohoResponse.message
      } : null
    };

    const customerType = contactResult.isFakeCustomer ? 'fake customer' : 'real customer';
    
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'contact_creation',
      eventStatus: contactResult.action === 'failed' ? 'failed' : 'success',
      description: `Contact ${contactResult.action} in Zoho Contacts module for ${contactResult.customerEmail} (${customerType})`,
      details
    });
  }

  /**
   * Log product creation/lookup in Zoho Products module
   */
  static async logProductCreation(
    orderId: number,
    tgfOrderNumber: string,
    productResult: ProductCreationResult
  ): Promise<void> {
    const details = {
      totalProducts: productResult.totalProducts,
      foundExisting: productResult.foundExisting,
      createdNew: productResult.createdNew,
      failures: productResult.failures,
      productBreakdown: productResult.productResults.map(product => ({
        sku: product.sku,
        productName: product.productName,
        action: product.action,
        zohoProductId: product.zohoProductId,
        success: product.action !== 'failed',
        error: product.error
      })),
      processingTime: new Date().toISOString()
    };

    const status = productResult.failures > 0 ? 'warning' : 'success';
    const description = `Products processed in Zoho Products module: ${productResult.createdNew} created, ${productResult.foundExisting} found existing${productResult.failures > 0 ? `, ${productResult.failures} failed` : ''}`;

    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'product_creation',
      eventStatus: status,
      description,
      details
    });
  }

  /**
   * Log deal creation with complete subforms in Zoho Deals module
   */
  static async logDealCreation(
    orderId: number,
    tgfOrderNumber: string,
    dealResult: DealCreationResult
  ): Promise<void> {
    const details = {
      totalDeals: dealResult.totalDeals,
      allSubformsComplete: dealResult.allSubformsComplete,
      shippingOutcomes: dealResult.shippingOutcomes,
      multipleShippingOutcomes: dealResult.shippingOutcomes.length > 1,
      dealBreakdown: dealResult.dealBreakdown.map(deal => ({
        dealId: deal.dealId,
        dealName: deal.dealName,
        shippingOutcome: deal.shippingOutcome,
        subformComplete: deal.subformComplete,
        productCount: deal.productCount,
        comprehensiveFields: deal.comprehensiveFields, // Include comprehensive fields
        products: deal.products
      })),
      processingTime: new Date().toISOString()
    };

    const description = dealResult.totalDeals === 1 
      ? `Deal created in Zoho Deal module with ${dealResult.allSubformsComplete ? 'complete' : 'incomplete'} subform`
      : `${dealResult.totalDeals} deals created for multiple shipping outcomes with ${dealResult.allSubformsComplete ? 'complete' : 'partial'} subforms`;

    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'deal_creation',
      eventStatus: dealResult.allSubformsComplete ? 'success' : 'warning',
      description,
      details
    });
  }

  /**
   * Log credit card errors from Authorize.Net sandbox
   */
  static async logCreditCardError(
    orderId: number,
    tgfOrderNumber: string,
    errorResult: CreditCardErrorResult
  ): Promise<void> {
    const details = {
      errorCode: errorResult.errorCode,
      errorMessage: errorResult.errorMessage,
      transactionId: errorResult.transactionId,
      isSandbox: errorResult.isSandbox,
      cardLastFour: errorResult.cardNumber ? errorResult.cardNumber.slice(-4) : null,
      amount: errorResult.amount,
      processingTime: new Date().toISOString(),
      authorizeNetResponse: errorResult.authorizeNetResponse ? {
        responseCode: errorResult.authorizeNetResponse.responseCode,
        responseReasonCode: errorResult.authorizeNetResponse.responseReasonCode,
        responseReasonText: errorResult.authorizeNetResponse.responseReasonText
      } : null
    };

    const environment = errorResult.isSandbox ? 'SANDBOX' : 'LIVE';
    
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'credit_card_error',
      eventStatus: 'failed',
      description: `Credit card error in ${environment}: ${errorResult.errorMessage} (Code: ${errorResult.errorCode || 'Unknown'})`,
      details
    });
  }

  /**
   * Log successful payment processing
   */
  static async logPaymentSuccess(
    orderId: number,
    tgfOrderNumber: string,
    paymentResult: {
      transactionId: string;
      amount: number;
      cardLastFour?: string;
      isSandbox: boolean;
      authCode?: string;
      responseCode: string;
    }
  ): Promise<void> {
    const details = {
      transactionId: paymentResult.transactionId,
      amount: paymentResult.amount,
      cardLastFour: paymentResult.cardLastFour,
      isSandbox: paymentResult.isSandbox,
      authCode: paymentResult.authCode,
      responseCode: paymentResult.responseCode,
      processingTime: new Date().toISOString()
    };

    const environment = paymentResult.isSandbox ? 'SANDBOX' : 'LIVE';
    
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'payment_processing',
      eventStatus: 'success',
      description: `Payment processed successfully in ${environment} - Transaction: ${paymentResult.transactionId}`,
      details
    });
  }

  /**
   * Log shipping outcome splits (multiple deals for different shipping types)
   */
  static async logShippingOutcomeSplit(
    orderId: number,
    tgfOrderNumber: string,
    splitResult: {
      originalOrder: { totalItems: number; totalValue: number };
      splitOutcomes: Array<{
        shippingType: string;
        itemCount: number;
        value: number;
        dealId?: string;
      }>;
    }
  ): Promise<void> {
    const details = {
      originalOrder: splitResult.originalOrder,
      splitCount: splitResult.splitOutcomes.length,
      splitOutcomes: splitResult.splitOutcomes,
      multipleDealsCreated: splitResult.splitOutcomes.length > 1,
      processingTime: new Date().toISOString()
    };

    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'shipping_outcome_split',
      eventStatus: 'success',
      description: `Order split into ${splitResult.splitOutcomes.length} shipping outcomes: ${splitResult.splitOutcomes.map(o => o.shippingType).join(', ')}`,
      details
    });
  }

  /**
   * Generate comprehensive APP Response field data
   */
  static async generateAppResponseData(orderId: number): Promise<any> {
    const logs = await this.getOrderLogs(orderId);
    
    const appResponse = {
      orderId,
      orderStatus: 'processed',
      processingSummary: {
        totalEvents: logs.length,
        successfulEvents: logs.filter(log => log.eventStatus === 'success').length,
        failedEvents: logs.filter(log => log.eventStatus === 'failed').length,
        warningEvents: logs.filter(log => log.eventStatus === 'warning').length
      },
      eventDetails: logs.map(log => ({
        eventType: log.eventType,
        status: log.eventStatus,
        timestamp: log.createdAt,
        description: log.description,
        details: log.details
      })),
      complianceData: {
        orderNumbering: logs.find(log => log.eventType === 'order_numbering')?.details,
        inventoryVerification: logs.find(log => log.eventType === 'inventory_verification')?.details,
        fflVerification: logs.find(log => log.eventType === 'ffl_verification')?.details,
        contactCreation: logs.find(log => log.eventType === 'contact_creation')?.details,
        productCreation: logs.find(log => log.eventType === 'product_creation')?.details,
        dealCreation: logs.find(log => log.eventType === 'deal_creation')?.details,
        paymentProcessing: logs.find(log => log.eventType === 'payment_processing')?.details
      },
      generatedAt: new Date().toISOString(),
      auditTrail: 'Complete order processing audit trail for compliance verification'
    };

    // Log the APP Response generation
    await this.logEvent({
      orderId,
      tgfOrderNumber: logs[0]?.tgfOrderNumber || 'unknown',
      eventType: 'order_completion',
      eventStatus: 'success',
      description: 'APP Response field data generated with complete audit trail',
      details: { appResponseDataSize: JSON.stringify(appResponse).length, eventCount: logs.length }
    });

    return appResponse;
  }

  /**
   * Core logging function
   */
  private static async logEvent(event: OrderActivityLogEvent): Promise<void> {
    try {
      const logData: InsertOrderActivityLog = {
        orderId: event.orderId,
        tgfOrderNumber: event.tgfOrderNumber,
        eventType: event.eventType,
        eventStatus: event.eventStatus,
        eventCategory: this.getEventCategory(event.eventType),
        description: event.description,
        details: event.details,
        // Set specific tracking fields based on event type
        inventoryVerified: event.eventType === 'inventory_verification' && event.eventStatus === 'success',
        realInventoryUsed: event.eventType === 'inventory_verification' && event.details?.allRealData === true,
        fflVerified: event.eventType === 'ffl_verification' && event.eventStatus === 'success',
        realFflUsed: event.eventType === 'ffl_verification' && event.details?.isRealFFL === true,
        customerCreated: event.eventType === 'contact_creation' && event.eventStatus === 'success',
        zohoContactId: event.eventType === 'contact_creation' ? event.details?.zohoContactId : null,
        zohoProductsCreated: event.eventType === 'product_creation' ? event.details?.createdNew || 0 : 0,
        zohoProductsFound: event.eventType === 'product_creation' ? event.details?.foundExisting || 0 : 0,
        zohoDealId: event.eventType === 'deal_creation' ? event.details?.dealBreakdown?.[0]?.dealId : null,
        subformCompleted: event.eventType === 'deal_creation' && event.details?.allSubformsComplete === true,
        dealCount: event.eventType === 'deal_creation' ? event.details?.totalDeals || 0 : 0,
        paymentMethod: event.eventType === 'payment_processing' || event.eventType === 'credit_card_error' ? 'credit_card' : null,
        paymentStatus: event.eventType === 'payment_processing' ? 'processed' : 
                      event.eventType === 'credit_card_error' ? 'failed' : null
      };

      await db.insert(orderActivityLogs).values(logData);
      console.log(`📋 Activity Log: [${event.eventType.toUpperCase()}] ${event.description} - Status: ${event.eventStatus}`);
      
    } catch (error) {
      console.error('❌ Failed to log order activity:', error);
      throw error;
    }
  }

  private static getEventCategory(eventType: string): string {
    const categoryMap: Record<string, string> = {
      'order_numbering': 'system',
      'inventory_verification': 'inventory',
      'ffl_verification': 'ffl',
      'contact_creation': 'zoho',
      'product_creation': 'zoho',
      'deal_creation': 'zoho',
      'payment_processing': 'payment',
      'credit_card_error': 'payment',
      'shipping_outcome_split': 'system',
      'order_completion': 'system'
    };
    return categoryMap[eventType] || 'system';
  }

  /**
   * Get all activity logs for an order
   */
  static async getOrderLogs(orderId: number) {
    return await db.select()
      .from(orderActivityLogs)
      .where(eq(orderActivityLogs.orderId, orderId))
      .orderBy(desc(orderActivityLogs.createdAt));
  }

  /**
   * Get activity summary for an order
   */
  static async getOrderSummary(orderId: number) {
    const logs = await this.getOrderLogs(orderId);
    
    const summary: Record<string, any> = {};
    logs.forEach(log => {
      summary[log.eventType] = {
        success: log.eventStatus === 'success',
        timestamp: log.createdAt,
        description: log.description,
        details: log.details
      };
    });
    
    return summary;
  }
}