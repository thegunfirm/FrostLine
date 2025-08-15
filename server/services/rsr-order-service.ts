import { Client as FTPClient } from 'basic-ftp';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { format } from 'date-fns';

export interface RSROrderItem {
  rsrStockNumber: string;
  quantity: number;
  customerPrice: number;
  unitPrice: number;
}

export interface RSRShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email?: string;
}

export interface RSROrderRequest {
  orderNumber: string;
  customerNumber: string;
  poNumber?: string;
  orderDate: Date;
  shipToAddress: RSRShippingAddress;
  items: RSROrderItem[];
  shippingMethod: 'GROUND' | 'NEXT_DAY' | '2_DAY';
  specialInstructions?: string;
  fflLicense?: string; // For firearms requiring FFL transfer
  requiresDropShip: boolean;
}

export interface RSROrderResponse {
  success: boolean;
  rsrOrderNumber?: string;
  estimatedShipDate?: Date;
  trackingNumber?: string;
  error?: string;
  warnings?: string[];
}

export class RSROrderService {
  private ftpConfig = {
    host: process.env.RSR_FTP_HOST || 'ftp.rsrgroup.com',
    port: parseInt(process.env.RSR_FTP_PORT || '21'),
    user: process.env.RSR_USERNAME || '',
    password: process.env.RSR_PASSWORD || ''
  };

  private orderDirectory = join(process.cwd(), 'server', 'data', 'rsr-orders');

  constructor() {
    // Ensure order directory exists
    if (!existsSync(this.orderDirectory)) {
      mkdirSync(this.orderDirectory, { recursive: true });
    }
  }

  /**
   * Submit an order to RSR via EDI file upload
   */
  async submitOrder(orderRequest: RSROrderRequest): Promise<RSROrderResponse> {
    try {
      console.log(`📤 Submitting RSR order: ${orderRequest.orderNumber}`);

      // Validate order request
      const validation = this.validateOrderRequest(orderRequest);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }

      // Generate EDI order file
      const ediContent = this.generateEDIOrderFile(orderRequest);
      const ediFileName = `order_${orderRequest.orderNumber}_${Date.now()}.edi`;
      const localFilePath = join(this.orderDirectory, ediFileName);

      // Save EDI file locally
      writeFileSync(localFilePath, ediContent);
      console.log(`💾 EDI file created: ${localFilePath}`);

      // Upload to RSR FTP server
      const uploadResult = await this.uploadOrderFile(ediFileName, localFilePath);
      if (!uploadResult.success) {
        return {
          success: false,
          error: `FTP upload failed: ${uploadResult.error}`
        };
      }

      // Check for acknowledgment (polling for response file)
      const ackResult = await this.waitForOrderAcknowledgment(orderRequest.orderNumber);
      
      return {
        success: true,
        rsrOrderNumber: ackResult.rsrOrderNumber,
        estimatedShipDate: ackResult.estimatedShipDate,
        warnings: ackResult.warnings
      };

    } catch (error: any) {
      console.error('RSR order submission error:', error);
      return {
        success: false,
        error: `Order submission failed: ${error.message}`
      };
    }
  }

  /**
   * Check order status from RSR
   */
  async checkOrderStatus(rsrOrderNumber: string): Promise<RSROrderResponse> {
    try {
      // Download status files from RSR
      await this.downloadStatusFiles();
      
      // Parse status files for our order
      const status = await this.parseOrderStatus(rsrOrderNumber);
      
      return {
        success: true,
        rsrOrderNumber: status.orderNumber,
        trackingNumber: status.trackingNumber,
        estimatedShipDate: status.shipDate
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Status check failed: ${error.message}`
      };
    }
  }

  /**
   * Validate order request before submission
   */
  private validateOrderRequest(order: RSROrderRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!order.orderNumber) errors.push('Order number is required');
    if (!order.customerNumber) errors.push('Customer number is required');
    if (!order.items || order.items.length === 0) errors.push('Order must contain at least one item');
    
    // Validate shipping address
    const addr = order.shipToAddress;
    if (!addr.name) errors.push('Ship to name is required');
    if (!addr.address1) errors.push('Ship to address is required');
    if (!addr.city) errors.push('Ship to city is required');
    if (!addr.state) errors.push('Ship to state is required');
    if (!addr.zipCode) errors.push('Ship to ZIP code is required');

    // Validate items
    order.items.forEach((item, index) => {
      if (!item.rsrStockNumber) errors.push(`Item ${index + 1}: RSR Stock Number is required`);
      if (item.quantity <= 0) errors.push(`Item ${index + 1}: Quantity must be positive`);
      if (item.customerPrice <= 0) errors.push(`Item ${index + 1}: Customer price must be positive`);
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate EDI format order file for RSR
   */
  private generateEDIOrderFile(order: RSROrderRequest): string {
    const dateStr = format(order.orderDate, 'yyyyMMdd');
    const timeStr = format(order.orderDate, 'HHmm');
    
    let edi = '';
    
    // ISA Header
    edi += `ISA*00*          *00*          *ZZ*${order.customerNumber.padEnd(15)}*ZZ*RSR           *${dateStr}*${timeStr}*U*00401*000000001*0*T*>~\n`;
    
    // GS Header
    edi += `GS*PO*${order.customerNumber}*RSR*${dateStr}*${timeStr}*1*X*004010~\n`;
    
    // ST Transaction Set Header
    edi += `ST*850*0001~\n`;
    
    // BEG Beginning Segment
    edi += `BEG*00*NE*${order.orderNumber}*${dateStr}~\n`;
    
    // DTM Date/Time Reference
    edi += `DTM*002*${dateStr}~\n`;
    
    // N1 Ship To Name
    edi += `N1*ST*${order.shipToAddress.name}~\n`;
    
    // N3 Ship To Address
    edi += `N3*${order.shipToAddress.address1}`;
    if (order.shipToAddress.address2) {
      edi += `*${order.shipToAddress.address2}`;
    }
    edi += `~\n`;
    
    // N4 Ship To City/State/ZIP
    edi += `N4*${order.shipToAddress.city}*${order.shipToAddress.state}*${order.shipToAddress.zipCode}~\n`;
    
    // PER Contact Information
    if (order.shipToAddress.phone) {
      edi += `PER*IC**TE*${order.shipToAddress.phone}`;
      if (order.shipToAddress.email) {
        edi += `*EM*${order.shipToAddress.email}`;
      }
      edi += `~\n`;
    }
    
    // Add FFL information if required
    if (order.fflLicense) {
      edi += `REF*FL*${order.fflLicense}~\n`;
    }
    
    // Line items
    order.items.forEach((item, index) => {
      const lineNumber = (index + 1).toString().padStart(6, '0');
      
      // PO1 Baseline Item Data
      edi += `PO1*${lineNumber}*${item.quantity}*EA*${item.unitPrice.toFixed(2)}**VP*${item.rsrStockNumber}~\n`;
      
      // PID Product Description (if needed)
      // edi += `PID*F****Item Description~\n`;
    });
    
    // CTT Transaction Totals
    edi += `CTT*${order.items.length}~\n`;
    
    // SE Transaction Set Trailer
    const segmentCount = edi.split('~').length;
    edi += `SE*${segmentCount}*0001~\n`;
    
    // GE Group Trailer
    edi += `GE*1*1~\n`;
    
    // IEA Interchange Trailer
    edi += `IEA*1*000000001~\n`;

    return edi;
  }

  /**
   * Upload order file to RSR FTP server
   */
  private async uploadOrderFile(fileName: string, localFilePath: string): Promise<{ success: boolean; error?: string }> {
    const client = new FTPClient();
    
    try {
      console.log(`🔗 Connecting to RSR FTP: ${this.ftpConfig.host}`);
      
      await client.access({
        host: this.ftpConfig.host,
        port: this.ftpConfig.port,
        user: this.ftpConfig.user,
        password: this.ftpConfig.password,
        secure: false
      });

      // Navigate to orders directory (typically /orders/incoming or similar)
      try {
        await client.cd('/orders/incoming');
      } catch {
        // Try alternative directory
        await client.cd('/incoming');
      }

      console.log(`📤 Uploading order file: ${fileName}`);
      await client.uploadFrom(localFilePath, fileName);
      
      console.log(`✅ Order file uploaded successfully`);
      return { success: true };

    } catch (error: any) {
      console.error('FTP upload error:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      client.close();
    }
  }

  /**
   * Wait for order acknowledgment from RSR
   */
  private async waitForOrderAcknowledgment(orderNumber: string, maxWaitMinutes: number = 30): Promise<{
    rsrOrderNumber?: string;
    estimatedShipDate?: Date;
    warnings?: string[];
  }> {
    const startTime = Date.now();
    const maxWaitTime = maxWaitMinutes * 60 * 1000;

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Download acknowledgment files
        await this.downloadAckFiles();
        
        // Check for our order acknowledgment
        const ack = await this.parseOrderAcknowledgment(orderNumber);
        if (ack) {
          return ack;
        }

        // Wait 2 minutes before checking again
        await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
        
      } catch (error) {
        console.warn('Error checking for acknowledgment:', error);
      }
    }

    // Timeout - return basic response
    return {
      warnings: ['Order submitted but acknowledgment not received within timeout period']
    };
  }

  /**
   * Download acknowledgment files from RSR
   */
  private async downloadAckFiles(): Promise<void> {
    const client = new FTPClient();
    
    try {
      await client.access(this.ftpConfig);
      
      try {
        await client.cd('/orders/ack');
      } catch {
        await client.cd('/ack');
      }

      const fileList = await client.list();
      
      for (const file of fileList) {
        if (file.name.toLowerCase().includes('ack') || file.name.toLowerCase().includes('997')) {
          const localPath = join(this.orderDirectory, 'ack', file.name);
          await client.downloadTo(localPath, file.name);
        }
      }

    } catch (error) {
      console.warn('Error downloading ACK files:', error);
    } finally {
      client.close();
    }
  }

  /**
   * Download status files from RSR
   */
  private async downloadStatusFiles(): Promise<void> {
    const client = new FTPClient();
    
    try {
      await client.access(this.ftpConfig);
      
      try {
        await client.cd('/orders/status');
      } catch {
        await client.cd('/status');
      }

      const fileList = await client.list();
      
      for (const file of fileList) {
        if (file.name.toLowerCase().includes('status') || file.name.toLowerCase().includes('ship')) {
          const localPath = join(this.orderDirectory, 'status', file.name);
          await client.downloadTo(localPath, file.name);
        }
      }

    } catch (error) {
      console.warn('Error downloading status files:', error);
    } finally {
      client.close();
    }
  }

  /**
   * Parse order acknowledgment files
   */
  private async parseOrderAcknowledgment(orderNumber: string): Promise<{
    rsrOrderNumber?: string;
    estimatedShipDate?: Date;
    warnings?: string[];
  } | null> {
    const ackDir = join(this.orderDirectory, 'ack');
    if (!existsSync(ackDir)) return null;

    const files = require('fs').readdirSync(ackDir);
    
    for (const file of files) {
      try {
        const content = readFileSync(join(ackDir, file), 'utf-8');
        
        // Parse EDI 997 acknowledgment or custom format
        if (content.includes(orderNumber)) {
          // Extract RSR order number and ship date
          const rsrOrderMatch = content.match(/RSR[0-9]+/);
          const rsrOrderNumber = rsrOrderMatch ? rsrOrderMatch[0] : undefined;
          
          // Parse estimated ship date
          const dateMatch = content.match(/SHIP[^0-9]*([0-9]{8})/);
          let estimatedShipDate: Date | undefined;
          if (dateMatch) {
            const dateStr = dateMatch[1];
            estimatedShipDate = new Date(
              parseInt(dateStr.substr(0, 4)),
              parseInt(dateStr.substr(4, 2)) - 1,
              parseInt(dateStr.substr(6, 2))
            );
          }

          return {
            rsrOrderNumber,
            estimatedShipDate,
            warnings: []
          };
        }
      } catch (error) {
        console.warn(`Error parsing ACK file ${file}:`, error);
      }
    }

    return null;
  }

  /**
   * Parse order status from status files
   */
  private async parseOrderStatus(rsrOrderNumber: string): Promise<{
    orderNumber: string;
    trackingNumber?: string;
    shipDate?: Date;
  }> {
    const statusDir = join(this.orderDirectory, 'status');
    if (!existsSync(statusDir)) {
      throw new Error('Status directory not found');
    }

    const files = require('fs').readdirSync(statusDir);
    
    for (const file of files) {
      try {
        const content = readFileSync(join(statusDir, file), 'utf-8');
        
        if (content.includes(rsrOrderNumber)) {
          // Parse tracking number
          const trackingMatch = content.match(/TRACKING[^:]*:?\s*([A-Z0-9]+)/i);
          const trackingNumber = trackingMatch ? trackingMatch[1] : undefined;
          
          // Parse ship date
          const shipDateMatch = content.match(/SHIP[^0-9]*([0-9]{8})/);
          let shipDate: Date | undefined;
          if (shipDateMatch) {
            const dateStr = shipDateMatch[1];
            shipDate = new Date(
              parseInt(dateStr.substr(0, 4)),
              parseInt(dateStr.substr(4, 2)) - 1,
              parseInt(dateStr.substr(6, 2))
            );
          }

          return {
            orderNumber: rsrOrderNumber,
            trackingNumber,
            shipDate
          };
        }
      } catch (error) {
        console.warn(`Error parsing status file ${file}:`, error);
      }
    }

    throw new Error(`Status not found for RSR order: ${rsrOrderNumber}`);
  }

  /**
   * Get RSR customer number for the account
   */
  getCustomerNumber(): string {
    return process.env.RSR_CUSTOMER_NUMBER || process.env.RSR_USERNAME || '';
  }
}

export const rsrOrderService = new RSROrderService();