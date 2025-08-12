import { Router } from 'express';
import { firearmsComplianceService } from '../firearms-compliance-service';
import { firearmsCheckoutService } from '../firearms-checkout-service';
import { authorizeNetService } from '../authorize-net-service';
import { db } from '../db';
import { orders, firearmsComplianceSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Get current firearms compliance configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = await firearmsComplianceService.getComplianceConfig();
    res.json({
      success: true,
      config
    });
  } catch (error: any) {
    console.error('Error getting compliance config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update compliance configuration (admin only)
 */
router.put('/config', async (req, res) => {
  try {
    // TODO: Add admin authentication check
    
    const { 
      policyFirearmWindowDays,
      policyFirearmLimit,
      featureMultiFirearmHold,
      featureFflHold 
    } = req.body;

    await firearmsComplianceService.updateComplianceConfig({
      policyFirearmWindowDays,
      policyFirearmLimit,
      featureMultiFirearmHold,
      featureFflHold,
    }, 1); // TODO: Get actual admin user ID

    res.json({
      success: true,
      message: 'Compliance configuration updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating compliance config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Check compliance for a given cart
 */
router.post('/check', async (req, res) => {
  try {
    const { userId, cartItems } = req.body;

    if (!userId || !cartItems) {
      return res.status(400).json({
        success: false,
        error: 'userId and cartItems are required'
      });
    }

    const complianceResult = await firearmsComplianceService.performComplianceCheck(
      userId,
      cartItems
    );

    res.json({
      success: true,
      complianceResult
    });
  } catch (error: any) {
    console.error('Error checking compliance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Process firearms-aware checkout
 */
router.post('/checkout', async (req, res) => {
  try {
    const checkoutResult = await firearmsCheckoutService.processCheckout(req.body);
    
    if (checkoutResult.success) {
      res.json({
        success: true,
        order: {
          id: checkoutResult.orderId,
          orderNumber: checkoutResult.orderNumber,
          status: checkoutResult.status,
          hold: checkoutResult.hold,
          dealId: checkoutResult.dealId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: checkoutResult.error
      });
    }
  } catch (error: any) {
    console.error('Error processing checkout:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Attach FFL to order (staff action)
 */
router.post('/orders/:orderId/ffl/attach', async (req, res) => {
  try {
    // TODO: Add staff authentication check
    
    const { orderId } = req.params;
    const { fflDealerId } = req.body;

    if (!fflDealerId) {
      return res.status(400).json({
        success: false,
        error: 'fflDealerId is required'
      });
    }

    const result = await firearmsCheckoutService.attachAndVerifyFFL(
      parseInt(orderId),
      fflDealerId,
      false // Don't verify yet
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'FFL attached successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('Error attaching FFL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Verify FFL and capture payment (staff action)
 */
router.post('/orders/:orderId/ffl/verify', async (req, res) => {
  try {
    // TODO: Add staff authentication check
    
    const { orderId } = req.params;
    const { fflDealerId } = req.body;

    if (!fflDealerId) {
      return res.status(400).json({
        success: false,
        error: 'fflDealerId is required'
      });
    }

    const result = await firearmsCheckoutService.attachAndVerifyFFL(
      parseInt(orderId),
      fflDealerId,
      true // Verify and capture
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'FFL verified and payment captured successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('Error verifying FFL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Override compliance hold (admin only)
 */
router.post('/orders/:orderId/override', async (req, res) => {
  try {
    // TODO: Add admin authentication check
    
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Override reason is required'
      });
    }

    const result = await firearmsCheckoutService.overrideHold(
      parseInt(orderId),
      reason,
      1 // TODO: Get actual admin user ID
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Hold override successful'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error('Error overriding hold:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get orders with compliance information
 */
router.get('/orders', async (req, res) => {
  try {
    const { status, holdType, limit = 50 } = req.query;
    
    let whereClause = eq(orders.id, orders.id); // Base condition

    if (status) {
      whereClause = eq(orders.status, status as string);
    }

    if (holdType) {
      whereClause = eq(orders.holdReason, holdType as string);
    }

    const ordersWithCompliance = await db.query.orders.findMany({
      where: whereClause,
      limit: parseInt(limit as string),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      with: {
        orderLines: {
          with: {
            product: true
          }
        }
      }
    });

    res.json({
      success: true,
      orders: ordersWithCompliance
    });
  } catch (error: any) {
    console.error('Error getting compliance orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Void authorization transaction (admin action)
 */
router.post('/orders/:orderId/void', async (req, res) => {
  try {
    // TODO: Add admin authentication check
    
    const { orderId } = req.params;
    
    const order = await db.query.orders.findFirst({
      where: (orders, { eq }) => eq(orders.id, parseInt(orderId))
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (!order.authTransactionId) {
      return res.status(400).json({
        success: false,
        error: 'No auth transaction to void'
      });
    }

    const voidResult = await authorizeNetService.voidTransaction(order.authTransactionId);
    
    if (voidResult.success) {
      // Update order status
      await db.update(orders).set({
        status: 'Canceled',
        holdReason: null,
      }).where(eq(orders.id, parseInt(orderId)));

      res.json({
        success: true,
        message: 'Transaction voided successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Void failed: ${voidResult.error}`
      });
    }
  } catch (error: any) {
    console.error('Error voiding transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;