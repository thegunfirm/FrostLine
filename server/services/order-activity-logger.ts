import { db } from '../db.js';
import { orderActivityLogs, type InsertOrderActivityLog } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

export interface OrderActivityEventData {
  orderId: number;
  tgfOrderNumber?: string;
  eventType: 'order_numbering' | 'inventory_verification' | 'ffl_verification' | 'contact_creation' | 'product_creation' | 'deal_creation' | 'payment_processing' | 'order_completion';
  eventStatus: 'success' | 'failed' | 'warning' | 'pending';
  eventCategory: 'system' | 'zoho' | 'payment' | 'inventory' | 'ffl';
  description: string;
  details?: Record<string, any>;
  
  // Inventory data
  inventoryVerified?: boolean;
  realInventoryUsed?: boolean;
  inventoryItems?: Array<{
    sku: string;
    name: string;
    quantity: number;
    rsrStockNumber?: string;
    verified: boolean;
  }>;
  
  // FFL data
  fflVerified?: boolean;
  realFflUsed?: boolean;
  fflLicense?: string;
  fflName?: string;
  
  // Customer/Contact data
  customerCreated?: boolean;
  zohoContactId?: string;
  zohoContactStatus?: 'created' | 'found_existing' | 'failed';
  
  // Product module data
  zohoProductsCreated?: number;
  zohoProductsFound?: number;
  zohoProductIds?: string[];
  productProcessingStatus?: 'completed' | 'partial' | 'failed';
  
  // Deal module data
  zohoDealId?: string;
  zohoDealStatus?: 'created' | 'failed' | 'multiple_deals';
  subformCompleted?: boolean;
  dealCount?: number;
  shippingOutcomes?: Array<{
    type: string;
    dealId?: string;
    items: Array<{ sku: string; quantity: number }>;
  }>;
  
  // Payment data
  paymentMethod?: string;
  paymentStatus?: 'sandbox' | 'processed' | 'failed' | 'pending';
  authorizeNetResult?: Record<string, any>;
  paymentErrorCode?: string;
  paymentErrorMessage?: string;
  
  // App Response data for Zoho Deal module
  appResponseData?: Record<string, any>;
  
  // System metadata
  processingTimeMs?: number;
  retryCount?: number;
  errorTrace?: string;
}

export class OrderActivityLogger {
  /**
   * Log a comprehensive order processing event
   */
  static async logEvent(eventData: OrderActivityEventData): Promise<void> {
    try {
      const logEntry: InsertOrderActivityLog = {
        orderId: eventData.orderId,
        tgfOrderNumber: eventData.tgfOrderNumber,
        eventType: eventData.eventType,
        eventStatus: eventData.eventStatus,
        eventCategory: eventData.eventCategory,
        description: eventData.description,
        details: eventData.details,
        
        // Inventory tracking
        inventoryVerified: eventData.inventoryVerified || false,
        realInventoryUsed: eventData.realInventoryUsed || false,
        inventoryItems: eventData.inventoryItems,
        
        // FFL tracking
        fflVerified: eventData.fflVerified || false,
        realFflUsed: eventData.realFflUsed || false,
        fflLicense: eventData.fflLicense,
        fflName: eventData.fflName,
        
        // Customer/Contact tracking
        customerCreated: eventData.customerCreated || false,
        zohoContactId: eventData.zohoContactId,
        zohoContactStatus: eventData.zohoContactStatus,
        
        // Product module tracking
        zohoProductsCreated: eventData.zohoProductsCreated || 0,
        zohoProductsFound: eventData.zohoProductsFound || 0,
        zohoProductIds: eventData.zohoProductIds,
        productProcessingStatus: eventData.productProcessingStatus,
        
        // Deal module tracking
        zohoDealId: eventData.zohoDealId,
        zohoDealStatus: eventData.zohoDealStatus,
        subformCompleted: eventData.subformCompleted || false,
        dealCount: eventData.dealCount || 0,
        shippingOutcomes: eventData.shippingOutcomes,
        
        // Payment processing tracking
        paymentMethod: eventData.paymentMethod,
        paymentStatus: eventData.paymentStatus,
        authorizeNetResult: eventData.authorizeNetResult,
        paymentErrorCode: eventData.paymentErrorCode,
        paymentErrorMessage: eventData.paymentErrorMessage,
        
        // App Response field data
        appResponseData: eventData.appResponseData,
        
        // System metadata
        processingTimeMs: eventData.processingTimeMs,
        retryCount: eventData.retryCount || 0,
        errorTrace: eventData.errorTrace,
      };

      await db.insert(orderActivityLogs).values(logEntry);
      
      console.log(`📋 Activity Log: [${eventData.eventType.toUpperCase()}] ${eventData.description} - Status: ${eventData.eventStatus}`);
    } catch (error) {
      console.error('❌ Failed to log order activity:', error);
      // Don't throw - logging failures shouldn't break the main order flow
    }
  }

  /**
   * Log TGF order number generation event
   */
  static async logOrderNumbering(orderId: number, tgfOrderNumber: string, success: boolean, details?: Record<string, any>): Promise<void> {
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'order_numbering',
      eventStatus: success ? 'success' : 'failed',
      eventCategory: 'system',
      description: success 
        ? `TGF order number ${tgfOrderNumber} generated successfully`
        : `Failed to generate TGF order number`,
      details,
    });
  }

  /**
   * Log inventory verification event
   */
  static async logInventoryVerification(
    orderId: number, 
    tgfOrderNumber: string,
    inventoryItems: Array<{ sku: string; name: string; quantity: number; rsrStockNumber?: string; verified: boolean }>,
    success: boolean
  ): Promise<void> {
    const verifiedCount = inventoryItems.filter(item => item.verified).length;
    const realInventoryUsed = verifiedCount > 0;
    
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'inventory_verification',
      eventStatus: success ? 'success' : 'failed',
      eventCategory: 'inventory',
      description: `Inventory verification: ${verifiedCount}/${inventoryItems.length} items verified from real RSR data`,
      inventoryVerified: success,
      realInventoryUsed,
      inventoryItems,
      details: {
        totalItems: inventoryItems.length,
        verifiedItems: verifiedCount,
        realDataUsed: realInventoryUsed,
      },
    });
  }

  /**
   * Log FFL verification event
   */
  static async logFflVerification(
    orderId: number,
    tgfOrderNumber: string,
    fflLicense: string,
    fflName: string,
    success: boolean,
    isRealFfl: boolean
  ): Promise<void> {
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'ffl_verification',
      eventStatus: success ? 'success' : 'failed',
      eventCategory: 'ffl',
      description: `FFL verification: ${fflName} (${fflLicense}) - ${isRealFfl ? 'Real FFL data' : 'Test FFL data'}`,
      fflVerified: success,
      realFflUsed: isRealFfl,
      fflLicense,
      fflName,
    });
  }

  /**
   * Log Zoho contact creation event
   */
  static async logContactCreation(
    orderId: number,
    tgfOrderNumber: string,
    zohoContactId: string | null,
    status: 'created' | 'found_existing' | 'failed',
    customerEmail: string
  ): Promise<void> {
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'contact_creation',
      eventStatus: status === 'failed' ? 'failed' : 'success',
      eventCategory: 'zoho',
      description: `Contact ${status} in Zoho Contacts module for ${customerEmail}`,
      customerCreated: status === 'created',
      zohoContactId: zohoContactId || undefined,
      zohoContactStatus: status,
      details: {
        customerEmail,
        contactAction: status,
      },
    });
  }

  /**
   * Log Zoho product creation event
   */
  static async logProductCreation(
    orderId: number,
    tgfOrderNumber: string,
    productsCreated: number,
    productsFound: number,
    zohoProductIds: string[],
    status: 'completed' | 'partial' | 'failed'
  ): Promise<void> {
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'product_creation',
      eventStatus: status === 'failed' ? 'failed' : 'success',
      eventCategory: 'zoho',
      description: `Products processed in Zoho Products module: ${productsCreated} created, ${productsFound} found existing`,
      zohoProductsCreated: productsCreated,
      zohoProductsFound: productsFound,
      zohoProductIds,
      productProcessingStatus: status,
      details: {
        totalProducts: productsCreated + productsFound,
        newProducts: productsCreated,
        existingProducts: productsFound,
      },
    });
  }

  /**
   * Log Zoho deal creation event
   */
  static async logDealCreation(
    orderId: number,
    tgfOrderNumber: string,
    dealIds: string[],
    subformCompleted: boolean,
    shippingOutcomes: Array<{ type: string; dealId?: string; items: Array<{ sku: string; quantity: number }> }>,
    status: 'created' | 'failed' | 'multiple_deals'
  ): Promise<void> {
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'deal_creation',
      eventStatus: status === 'failed' ? 'failed' : 'success',
      eventCategory: 'zoho',
      description: `Deal(s) created in Zoho Deal module: ${dealIds.length} deal(s) with ${subformCompleted ? 'completed' : 'incomplete'} subforms`,
      zohoDealId: dealIds[0], // Primary deal ID
      zohoDealStatus: status,
      subformCompleted,
      dealCount: dealIds.length,
      shippingOutcomes,
      details: {
        dealIds,
        totalDeals: dealIds.length,
        subformStatus: subformCompleted ? 'completed' : 'incomplete',
        shippingTypes: shippingOutcomes.map(so => so.type as string),
      },
    });
  }

  /**
   * Log payment processing event
   */
  static async logPaymentProcessing(
    orderId: number,
    tgfOrderNumber: string,
    paymentMethod: string,
    authorizeNetResult: Record<string, any>,
    success: boolean,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'payment_processing',
      eventStatus: success ? 'success' : 'failed',
      eventCategory: 'payment',
      description: `Payment processing via ${paymentMethod}: ${success ? 'Success' : 'Failed'} - ${success ? 'SANDBOX' : errorMessage}`,
      paymentMethod,
      paymentStatus: success ? 'sandbox' : 'failed',
      authorizeNetResult,
      paymentErrorCode: errorCode,
      paymentErrorMessage: errorMessage,
      details: {
        isSandbox: true,
        transactionType: paymentMethod,
      },
    });
  }

  /**
   * Log comprehensive app response data that will go into Zoho Deal's APP Response field
   */
  static async logAppResponse(
    orderId: number,
    tgfOrderNumber: string,
    appResponseData: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      orderId,
      tgfOrderNumber,
      eventType: 'order_completion',
      eventStatus: 'success',
      eventCategory: 'system',
      description: `Complete order processing summary for APP Response field`,
      appResponseData,
      details: {
        responseFieldData: appResponseData,
      },
    });
  }

  /**
   * Get all activity logs for an order
   */
  static async getOrderLogs(orderId: number) {
    return await db
      .select()
      .from(orderActivityLogs)
      .where(eq(orderActivityLogs.orderId, orderId))
      .orderBy(orderActivityLogs.createdAt);
  }

  /**
   * Get summary of all events for an order - useful for APP Response field
   */
  static async getOrderSummary(orderId: number): Promise<Record<string, any>> {
    const logs = await this.getOrderLogs(orderId);
    
    const summary = {
      orderId,
      tgfOrderNumber: logs[0]?.tgfOrderNumber || 'Unknown',
      totalEvents: logs.length,
      orderNumbering: logs.find(l => l.eventType === 'order_numbering')?.eventStatus || 'not_processed',
      inventoryVerification: {
        status: logs.find(l => l.eventType === 'inventory_verification')?.eventStatus || 'not_processed',
        realInventoryUsed: logs.some(l => l.realInventoryUsed),
        itemsVerified: (logs.find(l => l.eventType === 'inventory_verification')?.inventoryItems as any[])?.length || 0,
      },
      fflVerification: {
        status: logs.find(l => l.eventType === 'ffl_verification')?.eventStatus || 'not_processed',
        realFflUsed: logs.some(l => l.realFflUsed),
        fflName: logs.find(l => l.eventType === 'ffl_verification')?.fflName || 'Not specified',
      },
      contactCreation: {
        status: logs.find(l => l.eventType === 'contact_creation')?.eventStatus || 'not_processed',
        zohoContactId: logs.find(l => l.eventType === 'contact_creation')?.zohoContactId || null,
        contactAction: logs.find(l => l.eventType === 'contact_creation')?.zohoContactStatus || 'not_processed',
      },
      productCreation: {
        status: logs.find(l => l.eventType === 'product_creation')?.eventStatus || 'not_processed',
        productsCreated: logs.find(l => l.eventType === 'product_creation')?.zohoProductsCreated || 0,
        productsFound: logs.find(l => l.eventType === 'product_creation')?.zohoProductsFound || 0,
        zohoProductIds: logs.find(l => l.eventType === 'product_creation')?.zohoProductIds || [],
      },
      dealCreation: {
        status: logs.find(l => l.eventType === 'deal_creation')?.eventStatus || 'not_processed',
        dealCount: logs.find(l => l.eventType === 'deal_creation')?.dealCount || 0,
        dealIds: logs.filter(l => l.eventType === 'deal_creation').map(l => l.zohoDealId).filter(Boolean),
        subformCompleted: logs.some(l => l.subformCompleted),
      },
      paymentProcessing: {
        status: logs.find(l => l.eventType === 'payment_processing')?.eventStatus || 'not_processed',
        paymentMethod: logs.find(l => l.eventType === 'payment_processing')?.paymentMethod || 'Not specified',
        isSandbox: true,
      },
      timestamps: {
        started: logs[0]?.createdAt,
        completed: logs[logs.length - 1]?.createdAt,
      },
      allEvents: logs.map(log => ({
        eventType: log.eventType,
        status: log.eventStatus,
        description: log.description,
        timestamp: log.createdAt,
      })),
    };

    return summary;
  }
}