import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { storage } from '../storage';
import type { InsertProduct } from '@shared/schema';

/**
 * RSR File Processing Service
 * Processes RSR's file-based data feeds instead of SOAP API
 * Based on RSR Dealer Toolbox documentation
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
  // State restrictions (fields 16-56)
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

export interface RSRQuantityRecord {
  stockNumber: string;
  quantity: string;
}

export interface RSRDeletedRecord {
  stockNumber: string;
  description: string;
  status: string; // Always 'DELETED'
}

export interface RSRAttributeRecord {
  stockNumber: string;
  manufacturerId: string;
  attributes: Record<string, string>;
}

export interface RSRNewProductRecord {
  stockNumber: string;
  dateAvailable: string;
}

class RSRFileProcessor {
  private dataDirectory = join(process.cwd(), 'server', 'data', 'rsr-files');
  private imageDirectory = join(process.cwd(), 'public', 'images', 'rsr');

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!existsSync(this.dataDirectory)) {
      mkdirSync(this.dataDirectory, { recursive: true });
    }
    if (!existsSync(this.imageDirectory)) {
      mkdirSync(this.imageDirectory, { recursive: true });
    }
  }

  /**
   * Process main RSR inventory file (rsrinventory-new.txt)
   * 77 fields, semicolon delimited
   */
  async processInventoryFile(filePath: string): Promise<void> {
    console.log('Processing RSR inventory file:', filePath);
    
    if (!existsSync(filePath)) {
      throw new Error(`RSR inventory file not found: ${filePath}`);
    }

    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`Processing ${lines.length} inventory records`);
    
    let processed = 0;
    let errors = 0;

    for (const line of lines) {
      try {
        const record = this.parseInventoryRecord(line);
        if (record) {
          await this.processInventoryRecord(record);
          processed++;
          
          if (processed % 100 === 0) {
            console.log(`Processed ${processed} records...`);
          }
        }
      } catch (error) {
        console.error('Error processing inventory record:', error);
        errors++;
      }
    }

    console.log(`Inventory processing complete: ${processed} processed, ${errors} errors`);
  }

  private parseInventoryRecord(line: string): RSRInventoryRecord | null {
    const fields = line.split(';');
    
    if (fields.length < 77) {
      console.warn(`Invalid inventory record: expected 77 fields, got ${fields.length}`);
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
      category: this.mapDepartmentToCategory(record.departmentNumber, record.description),
      departmentNumber: record.departmentNumber,
      manufacturer: record.fullManufacturerName,
      sku: record.stockNumber,
      upcCode: record.upcCode,
      priceWholesale: record.rsrPricing || "0",
      priceMSRP: record.retailPrice || "0",
      priceMAP: record.retailMAP || record.retailPrice || "0",
      priceBronze: record.retailPrice || "0", // Bronze = MSRP
      priceGold: this.calculateGoldPrice(record.retailPrice, record.rsrPricing), // Gold = (MSRP + Dealer)/2
      pricePlatinum: record.rsrPricing || "0", // Platinum = Dealer price
      inStock: parseInt(record.inventoryQuantity) > 0,
      stockQuantity: parseInt(record.inventoryQuantity) || 0,
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
  async processQuantityFile(filePath: string): Promise<void> {
    console.log('Processing RSR quantity file:', filePath);
    
    if (!existsSync(filePath)) {
      throw new Error(`RSR quantity file not found: ${filePath}`);
    }

    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`Processing ${lines.length} quantity records`);
    
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
        console.error('Error processing quantity record:', error);
      }
    }

    console.log(`Quantity processing complete: ${updated} products updated`);
  }

  /**
   * Process deleted products file (rsrdeletedinv.txt)
   * 3 fields, semicolon delimited
   */
  async processDeletedFile(filePath: string): Promise<void> {
    console.log('Processing RSR deleted products file:', filePath);
    
    if (!existsSync(filePath)) {
      throw new Error(`RSR deleted file not found: ${filePath}`);
    }

    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`Processing ${lines.length} deleted records`);
    
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
        console.error('Error processing deleted record:', error);
      }
    }

    console.log(`Deleted processing complete: ${deleted} products marked as out of stock`);
  }

  private mapDepartmentToCategory(departmentNumber: string, productDescription?: string): string {
    // If no department number, try to categorize by product description
    if (!departmentNumber || departmentNumber.trim() === '') {
      return this.categorizeByDescription(productDescription || '');
    }
    
    // Normalize department number by removing leading zeros
    const normalizedDept = departmentNumber.replace(/^0+/, '') || '0';
    
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

    return categoryMap[normalizedDept] || 'Accessories';
  }

  private requiresFFL(departmentNumber: string): boolean {
    // Normalize department number by removing leading zeros
    const normalizedDept = departmentNumber.replace(/^0+/, '') || '0';
    const fflRequiredDepartments = ['1', '2', '3', '5', '6', '7', '41', '42', '43'];
    return fflRequiredDepartments.includes(normalizedDept);
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
    
    return tags;
  }

  private calculateGoldPrice(msrp: string, wholesale: string): string {
    const msrpNum = parseFloat(msrp) || 0;
    const wholesaleNum = parseFloat(wholesale) || 0;
    
    if (msrpNum === 0 && wholesaleNum === 0) {
      return "0";
    }
    
    // Gold = (MSRP + Dealer)/2
    const goldPrice = (msrpNum + wholesaleNum) / 2;
    return goldPrice.toFixed(2);
  }

  private categorizeByDescription(description: string): string {
    const desc = description.toLowerCase();
    
    // NFA Items (highest priority)
    if (desc.includes('suppressor') || desc.includes('silencer') || 
        desc.includes('sbr') || desc.includes('short barrel') ||
        desc.includes('sbs') || desc.includes('short barreled shotgun') ||
        desc.includes('aow') || desc.includes('any other weapon') ||
        desc.includes('machine gun') || desc.includes('full auto')) {
      return 'NFA Products';
    }
    
    // Firearms
    if (desc.includes('pistol') || desc.includes('handgun') || 
        desc.includes('revolver') || desc.includes('1911') ||
        (desc.includes('9mm') && (desc.includes('gun') || desc.includes('firearm'))) ||
        (desc.includes('45acp') && (desc.includes('gun') || desc.includes('firearm'))) ||
        (desc.includes('40sw') && (desc.includes('gun') || desc.includes('firearm')))) {
      return 'Handguns';
    }
    
    if (desc.includes('rifle') || desc.includes('carbine') || 
        desc.includes('ar-15') || desc.includes('ar15') ||
        desc.includes('shotgun') || desc.includes('12ga') || desc.includes('20ga')) {
      return 'Long Guns';
    }
    
    // Ammunition
    if (desc.includes('rounds') || desc.includes('cartridge') ||
        desc.includes('ammo') || desc.includes('ammunition') ||
        (desc.includes('grain') && (desc.includes('fmj') || desc.includes('jhp') || desc.includes('ball'))) ||
        desc.includes('brass') && desc.includes('case')) {
      return 'Ammunition';
    }
    
    // Optics
    if (desc.includes('scope') || desc.includes('red dot') ||
        desc.includes('sight') || desc.includes('optic')) {
      return 'Optics';
    }
    
    // Magazines
    if (desc.includes('magazine') || desc.includes('mag ') ||
        (desc.includes('round') && desc.includes('capacity'))) {
      return 'Magazines';
    }
    
    // Default to Accessories for everything else
    return 'Accessories';
  }

  /**
   * Save processing log
   */
  saveProcessingLog(type: string, stats: any): void {
    const logFile = join(this.dataDirectory, 'processing-log.json');
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      stats
    };
    
    let logs = [];
    if (existsSync(logFile)) {
      try {
        logs = JSON.parse(readFileSync(logFile, 'utf-8'));
      } catch (error) {
        console.error('Error reading processing log:', error);
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
export { RSRFileProcessor };