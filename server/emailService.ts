import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface OrderItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  requiresFFL?: boolean;
}

interface OrderEmailData {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: any;
  billingAddress: any;
  fflDealer?: {
    name: string;
    address: string;
  };
  transactionId: string;
  orderDate: string;
}

export async function sendOrderConfirmationEmail(orderData: OrderEmailData): Promise<boolean> {
  try {
    const logoUrl = `${process.env.FRONTEND_URL || 'https://thegunfirm.com'}/assets/the-gun-firm-logo.png`;
    
    // Create items list with FFL indicators
    const itemsHtml = orderData.items.map(item => `
      <tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 12px 0; vertical-align: top;">
          <div style="font-weight: 600; color: #1f2937;">${item.name}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
            SKU: ${item.sku}
            ${item.requiresFFL ? ' • <span style="color: #dc2626; font-weight: 600;">FFL Required</span>' : ''}
          </div>
        </td>
        <td style="padding: 12px 0; text-align: center; color: #374151;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; color: #374151;">$${item.price.toFixed(2)}</td>
        <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #1f2937;">$${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const fflSection = orderData.fflDealer ? `
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">
          🔫 FFL Transfer Information
        </h3>
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          Your firearms will be shipped to your selected FFL dealer:
        </p>
        <div style="margin-top: 8px; padding: 12px; background-color: #fffbeb; border-radius: 6px;">
          <div style="font-weight: 600; color: #92400e;">${orderData.fflDealer.name}</div>
          <div style="color: #92400e; font-size: 14px; margin-top: 4px;">${orderData.fflDealer.address}</div>
        </div>
        <p style="margin: 12px 0 0 0; color: #92400e; font-size: 13px;">
          Please bring a valid ID and complete the background check process when picking up your firearm(s).
        </p>
      </div>
    ` : '';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${orderData.orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background-color: #000000; padding: 32px 24px; text-align: center;">
          <img src="${logoUrl}" alt="The Gun Firm" style="max-height: 80px; width: auto;" />
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 24px;">
          
          <!-- Order Confirmation Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="margin: 0 0 8px 0; color: #1f2937; font-size: 28px; font-weight: 700;">
              Order Confirmed!
            </h1>
            <p style="margin: 0; color: #6b7280; font-size: 16px;">
              Thank you for your order, ${orderData.customerName}
            </p>
          </div>

          <!-- Order Details Box -->
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
              <div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Order Number</div>
                <div style="font-size: 18px; font-weight: 700; color: #1f2937;">#${orderData.orderNumber}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Order Date</div>
                <div style="font-size: 16px; color: #1f2937;">${orderData.orderDate}</div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Transaction ID</div>
                <div style="font-size: 16px; color: #1f2937;">${orderData.transactionId}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">Total Paid</div>
                <div style="font-size: 20px; font-weight: 700; color: #059669;">$${orderData.total.toFixed(2)}</div>
              </div>
            </div>
          </div>

          ${fflSection}

          <!-- Order Items -->
          <div style="margin-bottom: 32px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">
              Order Items
            </h2>
            <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 16px 0 16px 16px; text-align: left; color: #374151; font-weight: 600; font-size: 14px;">Item</th>
                  <th style="padding: 16px 8px; text-align: center; color: #374151; font-weight: 600; font-size: 14px;">Qty</th>
                  <th style="padding: 16px 8px; text-align: right; color: #374151; font-weight: 600; font-size: 14px;">Price</th>
                  <th style="padding: 16px 16px 16px 8px; text-align: right; color: #374151; font-weight: 600; font-size: 14px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- Order Summary -->
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">Order Summary</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Subtotal:</span>
              <span style="color: #1f2937;">$${orderData.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Shipping:</span>
              <span style="color: #1f2937;">$${orderData.shipping.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
              <span style="color: #6b7280;">Tax:</span>
              <span style="color: #1f2937;">$${orderData.tax.toFixed(2)}</span>
            </div>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 18px; font-weight: 700; color: #1f2937;">Total:</span>
                <span style="font-size: 18px; font-weight: 700; color: #059669;">$${orderData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Shipping Address -->
          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Shipping Address</h3>
            <div style="color: #6b7280; line-height: 1.5;">
              ${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}<br>
              ${orderData.shippingAddress.address}<br>
              ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.zipCode}
            </div>
          </div>

          <!-- Next Steps -->
          <div style="background-color: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #1e40af; line-height: 1.6;">
              <li>You'll receive a shipping confirmation email with tracking information once your order ships</li>
              ${orderData.fflDealer ? '<li>Firearms will be shipped to your selected FFL dealer for pickup</li>' : ''}
              <li>If you have any questions, contact our support team at support@thegunfirm.com</li>
            </ul>
          </div>

          <!-- Contact Info -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
              Questions about your order?
            </p>
            <p style="margin: 0; color: #1f2937; font-weight: 600;">
              support@thegunfirm.com | 1-800-GUN-FIRM
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #1f2937; padding: 24px; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 14px;">
            © 2025 The Gun Firm. All rights reserved.
          </p>
          <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px;">
            This email was sent regarding your order #${orderData.orderNumber}
          </p>
        </div>

      </div>
    </body>
    </html>
    `;

    const msg = {
      to: orderData.customerEmail,
      from: {
        email: 'orders@thegunfirm.com',
        name: 'The Gun Firm'
      },
      subject: `Order Confirmation #${orderData.orderNumber} - The Gun Firm`,
      html: htmlContent,
      text: `
Order Confirmation - The Gun Firm

Thank you for your order, ${orderData.customerName}!

Order Number: #${orderData.orderNumber}
Transaction ID: ${orderData.transactionId}
Order Date: ${orderData.orderDate}
Total: $${orderData.total.toFixed(2)}

Items Ordered:
${orderData.items.map(item => `- ${item.name} (${item.quantity}x) - $${item.total.toFixed(2)}`).join('\n')}

${orderData.fflDealer ? `FFL Dealer: ${orderData.fflDealer.name}\n${orderData.fflDealer.address}\n` : ''}

Shipping Address:
${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}
${orderData.shippingAddress.address}
${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.zipCode}

You'll receive a shipping confirmation with tracking information once your order ships.

Questions? Contact us at support@thegunfirm.com or 1-800-GUN-FIRM

The Gun Firm Team
      `.trim()
    };

    await sgMail.send(msg);
    console.log(`✅ Order confirmation email sent to ${orderData.customerEmail} for order #${orderData.orderNumber}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to send order confirmation email:', error);
    return false;
  }
}