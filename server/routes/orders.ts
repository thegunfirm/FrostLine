/**
 * Orders API Router
 * Implements POST /api/orders/finalize and GET /api/orders/:orderId/summary endpoints
 */

import { Router } from 'express';
import { taxService } from '../lib/taxService';
import { deriveOutcomes, type OrderLine } from '../lib/shippingOutcomes';
import { toSummary, type OrderDocument, type OrderSummaryResponse } from '../lib/formatOrderSummary';
import { ordersStore } from '../lib/ordersStore';
// axios import removed - no longer needed

const router = Router();

interface FinalizeOrderRequest {
  cartId: string;
  paymentId: string;
  idempotencyKey: string;
  transactionId?: string;
  shipTo: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
  };
  lines: Array<{
    sku: string;
    qty: number;
    regulated: boolean;
    fulfillment: 'IH' | 'DS';
  }>;
  fflId?: string;
}

/**
 * Generate TGF order number using simple sequential approach
 * This is a simplified implementation - in production, this should use
 * atomic database sequences or similar for proper sequential numbering
 */
function generateOrderNumber(paths: unknown): string {
  const arr = Array.isArray(paths) ? paths : [];
  const sequence = Math.floor(Date.now() / 1000);
  const suffix = arr.length <= 1 ? '0' : 'Z';
  return `${sequence}-${suffix}`;
}

/**
 * Get product pricing by SKU
 * TODO: Implement proper pricing lookup from existing system
 */
async function getProductPrice(sku: string): Promise<number> {
  // Placeholder - in real implementation, look up pricing from products table
  // using existing pricing rules and tier-based discounts
  return 0; // This should be replaced with actual pricing lookup
}

/**
 * Calculate line item totals
 */
async function calculateItemsTotal(lines: OrderLine[]): Promise<number> {
  let total = 0;
  
  for (const line of lines) {
    const price = await getProductPrice(line.sku);
    total += price * line.qty;
  }
  
  return total;
}

/**
 * POST /api/orders/finalize
 * Atomically finalize an order after successful payment
 */
router.post('/finalize', async (req, res) => {
  try {
    const {
      cartId,
      paymentId,
      idempotencyKey,
      transactionId,
      shipTo,
      lines,
      fflId
    } = req.body as FinalizeOrderRequest;

    // Validate required fields
    if (!cartId || !paymentId || !idempotencyKey || !shipTo || !lines || lines.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['cartId', 'paymentId', 'idempotencyKey', 'shipTo', 'lines']
      });
    }

    // Check for existing order (idempotency)
    const existingOrder = ordersStore.findByPaymentOrKey(paymentId, idempotencyKey);
    if (existingOrder) {
      const summary = toSummary(existingOrder);
      return res.status(200).json({
        ...summary,
        _idempotentHit: true
      });
    }

    // Enforce No-CA restriction
    if (shipTo.state === 'CA') {
      return res.status(422).json({
        code: 'NO_SHIP_CA',
        message: 'We do not ship orders to CA.'
      });
    }

    // Calculate totals
    const itemsTotal = await calculateItemsTotal(lines);
    const shippingTotal = 0; // Placeholder
    
    let taxTotal = 0;
    try {
      taxTotal = taxService.calculate({
        shipTo,
        lines,
        items: itemsTotal,
        shipping: shippingTotal
      });
    } catch (error: any) {
      if (error.code === 'NO_SHIP_CA') {
        return res.status(422).json(error);
      }
      throw error;
    }
    
    const grandTotal = itemsTotal + shippingTotal + taxTotal;

    // Determine shipping outcomes
    const outcomes = deriveOutcomes(lines);
    const uniqueOutcomes = outcomes.uniqueOutcomes;
    
    // Convert outcomes to fulfillment paths for order numbering
    const fulfillmentPaths = uniqueOutcomes.map(outcome => {
      switch (outcome) {
        case 'DS>FFL': return 'DS_FFL';
        case 'DS>Customer': return 'DS_CUSTOMER'; 
        case 'IH>FFL': return 'IH_FFL';
        case 'IH>Customer': return 'IH_CUSTOMER';
        default: return 'DS_CUSTOMER';
      }
    });

    // Generate base order number
    console.debug('Order numbering', { fulfillmentPaths, uniqueOutcomes });
    const fullOrderNumber = generateOrderNumber(fulfillmentPaths ?? []);
    if (typeof fullOrderNumber !== 'string' || !fullOrderNumber) {
      throw new Error('Order number generation failed');
    }
    const baseNumber = fullOrderNumber.includes('-') ? fullOrderNumber.split('-')[0] : fullOrderNumber;
    console.debug('Generated order number', { fullOrderNumber, baseNumber });

    // Prepare shipments with FFL info where needed
    const shipments = Object.values(outcomes.buckets).map(bucket => ({
      outcome: bucket.outcome,
      lines: bucket.lines.map(line => ({
        sku: line.sku,
        qty: line.qty
      })),
      ...(bucket.outcome.endsWith('>FFL') && fflId ? { ffl: { id: fflId } } : {})
    }));

    // Create order document
    const orderDoc: Omit<OrderDocument, 'orderId'> = {
      baseNumber,
      paymentId,
      idempotencyKey,
      transactionId: transactionId ?? null,
      totals: {
        items: itemsTotal,
        shipping: shippingTotal,
        tax: taxTotal,
        grand: grandTotal
      },
      shipments,
      createdAt: new Date(),
      customer: {
        email: null, // TODO: Wire in when accounts are integrated
        customerId: null
      }
    };

    // Store the order
    const savedOrder = ordersStore.create(orderDoc);

    // Return formatted summary
    const summary = toSummary(savedOrder);
    res.status(201).json(summary);

  } catch (error) {
    console.error('Error finalizing order:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Failed to finalize order'
    });
  }
});

/**
 * GET /api/orders/:orderId/summary
 * Read-only endpoint for the customer Order Summary page
 */
router.get('/:orderId/summary', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        error: 'Order ID is required'
      });
    }

    // Find order by ID
    const orderDoc = ordersStore.findById(orderId);
    
    if (!orderDoc) {
      return res.status(404).json({
        error: 'Order not found',
        orderId
      });
    }

    // Return formatted summary
    const summary = toSummary(orderDoc);
    res.json(summary);

  } catch (error) {
    console.error('Error getting order summary:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Failed to get order summary'
    });
  }
});

export default router;