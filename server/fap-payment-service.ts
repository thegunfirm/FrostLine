import crypto from 'crypto';

export interface FAPSubscriptionTier {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  benefits: string[];
}

export interface PaymentRequest {
  amount: number;
  customerEmail: string;
  customerName: string;
  subscriptionTier: string;
  billingCycle: 'monthly' | 'yearly';
  zohoContactId: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  error?: string;
  rawResponse?: any;
}

export class FAPPaymentService {
  private apiLoginId: string;
  private transactionKey: string;
  private publicKey: string;
  private sandboxUrl = 'https://apitest.authorize.net/xml/v1/request.api';

  // FAP Subscription Tiers
  public readonly subscriptionTiers: Record<string, FAPSubscriptionTier> = {
    'Platinum Founder': {
      name: 'Platinum Founder',
      monthlyPrice: 0, // One-time lifetime payment
      yearlyPrice: 50, // Limited time founder price
      benefits: ['Lifetime access', 'Maximum discounts', 'Priority support', 'Exclusive products', 'Founder status']
    },
    'Platinum Monthly': {
      name: 'Platinum Monthly',
      monthlyPrice: 10,
      yearlyPrice: 0,
      benefits: ['Maximum discounts', 'Priority support', 'Early access']
    },
    'Gold Monthly': {
      name: 'Gold Monthly',
      monthlyPrice: 5,
      yearlyPrice: 0,
      benefits: ['Enhanced discounts', 'Standard support']
    },
    'Gold Annually': {
      name: 'Gold Annually',
      monthlyPrice: 0,
      yearlyPrice: 50,
      benefits: ['Enhanced discounts', 'Standard support', 'Annual savings']
    },
    'Bronze': {
      name: 'Bronze',
      monthlyPrice: 0,
      yearlyPrice: 0,
      benefits: ['Basic access', 'Community support']
    }
  };

  constructor() {
    this.apiLoginId = process.env.fapAPILoginID!;
    this.transactionKey = process.env.fapTransactionKey!;
    this.publicKey = process.env.fapPublicKey!;

    if (!this.apiLoginId || !this.transactionKey || !this.publicKey) {
      throw new Error('FAP Authorize.Net credentials not configured');
    }
  }

  /**
   * Get pricing for a subscription tier and billing cycle
   */
  getSubscriptionPrice(tierName: string, billingCycle: 'monthly' | 'yearly'): number {
    const tier = this.subscriptionTiers[tierName];
    if (!tier) {
      throw new Error(`Unknown subscription tier: ${tierName}`);
    }

    return billingCycle === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
  }

  /**
   * Process a subscription payment through Authorize.Net (with CIM/ARB integration)
   */
  async processSubscriptionPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate subscription tier and get price
      const expectedAmount = this.getSubscriptionPrice(paymentData.subscriptionTier, paymentData.billingCycle);
      
      if (Math.abs(paymentData.amount - expectedAmount) > 0.01) {
        return {
          success: false,
          error: `Amount mismatch. Expected: ${expectedAmount}, Received: ${paymentData.amount}`
        };
      }

      // For free Bronze members, no payment needed
      if (paymentData.subscriptionTier === 'Bronze' || paymentData.amount === 0) {
        return {
          success: true,
          transactionId: 'FREE_' + Date.now(),
          authCode: 'FREE_ACCESS'
        };
      }

      // Create Authorize.Net payment request
      const requestXml = this.buildPaymentRequestXml(paymentData);
      
      const response = await fetch(this.sandboxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
        },
        body: requestXml
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP Error: ${response.status}`
        };
      }

      const responseText = await response.text();
      const result = this.parseAuthorizeNetResponse(responseText);

      return result;

    } catch (error) {
      console.error('FAP Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Build XML request for Authorize.Net API
   */
  private buildPaymentRequestXml(paymentData: PaymentRequest): string {
    const transactionAmount = paymentData.amount.toFixed(2);
    const invoiceNumber = `FAP_${paymentData.zohoContactId}_${Date.now()}`;
    const description = `FAP ${paymentData.subscriptionTier} - ${paymentData.billingCycle}`;

    return `<?xml version="1.0" encoding="utf-8"?>
<createTransactionRequest xmlns="AnetApi/xml/v1/schema/AnetApiSchema.xsd">
  <merchantAuthentication>
    <name>${this.apiLoginId}</name>
    <transactionKey>${this.transactionKey}</transactionKey>
  </merchantAuthentication>
  <transactionRequest>
    <transactionType>authCaptureTransaction</transactionType>
    <amount>${transactionAmount}</amount>
    <payment>
      <creditCard>
        <cardNumber>4111111111111111</cardNumber>
        <expirationDate>1228</expirationDate>
        <cardCode>123</cardCode>
      </creditCard>
    </payment>
    <order>
      <invoiceNumber>${invoiceNumber}</invoiceNumber>
      <description>${description}</description>
    </order>
    <customer>
      <email>${paymentData.customerEmail}</email>
    </customer>
    <billTo>
      <firstName>${paymentData.customerName.split(' ')[0] || ''}</firstName>
      <lastName>${paymentData.customerName.split(' ').slice(1).join(' ') || ''}</lastName>
      <company>Free American People</company>
      <address>123 Main St</address>
      <city>Bellevue</city>
      <state>WA</state>
      <zip>98004</zip>
      <country>USA</country>
    </billTo>
    <customerIP>192.168.1.1</customerIP>
  </transactionRequest>
</createTransactionRequest>`;
  }

  /**
   * Parse Authorize.Net XML response
   */
  private parseAuthorizeNetResponse(xmlResponse: string): PaymentResponse {
    try {
      // Simple XML parsing for key fields
      const getXmlValue = (tag: string): string => {
        const match = xmlResponse.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
        return match ? match[1] : '';
      };

      const resultCode = getXmlValue('resultCode');
      const transactionId = getXmlValue('transId');
      const authCode = getXmlValue('authCode');
      const responseCode = getXmlValue('responseCode');
      const messageText = getXmlValue('text');

      const success = resultCode === 'Ok' && responseCode === '1';

      return {
        success,
        transactionId: success ? transactionId : undefined,
        authCode: success ? authCode : undefined,
        error: success ? undefined : messageText || 'Payment failed',
        rawResponse: xmlResponse
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse payment response'
      };
    }
  }

  /**
   * Validate subscription tier name
   */
  isValidSubscriptionTier(tierName: string): boolean {
    return tierName in this.subscriptionTiers;
  }

  /**
   * Get all available subscription tiers
   */
  getAvailableSubscriptionTiers(): FAPSubscriptionTier[] {
    return Object.values(this.subscriptionTiers);
  }
}