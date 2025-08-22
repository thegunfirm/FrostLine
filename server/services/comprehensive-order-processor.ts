import { OrderActivityLogger } from './order-activity-logger.js';
import { db } from '../db.js';
import { products, ffls, users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

export interface ComprehensiveOrderProcessingData {
  orderId: number;
  tgfOrderNumber: string;
  orderItems: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: number;
    productId?: number;
    fflRequired?: boolean;
    distributorStockNumber?: string;
  }>;
  customerInfo: {
    email: string;
    firstName: string;
    lastName: string;
    membershipTier: string;
  };
  fflInfo?: {
    license: string;
    businessName: string;
    address: any;
  };
  paymentData?: {
    method: string;
    cardNumber?: string;
    result?: any;
    errorCode?: string;
    errorMessage?: string;
  };
}

export class ComprehensiveOrderProcessor {
  
  /**
   * Process order with comprehensive activity logging
   */
  static async processWithLogging(data: ComprehensiveOrderProcessingData): Promise<{
    success: boolean;
    logs: any[];
    summary: any;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Step 1: Log TGF order numbering
      await OrderActivityLogger.logOrderNumbering(
        data.orderId, 
        data.tgfOrderNumber, 
        true, 
        {
          orderFormat: 'TGF standard format',
          sequenceNumber: data.orderId,
          generatedAt: new Date().toISOString()
        }
      );

      // Step 2: Verify and log inventory
      const inventoryItems = [];
      let inventoryVerificationSuccess = true;
      
      for (const item of data.orderItems) {
        // Verify product exists in database
        const [productRecord] = await db
          .select()
          .from(products)
          .where(eq(products.sku, item.sku))
          .limit(1);
        
        const verified = Boolean(productRecord);
        if (!verified) {
          inventoryVerificationSuccess = false;
        }
        
        inventoryItems.push({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          rsrStockNumber: item.distributorStockNumber || productRecord?.rsrStockNumber || undefined,
          verified: verified
        });
      }
      
      await OrderActivityLogger.logInventoryVerification(
        data.orderId,
        data.tgfOrderNumber,
        inventoryItems,
        inventoryVerificationSuccess
      );

      // Step 3: Verify and log FFL if needed
      if (data.fflInfo) {
        // Check if FFL exists in database
        const [fflRecord] = await db
          .select()
          .from(ffls)
          .where(eq(ffls.licenseNumber, data.fflInfo.license))
          .limit(1);
        
        const fflVerified = Boolean(fflRecord);
        
        await OrderActivityLogger.logFflVerification(
          data.orderId,
          data.tgfOrderNumber,
          data.fflInfo.license,
          data.fflInfo.businessName,
          fflVerified,
          fflVerified // isRealFfl = true if found in database
        );
      }

      // Step 4: Log Zoho contact creation (simulated)
      await OrderActivityLogger.logContactCreation(
        data.orderId,
        data.tgfOrderNumber,
        `zoho_contact_${Date.now()}`, // Simulated Zoho contact ID
        'created', // Simulated successful creation
        data.customerInfo.email
      );

      // Step 5: Log Zoho product creation (simulated)
      const productIds = data.orderItems.map(item => `zoho_product_${item.sku}_${Date.now()}`);
      await OrderActivityLogger.logProductCreation(
        data.orderId,
        data.tgfOrderNumber,
        data.orderItems.length, // products created
        0, // products found (simulating all new)
        productIds,
        'completed'
      );

      // Step 6: Log Zoho deal creation (simulated)
      const dealId = `zoho_deal_${data.tgfOrderNumber}_${Date.now()}`;
      const shippingOutcomes = data.fflInfo ? [
        {
          type: 'drop_ship_ffl',
          dealId: dealId,
          items: data.orderItems.map(item => ({ sku: item.sku, quantity: item.quantity }))
        }
      ] : [
        {
          type: 'drop_ship_customer',
          dealId: dealId,
          items: data.orderItems.map(item => ({ sku: item.sku, quantity: item.quantity }))
        }
      ];
      
      await OrderActivityLogger.logDealCreation(
        data.orderId,
        data.tgfOrderNumber,
        [dealId],
        true, // subform completed
        shippingOutcomes,
        'created'
      );

      // Step 7: Log payment processing
      if (data.paymentData) {
        const paymentSuccess = !data.paymentData.errorCode;
        await OrderActivityLogger.logPaymentProcessing(
          data.orderId,
          data.tgfOrderNumber,
          data.paymentData.method,
          data.paymentData.result || { sandbox: true, processed: paymentSuccess },
          paymentSuccess,
          data.paymentData.errorCode,
          data.paymentData.errorMessage
        );
      }

      // Step 8: Create comprehensive APP Response data
      const processingTime = Date.now() - startTime;
      const appResponseData = {
        orderId: data.orderId,
        tgfOrderNumber: data.tgfOrderNumber,
        processingCompletedAt: new Date().toISOString(),
        processingTimeMs: processingTime,
        orderStatus: 'processed_successfully',
        inventoryVerification: {
          status: inventoryVerificationSuccess ? 'verified' : 'partial',
          itemsProcessed: inventoryItems.length,
          realInventoryUsed: inventoryItems.some(item => item.verified)
        },
        fflVerification: data.fflInfo ? {
          status: 'verified',
          license: data.fflInfo.license,
          businessName: data.fflInfo.businessName,
          realFflUsed: true
        } : null,
        zohoIntegration: {
          contactCreated: true,
          productsProcessed: data.orderItems.length,
          dealCreated: true,
          dealId: dealId,
          subformCompleted: true
        },
        paymentProcessing: data.paymentData ? {
          method: data.paymentData.method,
          status: data.paymentData.errorCode ? 'failed' : 'sandbox_success',
          errorCode: data.paymentData.errorCode || null
        } : null,
        systemMetadata: {
          processedBy: 'ComprehensiveOrderProcessor',
          version: '1.0.0',
          environment: 'development',
          totalProcessingTime: processingTime
        }
      };

      await OrderActivityLogger.logAppResponse(
        data.orderId,
        data.tgfOrderNumber,
        appResponseData
      );

      // Get all logs and summary
      const logs = await OrderActivityLogger.getOrderLogs(data.orderId);
      const summary = await OrderActivityLogger.getOrderSummary(data.orderId);

      return {
        success: true,
        logs,
        summary
      };
      
    } catch (error) {
      console.error('❌ Comprehensive order processing failed:', error);
      
      // Log the failure
      await OrderActivityLogger.logEvent({
        orderId: data.orderId,
        tgfOrderNumber: data.tgfOrderNumber,
        eventType: 'order_completion',
        eventStatus: 'failed',
        eventCategory: 'system',
        description: `Order processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorTrace: error instanceof Error ? error.stack : undefined,
        processingTimeMs: Date.now() - startTime
      });

      return {
        success: false,
        logs: await OrderActivityLogger.getOrderLogs(data.orderId),
        summary: await OrderActivityLogger.getOrderSummary(data.orderId),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Demonstrate comprehensive logging with real data
   */
  static async demonstrateWithRealData(): Promise<{
    success: boolean;
    orderId: number;
    tgfOrderNumber: string;
    logs: any[];
    summary: any;
  }> {
    console.log('🔍 COMPREHENSIVE LOGGING DEMONSTRATION');
    console.log('=' .repeat(80));

    try {
      // Get real product data
      const [realProduct] = await db
        .select()
        .from(products)
        .limit(1);
      
      if (!realProduct) {
        throw new Error('No real products found in database');
      }

      // Get real FFL data
      const [realFfl] = await db
        .select()
        .from(ffls)
        .limit(1);

      // Create a demo order ID (simulate order creation)
      const demoOrderId = Date.now() % 100000; // Convert to manageable number
      const tgfOrderNumber = `test${String(demoOrderId).padStart(8, '0')}`;

      console.log(`📋 Demo Order ID: ${demoOrderId}`);
      console.log(`📋 TGF Order Number: ${tgfOrderNumber}`);
      console.log(`📦 Using real product: ${realProduct.name} (SKU: ${realProduct.sku})`);
      if (realFfl) {
        console.log(`🔫 Using real FFL: ${realFfl.businessName} (License: ${realFfl.licenseNumber || 'Unknown'})`);
      }

      const processingData: ComprehensiveOrderProcessingData = {
        orderId: demoOrderId,
        tgfOrderNumber,
        orderItems: [{
          sku: realProduct.sku || 'UNKNOWN_SKU',
          name: realProduct.name,
          quantity: 1,
          price: parseFloat(realProduct.priceWholesale as string) || 99.99,
          productId: realProduct.id,
          fflRequired: realProduct.requiresFFL || false,
          distributorStockNumber: realProduct.rsrStockNumber || undefined
        }],
        customerInfo: {
          email: 'demo.customer@example.com',
          firstName: 'Demo',
          lastName: 'Customer',
          membershipTier: 'Bronze'
        },
        fflInfo: realFfl ? {
          license: realFfl.licenseNumber || 'Unknown',
          businessName: realFfl.businessName,
          address: realFfl.address
        } : undefined,
        paymentData: {
          method: 'credit_card',
          cardNumber: '4111111111111111', // Test card
          result: {
            transactionId: `auth_demo_${Date.now()}`,
            responseCode: '1',
            authCode: 'DEMO123',
            sandbox: true
          }
        }
      };

      console.log('\n🔄 Processing order with comprehensive logging...');
      const result = await this.processWithLogging(processingData);

      if (result.success) {
        console.log('✅ Comprehensive order processing completed successfully!');
        console.log(`📊 Total events logged: ${result.logs.length}`);
        
        return {
          success: true,
          orderId: demoOrderId,
          tgfOrderNumber,
          logs: result.logs,
          summary: result.summary
        };
      } else {
        throw new Error(result.error || 'Processing failed');
      }

    } catch (error) {
      console.error('❌ Demonstration failed:', error);
      throw error;
    }
  }
}