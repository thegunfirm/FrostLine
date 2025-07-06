import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { storage } from '../../../storage';
import type { InsertProduct } from '@shared/schema';

/**
 * RSR File Processing Service
 * Processes RSR's file-based data feeds
 * Part of multi-distributor architecture
 */

export interface RSRInventoryRecord {
  stockNumber: string;
  upcCode: string;
  description: string;
  departmentNumber: string;
  manufacturerId: string;
  retailPrice: string;      // MSRP
  rsrPricing: string;       // Dealer cost
  productWeight: string;
  inventoryQuantity: string;
  model: string;
  fullManufacturerName: string;
  manufacturerPartNumber: string;
  allocatedCloseoutDeleted: string;
  expandedDescription: string;
  imageName: string;
  stateRestrictions: Record<string, string>;
  groundShipOnly: string;
  adultSignatureRequired: string;
  blockedFromDropShip: string;
  dateEntered: string;
  retailMAP: string;
  imageDisclaimer: string;
  shippingLength: string;
  shippingWidth: string;
  shippingHeight: string;
  prop65: string;
  vendorApprovalRequired: string;
}

class RSRFileProcessor {
  private dataDirectory = join(process.cwd(), 'server', 'data', 'distributors', 'rsr', 'processed');

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!existsSync(this.dataDirectory)) {
      mkdirSync(this.dataDirectory, { recursive: true });
    }
  }

  /**
   * Process main RSR inventory file (rsrinventory-new.txt)
   * 77 fields, semicolon delimited
   */
  async processInventoryFile(filePath: string): Promise<{ processed: number; errors: number }> {
    console.log('Processing RSR inventory file:', filePath);
    
    if (!existsSync(filePath)) {
      throw new Error(`RSR inventory file not found: ${filePath}`);
    }

    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`Processing ${lines.length} RSR inventory records`);
    
    let processed = 0;
    let errors = 0;

    for (const line of lines) {
      try {
        const record = this.parseInventoryRecord(line);
        if (record) {
          await this.processInventoryRecord(record);
          processed++;
          
          if (processed % 100 === 0) {
            console.log(`Processed ${processed} RSR records...`);
          }
        }
      } catch (error) {
        console.error('Error processing RSR inventory record:', error);
        errors++;
      }
    }

    console.log(`RSR inventory processing complete: ${processed} processed, ${errors} errors`);
    return { processed, errors };
  }

  private parseInventoryRecord(line: string): RSRInventoryRecord | null {
    const fields = line.split(';');
    
    if (fields.length < 77) {
      console.warn(`Invalid RSR inventory record: expected 77 fields, got ${fields.length}`);
      return null;
    }

    // Parse state restrictions (fields 16-56)
    const stateRestrictions: Record<string, string> = {};
    const stateAbbreviations = [
      'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL',
      'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA',
      'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE',
      'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI',
      'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'
    ];

    stateAbbreviations.forEach((state, index) => {
      stateRestrictions[state] = fields[15 + index] || '';
    });

    return {
      stockNumber: fields[0]?.trim() || '',
      upcCode: fields[1]?.trim() || '',
      description: fields[2]?.trim() || '',
      departmentNumber: fields[3]?.trim() || '',
      manufacturerId: fields[4]?.trim() || '',
      retailPrice: fields[5]?.trim() || '0',
      rsrPricing: fields[6]?.trim() || '0',
      productWeight: fields[7]?.trim() || '0',
      inventoryQuantity: fields[8]?.trim() || '0',
      model: fields[9]?.trim() || '',
      fullManufacturerName: fields[10]?.trim() || '',
      manufacturerPartNumber: fields[11]?.trim() || '',
      allocatedCloseoutDeleted: fields[12]?.trim() || '',
      expandedDescription: fields[13]?.trim() || '',
      imageName: fields[14]?.trim() || '',
      stateRestrictions,
      groundShipOnly: fields[66]?.trim() || '',
      adultSignatureRequired: fields[67]?.trim() || '',
      blockedFromDropShip: fields[68]?.trim() || '',
      dateEntered: fields[69]?.trim() || '',
      retailMAP: fields[70]?.trim() || '0',
      imageDisclaimer: fields[71]?.trim() || '',
      shippingLength: fields[72]?.trim() || '0',
      shippingWidth: fields[73]?.trim() || '0',
      shippingHeight: fields[74]?.trim() || '0',
      prop65: fields[75]?.trim() || '',
      vendorApprovalRequired: fields[76]?.trim() || ''
    };
  }

  private async processInventoryRecord(record: RSRInventoryRecord): Promise<void> {
    // Skip deleted items
    if (record.allocatedCloseoutDeleted === 'Deleted') {
      return;
    }

    // Check if product exists
    const existingProduct = await storage.getProductBySku(record.stockNumber);
    
    const productData: InsertProduct = {
      name: record.description,
      description: record.expandedDescription || record.description,
      category: this.mapDepartmentToCategory(record.departmentNumber),
      manufacturer: record.fullManufacturerName,
      sku: record.stockNumber,
      upcCode: record.upcCode,
      priceWholesale: record.rsrPricing || "0",
      priceMSRP: record.retailPrice || "0",
      priceMAP: record.retailMAP || record.retailPrice || "0",
      priceBronze: record.retailPrice || "0", // Bronze = MSRP
      priceGold: record.retailMAP || record.retailPrice || "0", // Gold = MAP
      pricePlatinum: record.rsrPricing || "0", // Platinum = Dealer price
      inStock: parseInt(record.inventoryQuantity) > 0,
      stockQuantity: parseInt(record.inventoryQuantity) || 0,
      distributor: "RSR",
      requiresFFL: this.requiresFFL(record.departmentNumber),
      images: record.imageName ? [record.imageName] : [],
      tags: this.generateTags(record),
      weight: record.productWeight || "0",
      dimensions: {
        length: parseFloat(record.shippingLength) || 0,
        width: parseFloat(record.shippingWidth) || 0,
        height: parseFloat(record.shippingHeight) || 0
      },
      restrictions: {
        groundShipOnly: record.groundShipOnly === 'Y',
        adultSignatureRequired: record.adultSignatureRequired === 'Y',
        blockedFromDropShip: record.blockedFromDropShip === 'Y',
        prop65: record.prop65 === 'Y',
        vendorApprovalRequired: record.vendorApprovalRequired === 'Y'
      },
      stateRestrictions: Object.entries(record.stateRestrictions)
        .filter(([_, restricted]) => restricted === 'Y')
        .map(([state, _]) => state)
    };

    if (existingProduct) {
      await storage.updateProduct(existingProduct.id, productData);
    } else {
      await storage.createProduct(productData);
    }
  }

  /**
   * Process inventory quantities file (IM-QTY-CSV.csv)
   * 2 fields, comma delimited, updates every 5 minutes
   */
  async processQuantityFile(filePath: string): Promise<{ updated: number }> {
    console.log('Processing RSR quantity file:', filePath);
    
    if (!existsSync(filePath)) {
      throw new Error(`RSR quantity file not found: ${filePath}`);
    }

    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`Processing ${lines.length} RSR quantity records`);
    
    let updated = 0;
    
    for (const line of lines) {
      try {
        const [stockNumber, quantity] = line.split(',');
        
        if (stockNumber && quantity) {
          const product = await storage.getProductBySku(stockNumber.trim());
          if (product) {
            const qty = parseInt(quantity.trim()) || 0;
            await storage.updateProduct(product.id, {
              stockQuantity: qty,
              inStock: qty > 0
            });
            updated++;
          }
        }
      } catch (error) {
        console.error('Error processing RSR quantity record:', error);
      }
    }

    console.log(`RSR quantity processing complete: ${updated} products updated`);
    return { updated };
  }

  /**
   * Process deleted products file (rsrdeletedinv.txt)
   * 3 fields, semicolon delimited
   */
  async processDeletedFile(filePath: string): Promise<{ deleted: number }> {
    console.log('Processing RSR deleted products file:', filePath);
    
    if (!existsSync(filePath)) {
      throw new Error(`RSR deleted file not found: ${filePath}`);
    }

    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`Processing ${lines.length} RSR deleted records`);
    
    let deleted = 0;
    
    for (const line of lines) {
      try {
        const [stockNumber, description, status] = line.split(';');
        
        if (stockNumber && status === 'DELETED') {
          const product = await storage.getProductBySku(stockNumber.trim());
          if (product) {
            // Mark as out of stock instead of deleting
            await storage.updateProduct(product.id, {
              inStock: false,
              stockQuantity: 0
            });
            deleted++;
          }
        }
      } catch (error) {
        console.error('Error processing RSR deleted record:', error);
      }
    }

    console.log(`RSR deleted processing complete: ${deleted} products marked as out of stock`);
    return { deleted };
  }

  private mapDepartmentToCategory(departmentNumber: string): string {
    const categoryMap: Record<string, string> = {
      '1': 'Handguns',
      '2': 'Used Handguns',
      '3': 'Used Long Guns',
      '4': 'Tasers',
      '5': 'Long Guns',
      '6': 'NFA Products',
      '7': 'Black Powder',
      '8': 'Optics',
      '9': 'Optical Accessories',
      '10': 'Magazines',
      '11': 'Grips, Pads, Stocks, Bipods',
      '12': 'Soft Gun Cases, Packs, Bags',
      '13': 'Misc. Accessories',
      '14': 'Holsters & Pouches',
      '15': 'Reloading Equipment',
      '16': 'Black Powder Accessories',
      '17': 'Closeout Accessories',
      '18': 'Ammunition',
      '19': 'Survival & Camping Supplies',
      '20': 'Lights, Lasers & Batteries',
      '21': 'Cleaning Equipment',
      '22': 'Airguns',
      '23': 'Knives & Tools',
      '24': 'High Capacity Magazines',
      '25': 'Safes & Security',
      '26': 'Safety & Protection',
      '27': 'Non-Lethal Defense',
      '28': 'Binoculars',
      '29': 'Spotting Scopes',
      '30': 'Sights',
      '31': 'Optical Accessories',
      '32': 'Barrels, Choke Tubes & Muzzle Devices',
      '33': 'Clothing',
      '34': 'Parts',
      '35': 'Slings & Swivels',
      '36': 'Electronics',
      '38': 'Books, Software & DVDs',
      '39': 'Targets',
      '40': 'Hard Gun Cases',
      '41': 'Upper Receivers & Conversion Kits',
      '42': 'SBR Barrels & Upper Receivers',
      '43': 'Upper Receivers & Conversion Kits - High Capacity'
    };

    return categoryMap[departmentNumber] || 'Accessories';
  }

  private requiresFFL(departmentNumber: string): boolean {
    const fflRequiredDepartments = ['1', '2', '3', '5', '6', '7', '41', '42', '43'];
    return fflRequiredDepartments.includes(departmentNumber);
  }

  private generateTags(record: RSRInventoryRecord): string[] {
    const tags: string[] = [];
    
    if (record.fullManufacturerName) {
      tags.push(record.fullManufacturerName);
    }
    
    if (record.model) {
      tags.push(record.model);
    }
    
    if (record.allocatedCloseoutDeleted === 'Allocated') {
      tags.push('Allocated');
    }
    
    if (record.allocatedCloseoutDeleted === 'Closeout') {
      tags.push('Closeout');
    }
    
    if (record.prop65 === 'Y') {
      tags.push('Prop65');
    }
    
    tags.push('RSR');
    
    return tags;
  }

  /**
   * Save processing log
   */
  saveProcessingLog(type: string, stats: any): void {
    const logFile = join(this.dataDirectory, 'processing-log.json');
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      stats,
      distributor: 'RSR'
    };
    
    let logs = [];
    if (existsSync(logFile)) {
      try {
        logs = JSON.parse(readFileSync(logFile, 'utf-8'));
      } catch (error) {
        console.error('Error reading RSR processing log:', error);
      }
    }
    
    logs.push(logEntry);
    
    // Keep only last 100 entries
    if (logs.length > 100) {
      logs = logs.slice(-100);
    }
    
    writeFileSync(logFile, JSON.stringify(logs, null, 2));
  }
}

export const rsrFileProcessor = new RSRFileProcessor();