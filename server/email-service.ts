import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'noreply@thegunfirm.com';
const SITE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://thegunfirm.com' 
  : 'https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev';

/**
 * Send email verification message
 */
export async function sendVerificationEmail(
  email: string, 
  verificationToken: string, 
  firstName: string
): Promise<boolean> {
  try {
    const verificationUrl = `${SITE_URL}/verify-email?token=${verificationToken}`;
    
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: 'Verify Your Email - The Gun Firm',
      html: generateVerificationEmailHTML(firstName, verificationUrl),
      text: generateVerificationEmailText(firstName, verificationUrl)
    };

    await sgMail.send(msg);
    console.log('✅ Verification email sent to:', email);
    return true;

  } catch (error: any) {
    console.error('❌ Email sending failed:', error);
    if (error.response) {
      console.error('SendGrid error body:', error.response.body);
    }
    return false;
  }
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(
  email: string, 
  firstName: string,
  subscriptionTier: string = 'Bronze'
): Promise<boolean> {
  try {
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: 'Welcome to The Gun Firm - Your Account is Active',
      html: generateWelcomeEmailHTML(firstName, subscriptionTier),
      text: generateWelcomeEmailText(firstName, subscriptionTier)
    };

    await sgMail.send(msg);
    console.log('✅ Welcome email sent to:', email);
    return true;

  } catch (error: any) {
    console.error('❌ Welcome email failed:', error);
    return false;
  }
}

function generateVerificationEmailHTML(firstName: string, verificationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - The Gun Firm</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .content { background: #ffffff; padding: 40px; border: 1px solid #ddd; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #b91c1c; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 8px 8px; }
        .security-notice { background: #fef3cd; border: 1px solid #faebcd; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">The Gun Firm</div>
        <div>Premium Firearms & Accessories</div>
      </div>
      
      <div class="content">
        <h2>Welcome to The Gun Firm, ${firstName}!</h2>
        
        <p>Thank you for registering with The Gun Firm. To complete your account setup and start accessing our premium firearms and accessories, please verify your email address.</p>
        
        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        
        <div class="security-notice">
          <strong>Security Note:</strong> This verification link will expire in 24 hours. If you didn't create an account with The Gun Firm, please ignore this email.
        </div>
        
        <p>Once verified, you'll have access to:</p>
        <ul>
          <li>Tier-based pricing benefits</li>
          <li>Secure checkout and FFL transfer management</li>
          <li>Order tracking and history</li>
          <li>Exclusive member pricing and promotions</li>
        </ul>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        
        <p>Welcome to the family!</p>
        <p><strong>The Gun Firm Team</strong></p>
      </div>
      
      <div class="footer">
        <p>© 2025 The Gun Firm. All rights reserved.</p>
        <p>This email was sent to ${firstName} because you registered for an account.</p>
      </div>
    </body>
    </html>
  `;
}

function generateVerificationEmailText(firstName: string, verificationUrl: string): string {
  return `
    Welcome to The Gun Firm, ${firstName}!

    Thank you for registering with The Gun Firm. To complete your account setup, please verify your email address by clicking the link below:

    ${verificationUrl}

    This verification link will expire in 24 hours. If you didn't create an account with The Gun Firm, please ignore this email.

    Once verified, you'll have access to:
    - Tier-based pricing benefits
    - Secure checkout and FFL transfer management  
    - Order tracking and history
    - Exclusive member pricing and promotions

    Welcome to the family!
    The Gun Firm Team

    © 2025 The Gun Firm. All rights reserved.
  `;
}

function generateWelcomeEmailHTML(firstName: string, subscriptionTier: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to The Gun Firm</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .content { background: #ffffff; padding: 40px; border: 1px solid #ddd; }
        .tier-badge { display: inline-block; background: #dc2626; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">The Gun Firm</div>
        <div>Your Account is Now Active</div>
      </div>
      
      <div class="content">
        <h2>Welcome ${firstName}!</h2>
        
        <p>Your email has been verified and your account is now active. You're set up with <span class="tier-badge">${subscriptionTier} Tier</span> access.</p>
        
        <p>You can now:</p>
        <ul>
          <li>Browse our complete catalog with your tier pricing</li>
          <li>Add items to your cart and checkout securely</li>
          <li>Manage your FFL preferences</li>
          <li>Track your orders and purchase history</li>
        </ul>
        
        <p>Start shopping now and take advantage of your ${subscriptionTier} tier benefits!</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NODE_ENV === 'production' ? 'https://thegunfirm.com' : 'https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev'}" style="display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Shopping</a>
        </div>
        
        <p>Thank you for choosing The Gun Firm!</p>
        <p><strong>The Gun Firm Team</strong></p>
      </div>
      
      <div class="footer">
        <p>© 2025 The Gun Firm. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

function generateWelcomeEmailText(firstName: string, subscriptionTier: string): string {
  return `
    Welcome ${firstName}!

    Your email has been verified and your account is now active with ${subscriptionTier} Tier access.

    You can now:
    - Browse our complete catalog with your tier pricing
    - Add items to your cart and checkout securely
    - Manage your FFL preferences  
    - Track your orders and purchase history

    Start shopping now and take advantage of your ${subscriptionTier} tier benefits!

    Thank you for choosing The Gun Firm!
    The Gun Firm Team

    © 2025 The Gun Firm. All rights reserved.
  `;
}