import crypto from 'crypto';
import { ZohoService } from './zoho-service';

export interface AuthorizeNetConfig {
  apiLoginId: string;
  transactionKey: string;
  signatureKey: string;
  environment: 'sandbox' | 'production';
}

export interface CustomerProfile {
  customerProfileId: string;
  paymentProfileId?: string;
  subscriptionId?: string;
  membershipStatus: 'Active' | 'Past Due' | 'Canceled' | 'Suspended';
  lastFailureAt?: Date;
  lastFailureReason?: string;
}

export interface WebhookEvent {
  eventType: string;
  eventDate: string;
  webhookId: string;
  payload: any;
}

export class AuthorizeNetService {
  private config: AuthorizeNetConfig;
  private apiUrl: string;
  private acceptUrl: string;
  private zohoService: ZohoService;

  constructor() {
    this.config = {
      apiLoginId: process.env.ANET_API_LOGIN_ID!,
      transactionKey: process.env.ANET_TRANSACTION_KEY!,
      signatureKey: process.env.ANET_SIGNATURE_KEY!,
      environment: (process.env.ANET_ENV as 'sandbox' | 'production') || 'sandbox'
    };

    this.apiUrl = this.config.environment === 'sandbox' 
      ? 'https://apitest.authorize.net/xml/v1/request.api'
      : 'https://api.authorize.net/xml/v1/request.api';

    this.acceptUrl = this.config.environment === 'sandbox'
      ? 'https://test.authorize.net/customer/manage'
      : 'https://accept.authorize.net/customer/manage';

    this.zohoService = new ZohoService();

    if (!this.config.apiLoginId || !this.config.transactionKey || !this.config.signatureKey) {
      throw new Error('Authorize.Net credentials not configured. Required: ANET_API_LOGIN_ID, ANET_TRANSACTION_KEY, ANET_SIGNATURE_KEY');
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA512
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha512', Buffer.from(this.config.signatureKey, 'hex'))
        .update(rawBody, 'utf8')
        .digest('hex')
        .toUpperCase();

      return signature.toUpperCase() === expectedSignature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Create Customer Information Manager (CIM) profile
   */
  async createCustomerProfile(contactId: string, email: string, description?: string): Promise<string> {
    const requestData = {
      createCustomerProfileRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        profile: {
          merchantCustomerId: contactId,
          description: description || `FAP Member ${contactId}`,
          email: email
        }
      }
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      
      if (result.messages?.resultCode === 'Ok') {
        return result.customerProfileId;
      } else {
        throw new Error(`Failed to create customer profile: ${result.messages?.message?.[0]?.text}`);
      }
    } catch (error) {
      console.error('Error creating customer profile:', error);
      throw error;
    }
  }

  /**
   * Get hosted profile page token for customer to manage payment methods
   */
  async getHostedProfileToken(customerProfileId: string): Promise<string> {
    const requestData = {
      getHostedProfilePageRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        customerProfileId: customerProfileId,
        hostedProfileSettings: {
          setting: [
            {
              settingName: 'hostedProfileReturnUrl',
              settingValue: `${process.env.FRONTEND_URL || 'https://thegunfirm.com'}/billing/success`
            },
            {
              settingName: 'hostedProfileReturnUrlText',
              settingValue: 'Return to FAP Membership'
            },
            {
              settingName: 'hostedProfilePageBorderVisible',
              settingValue: 'true'
            }
          ]
        }
      }
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      
      if (result.messages?.resultCode === 'Ok') {
        return result.token;
      } else {
        throw new Error(`Failed to get hosted profile token: ${result.messages?.message?.[0]?.text}`);
      }
    } catch (error) {
      console.error('Error getting hosted profile token:', error);
      throw error;
    }
  }

  /**
   * Create ARB subscription
   */
  async createSubscription(customerProfileId: string, paymentProfileId: string, amount: number, intervalLength: number = 1, intervalUnit: 'months' | 'days' = 'months'): Promise<string> {
    const requestData = {
      ARBCreateSubscriptionRequest: {
        merchantAuthentication: {
          name: this.config.apiLoginId,
          transactionKey: this.config.transactionKey
        },
        subscription: {
          name: 'FAP Membership Subscription',
          paymentSchedule: {
            interval: {
              length: intervalLength,
              unit: intervalUnit
            },
            startDate: new Date().toISOString().split('T')[0],
            totalOccurrences: 9999 // Ongoing subscription
          },
          amount: amount,
          profile: {
            customerProfileId: customerProfileId,
            customerPaymentProfileId: paymentProfileId
          }
        }
      }
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      
      if (result.messages?.resultCode === 'Ok') {
        return result.subscriptionId;
      } else {
        throw new Error(`Failed to create subscription: ${result.messages?.message?.[0]?.text}`);
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Update customer profile status in Zoho CRM
   */
  async updateCustomerProfileStatus(contactId: string, status: CustomerProfile['membershipStatus'], failureReason?: string): Promise<void> {
    try {
      const updateData: any = {
        Membership_Status: status,
        Last_Status_Update: new Date().toISOString()
      };

      if (failureReason) {
        updateData.Last_Failure_Reason = failureReason;
        updateData.Last_Failure_At = new Date().toISOString();
      }

      await this.zohoService.updateContact(contactId, updateData);
    } catch (error) {
      console.error('Error updating customer profile status:', error);
      throw error;
    }
  }

  /**
   * Handle subscription failed webhook
   */
  async handleSubscriptionFailed(payload: any): Promise<void> {
    console.log('Processing subscription failed webhook:', payload);
    
    try {
      const subscriptionId = payload.id;
      const customerProfileId = payload.profile?.customerProfileId;
      
      if (!customerProfileId) {
        console.error('No customer profile ID in webhook payload');
        return;
      }

      // Find contact by customer profile ID in Zoho
      const contact = await this.findContactByCustomerProfileId(customerProfileId);
      if (!contact) {
        console.error(`Contact not found for customer profile ID: ${customerProfileId}`);
        return;
      }

      // Update status to Past Due
      await this.updateCustomerProfileStatus(contact.id, 'Past Due', 'Payment failed');

      // Create Zoho task for dunning follow-up
      await this.createDunningTask(contact.id, subscriptionId, 'Day 0 - Payment Failed');

      // Queue dunning email #1
      await this.queueDunningEmail(contact.id, contact.Email, 1);

      console.log(`Subscription failed processing complete for contact ${contact.id}`);
    } catch (error) {
      console.error('Error handling subscription failed:', error);
      throw error;
    }
  }

  /**
   * Handle subscription suspended webhook
   */
  async handleSubscriptionSuspended(payload: any): Promise<void> {
    console.log('Processing subscription suspended webhook:', payload);
    
    try {
      const customerProfileId = payload.profile?.customerProfileId;
      
      if (!customerProfileId) {
        console.error('No customer profile ID in webhook payload');
        return;
      }

      const contact = await this.findContactByCustomerProfileId(customerProfileId);
      if (!contact) {
        console.error(`Contact not found for customer profile ID: ${customerProfileId}`);
        return;
      }

      // Update status to Suspended but ensure dunning continues
      await this.updateCustomerProfileStatus(contact.id, 'Suspended');

      console.log(`Subscription suspended processing complete for contact ${contact.id}`);
    } catch (error) {
      console.error('Error handling subscription suspended:', error);
      throw error;
    }
  }

  /**
   * Handle subscription updated webhook (payment successful)
   */
  async handleSubscriptionUpdated(payload: any): Promise<void> {
    console.log('Processing subscription updated webhook:', payload);
    
    try {
      const customerProfileId = payload.profile?.customerProfileId;
      
      if (!customerProfileId) {
        console.error('No customer profile ID in webhook payload');
        return;
      }

      const contact = await this.findContactByCustomerProfileId(customerProfileId);
      if (!contact) {
        console.error(`Contact not found for customer profile ID: ${customerProfileId}`);
        return;
      }

      // Update status to Active and clear failure info
      await this.updateCustomerProfileStatus(contact.id, 'Active');

      // Cancel any pending dunning tasks
      await this.cancelDunningTasks(contact.id);

      console.log(`Subscription updated processing complete for contact ${contact.id}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Find contact by customer profile ID
   */
  private async findContactByCustomerProfileId(customerProfileId: string): Promise<any> {
    try {
      // Search for contact with matching Anet_Customer_Profile_Id
      const searchCriteria = `(Anet_Customer_Profile_Id:equals:${customerProfileId})`;
      const response = await this.zohoService.makeAPIRequest(`Contacts/search?criteria=${encodeURIComponent(searchCriteria)}`);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error finding contact by customer profile ID:', error);
      return null;
    }
  }

  /**
   * Create dunning task in Zoho CRM
   */
  private async createDunningTask(contactId: string, subscriptionId: string, subject: string): Promise<void> {
    try {
      const taskData = {
        Subject: subject,
        Who_Id: contactId,
        Status: 'Not Started',
        Priority: 'High',
        Due_Date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        Description: `Subscription payment failed for subscription ${subscriptionId}. Follow up with customer regarding payment issue.`
      };

      await this.zohoService.makeAPIRequest('Tasks', 'POST', { data: [taskData] });
    } catch (error) {
      console.error('Error creating dunning task:', error);
      // Don't throw - this is supplementary functionality
    }
  }

  /**
   * Queue dunning email
   */
  private async queueDunningEmail(contactId: string, email: string, emailNumber: number): Promise<void> {
    try {
      const { DunningEmailService } = await import('./dunning-email-service');
      const emailService = new DunningEmailService();
      
      // Get contact details for personalization
      const contact = await this.zohoService.getContact(contactId);
      if (!contact) {
        console.error(`Contact not found for dunning email: ${contactId}`);
        return;
      }

      const customerName = `${contact.First_Name || ''} ${contact.Last_Name || ''}`.trim() || 'Valued Customer';
      const subscriptionTier = contact.Subscription_Tier || 'FAP';
      const amount = contact.Last_Payment_Amount || '0.00';
      
      // Generate billing update URL (temporary token will be generated when accessed)
      const billingUpdateUrl = `${process.env.FRONTEND_URL || 'https://thegunfirm.com'}/billing/update`;
      
      await emailService.sendDunningEmail({
        customerEmail: email,
        customerName,
        subscriptionTier,
        amount,
        billingUpdateUrl,
        dayNumber: emailNumber
      });
      
      console.log(`Dunning email #${emailNumber} sent successfully to ${email}`);
    } catch (error) {
      console.error('Error sending dunning email:', error);
      // Don't throw - this is supplementary functionality
    }
  }

  /**
   * Cancel pending dunning tasks
   */
  private async cancelDunningTasks(contactId: string): Promise<void> {
    try {
      // Search for open dunning tasks for this contact
      const searchCriteria = `(Who_Id:equals:${contactId})and(Status:equals:Not Started)`;
      const response = await this.zohoService.makeAPIRequest(`Tasks/search?criteria=${encodeURIComponent(searchCriteria)}`);
      
      if (response.data && response.data.length > 0) {
        // Cancel all open tasks
        const cancelPromises = response.data.map((task: any) => 
          this.zohoService.makeAPIRequest(`Tasks/${task.id}`, 'PUT', {
            data: [{ Status: 'Cancelled' }]
          })
        );
        
        await Promise.all(cancelPromises);
        console.log(`Cancelled ${response.data.length} dunning tasks for contact ${contactId}`);
      }
    } catch (error) {
      console.error('Error cancelling dunning tasks:', error);
      // Don't throw - this is supplementary functionality
    }
  }

  /**
   * Get billing update URL for customer
   */
  getBillingUpdateUrl(token: string): string {
    return `${this.acceptUrl}?token=${token}`;
  }
}