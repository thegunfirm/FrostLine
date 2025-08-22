import { MailService } from '@sendgrid/mail';
import crypto from 'crypto';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  verificationToken: string
): Promise<boolean> {
  // Use current Replit domain for verification links
  const currentDomain = process.env.REPLIT_DEV_DOMAIN || '4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev';
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://thegunfirm.com' 
    : `https://${currentDomain}`;
  
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #000; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { 
          display: inline-block; 
          background: #000; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0; 
        }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to TheGunFirm.com</h1>
        </div>
        <div class="content">
          <h2>Hi ${firstName},</h2>
          <p>Thank you for creating an account with TheGunFirm.com! To complete your registration and start enjoying exclusive member pricing, please verify your email address.</p>
          
          <p><a href="${verificationUrl}" class="button">Verify My Email</a></p>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <p>Once verified, you'll have access to:</p>
          <ul>
            <li>Bronze member pricing on all items</li>
            <li>Ability to upgrade to Gold/Platinum for even better savings</li>
            <li>Secure checkout and order tracking</li>
            <li>FFL transfer assistance</li>
          </ul>
          
          <p>If you didn't create this account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>© 2025 TheGunFirm.com - Your Premier Firearms Dealer</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Welcome to TheGunFirm.com!
    
    Hi ${firstName},
    
    Thank you for creating an account with TheGunFirm.com! To complete your registration and start enjoying exclusive member pricing, please verify your email address by clicking this link:
    
    ${verificationUrl}
    
    Once verified, you'll have access to Bronze member pricing on all items, the ability to upgrade to Gold/Platinum for even better savings, secure checkout, and FFL transfer assistance.
    
    If you didn't create this account, you can safely ignore this email.
    
    © 2025 TheGunFirm.com - Your Premier Firearms Dealer
  `;

  return await sendEmail({
    to: email,
    from: 'noreply@thegunfirm.com',
    subject: 'Verify Your Email - TheGunFirm.com',
    text: textContent,
    html: htmlContent,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetToken: string
): Promise<boolean> {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : process.env.NODE_ENV === 'production' 
      ? 'https://thegunfirm.com' 
      : 'http://localhost:5000';
  
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #000; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { 
          display: inline-block; 
          background: #000; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0; 
        }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset - TheGunFirm.com</h1>
        </div>
        <div class="content">
          <h2>Hi ${firstName},</h2>
          <p>We received a request to reset your password for your TheGunFirm.com account. Click the button below to create a new password:</p>
          
          <p><a href="${resetUrl}" class="button">Reset My Password</a></p>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          
          <div class="warning">
            <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
          </div>
          
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          
          <p>For security reasons, if you continue to receive unwanted password reset emails, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>© 2025 TheGunFirm.com - Your Premier Firearms Dealer</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Password Reset - TheGunFirm.com
    
    Hi ${firstName},
    
    We received a request to reset your password for your TheGunFirm.com account. Click this link to create a new password:
    
    ${resetUrl}
    
    Important: This password reset link will expire in 1 hour for security reasons.
    
    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    
    For security reasons, if you continue to receive unwanted password reset emails, please contact our support team.
    
    © 2025 TheGunFirm.com - Your Premier Firearms Dealer
  `;

  return await sendEmail({
    to: email,
    from: 'noreply@thegunfirm.com',
    subject: 'Reset Your Password - TheGunFirm.com',
    text: textContent,
    html: htmlContent,
  });
}