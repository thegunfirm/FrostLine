import sgMail from '@sendgrid/mail';

export interface DunningEmailData {
  customerEmail: string;
  customerName: string;
  subscriptionTier: string;
  amount: string;
  billingUpdateUrl: string;
  dayNumber: number;
}

export class DunningEmailService {
  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  /**
   * Send dunning email based on day number
   */
  async sendDunningEmail(emailData: DunningEmailData): Promise<{ success: boolean; messageId?: string }> {
    try {
      let emailContent;
      
      switch (emailData.dayNumber) {
        case 1:
          emailContent = this.getDayOneEmail(emailData);
          break;
        case 3:
          emailContent = this.getDayThreeEmail(emailData);
          break;
        case 7:
          emailContent = this.getDaySevenEmail(emailData);
          break;
        default:
          throw new Error(`Invalid day number for dunning email: ${emailData.dayNumber}`);
      }

      const msg = {
        to: emailData.customerEmail,
        from: {
          email: 'support@thegunfirm.com',
          name: 'The Gun Firm Support'
        },
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      };

      const response = await sgMail.send(msg);
      const messageId = response[0]?.headers?.['x-message-id'] || `sg_${Date.now()}`;
      
      console.log(`Dunning email #${emailData.dayNumber} sent successfully to ${emailData.customerEmail}`);
      return { success: true, messageId };
      
    } catch (error) {
      console.error('Error sending dunning email:', error);
      return { success: false };
    }
  }

  /**
   * Day 1 - Initial payment failure notification
   */
  private getDayOneEmail(data: DunningEmailData) {
    const subject = `Payment Issue - Action Required for Your ${data.subscriptionTier} Membership`;
    
    const text = `
Hi ${data.customerName},

We encountered an issue processing your payment for your ${data.subscriptionTier} membership ($${data.amount}).

To continue enjoying your FAP membership benefits and access to TheGunFirm.com checkout, please update your payment information:

Update Payment Method: ${data.billingUpdateUrl}

What happens when you update:
• Secure page hosted by Authorize.Net (we don't store card numbers)
• Your membership will be reactivated immediately
• No interruption to your TheGunFirm access

Questions? Reply to this email or contact our support team.

Best regards,
The Gun Firm Support Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Issue - Action Required</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Payment Issue - Action Required</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your ${data.subscriptionTier} Membership</p>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hi ${data.customerName},</p>
        
        <p>We encountered an issue processing your payment for your <strong>${data.subscriptionTier} membership</strong> ($${data.amount}).</p>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #e53e3e;">
            <p style="margin: 0;"><strong>Action Required:</strong> Please update your payment information to continue your membership.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${data.billingUpdateUrl}" 
               style="background: #e53e3e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Update Payment Method
            </a>
        </div>
        
        <div style="background: #edf2f7; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #2d3748;">What happens when you update:</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li>Secure page hosted by Authorize.Net (we don't store card numbers)</li>
                <li>Your membership will be reactivated immediately</li>
                <li>No interruption to your TheGunFirm access</li>
            </ul>
        </div>
        
        <p style="margin-top: 30px;">Questions? Reply to this email or contact our support team.</p>
        
        <p>Best regards,<br>
        <strong>The Gun Firm Support Team</strong></p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #718096; font-size: 14px;">
        <p>© 2025 The Gun Firm. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim();

    return { subject, text, html };
  }

  /**
   * Day 3 - Second reminder
   */
  private getDayThreeEmail(data: DunningEmailData) {
    const subject = `Reminder: Update Payment for ${data.subscriptionTier} Membership`;
    
    const text = `
Hi ${data.customerName},

This is a friendly reminder that we still need to resolve the payment issue for your ${data.subscriptionTier} membership ($${data.amount}).

Your FAP membership benefits are currently suspended. To restore access:

Update Payment Method: ${data.billingUpdateUrl}

Don't lose access to:
• TheGunFirm.com checkout privileges
• Member-exclusive discounts
• Priority customer support

Update your payment information now to avoid any interruption.

Best regards,
The Gun Firm Support Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #d69e2e 0%, #ed8936 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Payment Reminder</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.subscriptionTier} Membership</p>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hi ${data.customerName},</p>
        
        <p>This is a friendly reminder that we still need to resolve the payment issue for your <strong>${data.subscriptionTier} membership</strong> ($${data.amount}).</p>
        
        <div style="background: #fef5e7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #d69e2e;">
            <p style="margin: 0;"><strong>Membership Suspended:</strong> Your FAP benefits are currently on hold.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${data.billingUpdateUrl}" 
               style="background: #d69e2e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Update Payment Method Now
            </a>
        </div>
        
        <div style="background: #edf2f7; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #2d3748;">Don't lose access to:</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li>TheGunFirm.com checkout privileges</li>
                <li>Member-exclusive discounts</li>
                <li>Priority customer support</li>
            </ul>
        </div>
        
        <p>Update your payment information now to avoid any interruption.</p>
        
        <p>Best regards,<br>
        <strong>The Gun Firm Support Team</strong></p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #718096; font-size: 14px;">
        <p>© 2025 The Gun Firm. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim();

    return { subject, text, html };
  }

  /**
   * Day 7 - Final notice
   */
  private getDaySevenEmail(data: DunningEmailData) {
    const subject = `Final Notice: ${data.subscriptionTier} Membership Will Be Cancelled`;
    
    const text = `
Hi ${data.customerName},

This is your final notice regarding the payment issue for your ${data.subscriptionTier} membership ($${data.amount}).

IMPORTANT: If payment is not updated within 24 hours, your membership will be cancelled and you will lose access to all FAP benefits including TheGunFirm.com checkout.

Take action now: ${data.billingUpdateUrl}

What you'll lose if cancelled:
• All TheGunFirm.com access
• Member pricing and discounts
• Priority support
• Exclusive member benefits

Don't let your membership expire - update your payment method today.

Best regards,
The Gun Firm Support Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Final Notice - Membership Cancellation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #c53030 0%, #e53e3e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ Final Notice</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Membership Cancellation Pending</p>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hi ${data.customerName},</p>
        
        <p>This is your <strong>final notice</strong> regarding the payment issue for your <strong>${data.subscriptionTier} membership</strong> ($${data.amount}).</p>
        
        <div style="background: #fed7d7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #c53030;">
            <p style="margin: 0; font-weight: bold;">IMPORTANT: If payment is not updated within 24 hours, your membership will be cancelled.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${data.billingUpdateUrl}" 
               style="background: #c53030; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 18px;">
                Update Payment Now - Don't Lose Access
            </a>
        </div>
        
        <div style="background: #feebc8; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #d69e2e;">
            <h3 style="margin: 0 0 10px 0; color: #2d3748;">What you'll lose if cancelled:</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li><strong>All TheGunFirm.com access</strong></li>
                <li>Member pricing and discounts</li>
                <li>Priority support</li>
                <li>Exclusive member benefits</li>
            </ul>
        </div>
        
        <p style="font-size: 16px; font-weight: bold; color: #c53030;">Don't let your membership expire - update your payment method today.</p>
        
        <p>Best regards,<br>
        <strong>The Gun Firm Support Team</strong></p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #718096; font-size: 14px;">
        <p>© 2025 The Gun Firm. All rights reserved.</p>
    </div>
</body>
</html>
    `.trim();

    return { subject, text, html };
  }
}