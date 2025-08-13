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
  subscriptionTier?: string;
  amount?: number;
}

export class FAPPaymentService {
  
  /**
   * Valid subscription tiers
   */
  private static readonly VALID_TIERS = ['Bronze', 'Gold', 'Platinum Monthly', 'Platinum Annual', 'Platinum Founder'];
  
  /**
   * Tier pricing structure - EXACT USER SPECIFIED PRICING
   */
  private static readonly TIER_PRICING = {
    Bronze: { monthly: 0.00, yearly: 0.00 }, // Free
    Gold: { monthly: 5.00, yearly: 50.00 }, // Gold Monthly $5, Gold Annually $50
    'Platinum Monthly': { monthly: 10.00, yearly: null }, // Platinum Monthly $10 (monthly only)
    'Platinum Annual': { monthly: null, yearly: 99.00 }, // Regular, in the future, not in use right now
    'Platinum Founder': { monthly: null, yearly: 50.00 } // Temporary, billed annually, lifetime price lock
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
    if (!pricing) return null;
    
    const price = pricing[billingCycle];
    return price !== null ? price : null;
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
            street: '123 Test St', // This would come from payment form
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
   * Get available subscription tiers - EXACT USER SPECIFIED PRICING
   */
  public getAvailableTiers() {
    return [
      {
        name: 'Bronze',
        monthlyPrice: 0,
        yearlyPrice: 0,
        benefits: ['Free tier access', 'Basic product access', 'Community support']
      },
      {
        name: 'Gold',
        monthlyPrice: 5.00,
        yearlyPrice: 50.00,
        benefits: ['5% discount on products', 'Priority support', 'Exclusive deals']
      },
      {
        name: 'Platinum Monthly',
        monthlyPrice: 10.00,
        yearlyPrice: null, // Monthly only
        benefits: ['10% discount on products', 'VIP support', 'Early access to new products', 'Premium customer service']
      },
      {
        name: 'Platinum Annual',
        monthlyPrice: null, // Not in use right now
        yearlyPrice: 99.00,
        benefits: ['Future tier benefits', 'Annual billing discount']
      },
      {
        name: 'Platinum Founder',
        monthlyPrice: null, // Billed annually only
        yearlyPrice: 50.00,
        benefits: ['15% discount on products (LIFETIME)', 'VIP support', 'Early access to new products', 'Premium customer service', 'Founder member badge', 'Lifetime price lock']
      }
    ];
  }
}

// Export singleton instance
export const fapPaymentService = new FAPPaymentService();