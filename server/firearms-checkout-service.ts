import { db } from './db';
import { orders, orderLines, products } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { firearmsComplianceService, type ComplianceCheckResult, type CartItem } from './firearms-compliance-service';
import { authorizeNetService } from './authorize-net-service';
// import { zohoService } from './zoho-service'; // Temporarily disabled
import type { InsertOrder, InsertOrderLine } from '@shared/schema';

export interface CheckoutPayload {
  userId: number;
  cartItems: CartItem[];
  shippingAddress: any;
  paymentMethod: {
    cardNumber: string;
    expirationDate: string;
    cvv: string;
  };
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  fflRecipientId?: number;
}

export interface CheckoutResult {
  success: boolean;
  orderId?: number;
  orderNumber?: string;
  status: 'Paid' | 'Pending FFL' | 'Hold – Multi-Firearm';
  hold?: {
    type: 'FFL' | 'Multi-Firearm';
    reason: string;
  };
  authTransactionId?: string;
  transactionId?: string;
  error?: string;
  dealId?: string;
}

export class FirearmsCheckoutService {
  
  /**
   * Process comprehensive checkout with firearms compliance
   */
  async processCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
    try {
      // Step 1: Perform compliance check
      const complianceResult = await firearmsComplianceService.performComplianceCheck(
        payload.userId,
        payload.cartItems
      );

      // Step 2: Calculate total amount
      const totalAmount = payload.cartItems.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      // Step 3: Handle payment based on compliance result
      let authResult;
      let orderStatus: string;
      let holdInfo = null;

      if (complianceResult.requiresHold) {
        // Hold scenario - authorize only
        authResult = await authorizeNetService.authOnlyTransaction(
          totalAmount,
          payload.paymentMethod.cardNumber,
          payload.paymentMethod.expirationDate,
          payload.paymentMethod.cvv,
          {
            ...payload.customerInfo,
            address: payload.shippingAddress,
          }
        );

        if (!authResult.success) {
          return {
            success: false,
            status: 'Paid',
            error: `Payment authorization failed: ${authResult.error}`,
          };
        }

        orderStatus = firearmsComplianceService.getOrderStatusForHold(complianceResult.holdType);
        holdInfo = {
          type: complianceResult.holdType!,
          reason: complianceResult.reason || 'Compliance hold required',
        };
      } else {
        // Normal checkout - capture immediately
        authResult = await authorizeNetService.authCaptureTransaction(
          totalAmount,
          payload.paymentMethod.cardNumber,
          payload.paymentMethod.expirationDate,
          payload.paymentMethod.cvv,
          {
            ...payload.customerInfo,
            address: payload.shippingAddress,
          }
        );

        if (!authResult.success) {
          return {
            success: false,
            status: 'Paid',
            error: `Payment failed: ${authResult.error}`,
          };
        }

        orderStatus = 'Paid';
      }

      // Step 4: Create order record
      const orderNumber = this.generateOrderNumber();
      
      const orderData: InsertOrder = {
        userId: payload.userId,
        totalPrice: totalAmount.toString(),
        status: orderStatus,
        items: payload.cartItems,
        fflRecipientId: payload.fflRecipientId,
        shippingAddress: payload.shippingAddress,
        authorizeNetTransactionId: authResult.transactionId,
        // Firearms compliance fields
        holdReason: complianceResult.holdType,
        authTransactionId: complianceResult.requiresHold ? authResult.transactionId : null,
        authExpiresAt: complianceResult.requiresHold ? authResult.expiresAt : null,
        capturedAt: !complianceResult.requiresHold ? new Date() : null,
        fflRequired: complianceResult.hasFirearms,
        fflStatus: complianceResult.hasFirearms ? 'Missing' : null,
        firearmsWindowCount: complianceResult.pastFirearmsCount,
        windowDays: complianceResult.windowDays,
        limitQty: complianceResult.limitQuantity,
      };

      const [newOrder] = await db.insert(orders).values(orderData).returning();

      // Step 5: Create order line items
      const orderLineData: InsertOrderLine[] = payload.cartItems.map(item => ({
        orderId: newOrder.id,
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price.toString(),
        totalPrice: (item.price * item.quantity).toString(),
        isFirearm: item.isFirearm || item.requiresFFL,
      }));

      await db.insert(orderLines).values(orderLineData);

      // Step 6: Sync to Zoho CRM
      let dealId: string | undefined;
      try {
        // Find or create contact
        const contact = await zohoService.findOrCreateContact(
          payload.customerInfo.email,
          payload.customerInfo.firstName,
          payload.customerInfo.lastName
        );

        if (contact.success && contact.contactId) {
          // Create deal
          const dealResult = await zohoService.createOrderDeal({
            contactId: contact.contactId,
            orderNumber,
            totalAmount,
            orderItems: payload.cartItems.map(item => ({
              productName: item.name,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.price,
              totalPrice: item.price * item.quantity,
            })),
            membershipTier: 'Bronze', // TODO: Get from user data
            fflRequired: complianceResult.hasFirearms,
            orderStatus,
          });

          if (dealResult.success && dealResult.dealId) {
            dealId = dealResult.dealId;
            
            // Update order with Zoho IDs
            await db.update(orders)
              .set({
                zohoDealId: dealId,
                zohoContactId: contact.contactId,
              })
              .where(eq(orders.id, newOrder.id));
          }
        }
      } catch (zohoError) {
        console.error('Zoho sync failed (non-blocking):', zohoError);
      }

      // Step 7: Return success result
      return {
        success: true,
        orderId: newOrder.id,
        orderNumber,
        status: orderStatus as any,
        hold: holdInfo,
        authTransactionId: complianceResult.requiresHold ? authResult.transactionId : undefined,
        transactionId: !complianceResult.requiresHold ? authResult.transactionId : undefined,
        dealId,
      };

    } catch (error: any) {
      console.error('Checkout processing error:', error);
      return {
        success: false,
        status: 'Paid',
        error: `Checkout failed: ${error.message}`,
      };
    }
  }

  /**
   * Process FFL attachment and verification
   */
  async attachAndVerifyFFL(
    orderId: number,
    fflDealerId: string,
    verifyFFL: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await db.query.orders.findFirst({
        where: (orders, { eq }) => eq(orders.id, orderId),
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (order.status !== 'Pending FFL') {
        return { success: false, error: 'Order is not in Pending FFL status' };
      }

      // Update FFL info
      const updateData: Partial<typeof orders.$inferSelect> = {
        fflDealerId,
        fflStatus: verifyFFL ? 'Verified' : 'Pending Verification',
        fflVerifiedAt: verifyFFL ? new Date() : null,
      };

      // If verifying and there's an auth transaction, capture it
      let captureResult = null;
      if (verifyFFL && order.authTransactionId) {
        captureResult = await authorizeNetService.capturePriorAuthTransaction(
          order.authTransactionId,
          parseFloat(order.totalPrice)
        );

        if (captureResult.success) {
          updateData.status = 'Ready to Fulfill';
          updateData.capturedAt = new Date();
        } else {
          return { success: false, error: `Payment capture failed: ${captureResult.error}` };
        }
      }

      // Update order
      await db.update(orders).set(updateData).where(eq(orders.id, orderId));

      // Sync to Zoho if deal exists
      if (order.zohoDealId) {
        try {
          await zohoService.updateDealStage(order.zohoDealId, updateData.status || order.status);
        } catch (zohoError) {
          console.error('Zoho sync failed (non-blocking):', zohoError);
        }
      }

      return { success: true };

    } catch (error: any) {
      console.error('FFL verification error:', error);
      return { success: false, error: `FFL verification failed: ${error.message}` };
    }
  }

  /**
   * Override hold (admin only)
   */
  async overrideHold(
    orderId: number,
    reason: string,
    adminUserId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await db.query.orders.findFirst({
        where: (orders, { eq }) => eq(orders.id, orderId),
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (!['Pending FFL', 'Hold – Multi-Firearm'].includes(order.status)) {
        return { success: false, error: 'Order is not in a hold status' };
      }

      let captureResult = null;
      
      // If there's an auth transaction, capture it
      if (order.authTransactionId) {
        captureResult = await authorizeNetService.capturePriorAuthTransaction(
          order.authTransactionId,
          parseFloat(order.totalPrice)
        );

        if (!captureResult.success) {
          return { success: false, error: `Payment capture failed: ${captureResult.error}` };
        }
      }

      // Update order status
      await db.update(orders).set({
        status: 'Ready to Fulfill',
        holdReason: null,
        capturedAt: new Date(),
      }).where(eq(orders.id, orderId));

      // TODO: Add audit log entry
      console.log(`Admin override: Order ${orderId} hold removed by user ${adminUserId}. Reason: ${reason}`);

      // Sync to Zoho
      if (order.zohoDealId) {
        try {
          await zohoService.updateDealStage(order.zohoDealId, 'Ready to Fulfill');
        } catch (zohoError) {
          console.error('Zoho sync failed (non-blocking):', zohoError);
        }
      }

      return { success: true };

    } catch (error: any) {
      console.error('Hold override error:', error);
      return { success: false, error: `Hold override failed: ${error.message}` };
    }
  }

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TGF-${timestamp}-${random}`;
  }
}

// Export singleton instance
export const firearmsCheckoutService = new FirearmsCheckoutService();