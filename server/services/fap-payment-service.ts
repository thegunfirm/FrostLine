/**
 * FAP Payment Service
 * Handles subscription payments for FreeAmericanPeople.com membership tiers
 */

import { authorizeNetService } from '../authorize-net-service';

interface SubscriptionPaymentData {
  amount: number;
  customerEmail: string;
  customerName: string;
  subscriptionTier: string;
  billingCycle: 'monthly' | 'yearly';
  zohoContactId: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  error?: string;
}

export class FAPPaymentService {
  
  /**
   * Valid subscription tiers
   */
  private static readonly VALID_TIERS = ['Bronze', 'Gold', 'Platinum Monthly', 'Platinum Annual', 'Platinum Founder'];
  
  /**
   * Tier pricing structure
   */
  private static readonly TIER_PRICING = {
    Bronze: { monthly: 0.00, yearly: 0.00 },
    Gold: { monthly: 5.00, yearly: 50.00 },
    'Platinum Monthly': { monthly: 10.00, yearly: 120.00 },
    'Platinum Annual': { monthly: 8.25, yearly: 99.00 }, // Not in use yet
    'Platinum Founder': { monthly: 4.17, yearly: 50.00 } // Temporary, lifetime price lock
  };

  /**
   * Validate subscription tier
   */
  public isValidSubscriptionTier(tier: string): boolean {
    return FAPPaymentService.VALID_TIERS.includes(tier);
  }

  /**
   * Get pricing for tier and billing cycle
   */
  public getTierPricing(tier: string, billingCycle: 'monthly' | 'yearly'): number | null {
    const pricing = FAPPaymentService.TIER_PRICING[tier as keyof typeof FAPPaymentService.TIER_PRICING];
    return pricing ? pricing[billingCycle] : null;
  }

  /**
   * Process subscription payment through Authorize.Net
   */
  public async processSubscriptionPayment(paymentData: SubscriptionPaymentData): Promise<PaymentResult> {
    try {
      console.log('🎯 Processing subscription payment:', {
        tier: paymentData.subscriptionTier,
        cycle: paymentData.billingCycle,
        amount: paymentData.amount,
        customer: paymentData.customerEmail
      });

      // Validate tier and amount
      const expectedAmount = this.getTierPricing(paymentData.subscriptionTier, paymentData.billingCycle);
      if (expectedAmount === null) {
        return {
          success: false,
          error: `Invalid subscription tier: ${paymentData.subscriptionTier}`
        };
      }
      
      if (Math.abs(expectedAmount - paymentData.amount) > 0.01) {
        return {
          success: false,
          error: `Invalid amount $${paymentData.amount} for ${paymentData.subscriptionTier} ${paymentData.billingCycle} subscription. Expected: $${expectedAmount}`
        };
      }

      // Handle free Bronze tier - no payment required
      if (paymentData.subscriptionTier === 'Bronze' && expectedAmount === 0) {
        console.log('✨ Free Bronze tier subscription - no payment required');
        return {
          success: true,
          transactionId: `free_${Date.now()}`,
          authCode: `bronze_free`,
          subscriptionTier: 'Bronze',
          amount: 0
        };
      }

      // For testing purposes, we'll simulate a successful payment
      // In production, this would use actual Authorize.Net integration
      if (process.env.NODE_ENV === 'development' || !process.env.AUTHORIZE_NET_API_LOGIN_ID) {
        console.log('🧪 Development mode: simulating subscription payment success');
        
        return {
          success: true,
          transactionId: `sim_${Date.now()}`,
          authCode: `sim_${Math.random().toString(36).substring(2, 8)}`
        };
      }

      // Production Authorize.Net integration would go here
      // This is a placeholder for the actual payment processing
      const result = await authorizeNetService.authCaptureTransaction(
        paymentData.amount,
        '4111111111111111', // This would come from frontend payment form
        '1225',
        '123',
        {
          id: paymentData.zohoContactId,
          firstName: paymentData.customerName.split(' ')[0] || '',
          lastName: paymentData.customerName.split(' ')[1] || '',
          email: paymentData.customerEmail,
          phone: '',
          address: {
            firstName: paymentData.customerName.split(' ')[0] || '',
            lastName: paymentData.customerName.split(' ')[1] || '',
            address1: '123 Test St', // This would come from payment form
            city: 'Austin',
            state: 'TX',
            zip: '78701'
          }
        }
      );

      return result;

    } catch (error: any) {
      console.error('FAP payment processing error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  }

  /**
   * Create recurring subscription (for future implementation)
   */
  public async createRecurringSubscription(paymentData: SubscriptionPaymentData): Promise<PaymentResult> {
    try {
      // This would integrate with Authorize.Net's ARB (Automatic Recurring Billing)
      // For now, return a simulated result
      
      console.log('🔄 Creating recurring subscription:', paymentData.subscriptionTier);
      
      if (process.env.NODE_ENV === 'development' || !process.env.AUTHORIZE_NET_API_LOGIN_ID) {
        return {
          success: true,
          transactionId: `sub_${Date.now()}`,
          authCode: `rec_${Math.random().toString(36).substring(2, 8)}`
        };
      }

      // Production recurring billing implementation would go here
      throw new Error('Recurring subscriptions not yet implemented for production');
      
    } catch (error: any) {
      console.error('Recurring subscription error:', error);
      return {
        success: false,
        error: error.message || 'Recurring subscription creation failed'
      };
    }
  }

  /**
   * Get available subscription tiers
   */
  public getAvailableTiers() {
    return FAPPaymentService.VALID_TIERS.map(tier => ({
      name: tier,
      pricing: FAPPaymentService.TIER_PRICING[tier as keyof typeof FAPPaymentService.TIER_PRICING]
    }));
  }
}

// Export singleton instance
export const fapPaymentService = new FAPPaymentService();