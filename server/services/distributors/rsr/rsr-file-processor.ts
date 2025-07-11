import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { storage } from '../../../storage';
import type { InsertProduct } from '@shared/schema';
import { products } from '@shared/schema';
import { db } from '../../../db';
import { eq } from 'drizzle-orm';

/**
 * RSR File Processing Service
 * Processes RSR's file-based data feeds
 * Part of multi-distributor architecture
 */

export interface RSRInventoryRecord {
  stockNumber: string;            // Field 1
  upcCode: string;               // Field 2
  description: string;           // Field 3
  departmentNumber: string;      // Field 4
  manufacturerId: string;        // Field 5
  retailPrice: string;          // Field 6 - MSRP
  rsrPricing: string;           // Field 7 - Dealer cost
  productWeight: string;        // Field 8
  inventoryQuantity: string;    // Field 9
  model: string;               // Field 10
  fullManufacturerName: string; // Field 11
  manufacturerPartNumber: string; // Field 12
  allocatedCloseoutDeleted: string; // Field 13
  expandedDescription: string;  // Field 14
  imageName: string;           // Field 15
  departmentDesc: string;      // Field 16 - Department description
  subcategoryName: string;     // Field 17 - CRITICAL for handgun classification
  subDepartmentDesc: string;   // Field 18 - Sub-department description
  accessories: string;         // Field 19 - Accessories included
  promo: string;              // Field 20 - Promotional information
  // ... additional fields 21-77 exist but these are the critical ones
  stateRestrictions: Record<string, string>;
  groundShipOnly: string;
  adultSignatureRequired: string;
  blockedFromDropShip: string;  // Field 69 - "Y" means blocked from drop ship
  dateEntered: string;
  retailMAP: string;          // Field 71 - MAP pricing
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
  async processInventoryFile(filePath: string): Promise<{ processed: number; errors: number; validation: any }> {
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
    
    // Validate database integrity after processing
    const validation = await this.validateDatabaseIntegrity(filePath);
    
    if (!validation.isValid) {
      console.log('⚠️  Database integrity validation failed!');
      console.log('🔧 Attempting to fix discrepancies...');
      
      const fixResult = await this.fixDatabaseDiscrepancies(filePath);
      
      // Re-validate after fixes
      const revalidation = await this.validateDatabaseIntegrity(filePath);
      
      return { 
        processed, 
        errors, 
        validation: {
          ...validation,
          fixAttempted: true,
          fixResult,
          revalidation
        }
      };
    }
    
    return { processed, errors, validation };
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
      // CRITICAL: Add RSR classification fields for proper handgun filtering
      subcategoryName: record.subcategoryName || null,
      departmentDesc: record.departmentDesc || null,
      subDepartmentDesc: record.subDepartmentDesc || null,
      manufacturerPartNumber: record.manufacturerPartNumber || null,
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
      allocated: record.allocatedCloseoutDeleted || null,
      newItem: record.promo?.includes('NEW') || false,
      promo: record.promo || null,
      accessories: record.accessories || null,
      groundShipOnly: record.groundShipOnly === 'Y',
      adultSignatureRequired: record.adultSignatureRequired === 'Y',
      dropShippable: record.blockedFromDropShip !== 'Y', // Critical: "Y" means blocked, blank means allowed
      prop65: record.prop65 === 'Y',
      distributor: "RSR",
      requiresFFL: this.requiresFFL(record.departmentNumber),
      images: record.imageName ? [record.imageName] : [],
      tags: this.generateTags(record),
      caliber: this.extractCaliber(record.description), // CRITICAL: Add caliber field
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
    
    // Extract caliber from product name for filtering
    const caliber = this.extractCaliber(record.description);
    if (caliber) {
      tags.push(caliber);
    }
    
    // Category-based tags
    const category = this.mapDepartmentToCategory(record.departmentNumber);
    tags.push(category);
    
    // Manufacturer
    if (record.fullManufacturerName) {
      tags.push(record.fullManufacturerName);
    }
    
    // Model
    if (record.model) {
      tags.push(record.model);
    }
    
    // Special status tags
    if (record.allocatedCloseoutDeleted === 'Allocated') {
      tags.push('Allocated');
    }
    
    if (record.allocatedCloseoutDeleted === 'Closeout') {
      tags.push('Closeout');
    }
    
    if (record.prop65 === 'Y') {
      tags.push('Prop65');
    }
    
    // FFL requirement
    if (this.requiresFFL(record.departmentNumber)) {
      tags.push('FFL Required');
    }
    
    // Drop ship status
    if (record.blockedFromDropShip === 'Y') {
      tags.push('Warehouse Only');
    } else {
      tags.push('Drop Shippable');
    }
    
    // Distributor
    tags.push('RSR');
    
    return tags;
  }

  private extractCaliber(productName: string): string | null {
    const name = productName.toUpperCase();
    
    // Comprehensive caliber patterns - most specific first
    const caliberPatterns = [
      // Rifle calibers
      { pattern: /5\.56\s*NATO|5\.56\s*MM|556NATO|556MM|\b5\.56\b/i, caliber: '5.56' },
      { pattern: /223\s*REM|\.223\s*REM|223REM|\b223\b/i, caliber: '223' },
      { pattern: /308\s*WIN|\.308\s*WIN|308WIN|\b308\b/i, caliber: '308' },
      { pattern: /7\.62\s*NATO|7\.62\s*X\s*51|762NATO|762X51/i, caliber: '7.62x51' },
      { pattern: /7\.62\s*X\s*39|762X39/i, caliber: '7.62x39' },
      { pattern: /6\.5\s*CREEDMOOR|6\.5\s*CM|65CREEDMOOR|65CM/i, caliber: '6.5 Creedmoor' },
      { pattern: /300\s*BLK|300\s*BLACKOUT|300BLK|300BLACKOUT/i, caliber: '300 BLK' },
      { pattern: /7MM\s*REM|7MM\s*MAG|7MMREM|7MMMAG/i, caliber: '7mm Rem Mag' },
      { pattern: /30-06|3006|30\.06/i, caliber: '30-06' },
      { pattern: /270\s*WIN|\.270\s*WIN|270WIN|\b270\b/i, caliber: '270' },
      
      // Handgun calibers
      { pattern: /9MM|9\s*MM|\b9\b/i, caliber: '9mm' },
      { pattern: /45\s*ACP|\.45\s*ACP|45ACP/i, caliber: '45 ACP' },
      { pattern: /40\s*S&W|\.40\s*S&W|40SW|40CAL/i, caliber: '40 S&W' },
      { pattern: /357\s*MAG|\.357\s*MAG|357MAG|357\s*MAGNUM|\b357\b/i, caliber: '357 Magnum' },
      { pattern: /38\s*SPEC|\.38\s*SPEC|38SPL|38\s*SPL|38SPEC/i, caliber: '38 Special' },
      { pattern: /380\s*ACP|\.380\s*ACP|380ACP|\b380\b/i, caliber: '380 ACP' },
      { pattern: /32\s*ACP|\.32\s*ACP|32ACP|\b32\b/i, caliber: '32 ACP' },
      { pattern: /25\s*ACP|\.25\s*ACP|25ACP|\b25\b/i, caliber: '25 ACP' },
      { pattern: /44\s*MAG|\.44\s*MAG|44MAG|44\s*MAGNUM/i, caliber: '44 Magnum' },
      { pattern: /41\s*MAG|\.41\s*MAG|41MAG/i, caliber: '41 Magnum' },
      { pattern: /357\s*SIG|\.357\s*SIG|357SIG/i, caliber: '357 SIG' },
      { pattern: /10MM|10\s*MM|\b10\b/i, caliber: '10mm' },
      
      // Shotgun calibers
      { pattern: /12\s*GA|12\s*GAUGE|12GA|12GAUGE/i, caliber: '12 GA' },
      { pattern: /20\s*GA|20\s*GAUGE|20GA|20GAUGE/i, caliber: '20 GA' },
      { pattern: /410\s*BORE|\.410|410BORE/i, caliber: '410' },
      { pattern: /16\s*GA|16\s*GAUGE|16GA|16GAUGE/i, caliber: '16 GA' },
      { pattern: /28\s*GA|28\s*GAUGE|28GA|28GAUGE/i, caliber: '28 GA' },
      
      // Rimfire calibers
      { pattern: /22\s*LR|\.22\s*LR|22LR/i, caliber: '22 LR' },
      { pattern: /22\s*MAG|\.22\s*MAG|22MAG|22WMR/i, caliber: '22 Mag' },
      { pattern: /17\s*HMR|\.17\s*HMR|17HMR/i, caliber: '17 HMR' },
      { pattern: /22\s*SHORT|\.22\s*SHORT|22SHORT/i, caliber: '22 Short' }
    ];
    
    // Find the first matching pattern
    for (const { pattern, caliber } of caliberPatterns) {
      if (pattern.test(name)) {
        return caliber;
      }
    }
    
    return null;
  }

  /**
   * Validate database matches RSR file after processing
   */
  async validateDatabaseIntegrity(filePath: string): Promise<{ isValid: boolean; discrepancies: any[] }> {
    console.log('🔍 Validating database integrity against RSR file...');
    
    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // Build RSR file inventory
    const rsrInventory = new Map<string, number>();
    let rsrTotalQuantity = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      const fields = line.split(';');
      if (fields.length < 9) continue;
      
      const stockNo = fields[0];
      const quantity = parseInt(fields[8]) || 0;
      
      if (stockNo) {
        rsrInventory.set(stockNo, quantity);
        rsrTotalQuantity += quantity;
      }
    }
    
    // Get database inventory
    const dbProducts = await db.select().from(products);
    const dbInventory = new Map<string, number>();
    let dbTotalQuantity = 0;
    
    for (const product of dbProducts) {
      dbInventory.set(product.sku, product.stockQuantity || 0);
      dbTotalQuantity += product.stockQuantity || 0;
    }
    
    console.log(`📂 RSR File: ${rsrInventory.size.toLocaleString()} products, ${rsrTotalQuantity.toLocaleString()} total units`);
    console.log(`🗄️  Database: ${dbInventory.size.toLocaleString()} products, ${dbTotalQuantity.toLocaleString()} total units`);
    
    // Find discrepancies
    const discrepancies = [];
    
    for (const [sku, rsrQty] of rsrInventory) {
      const dbQty = dbInventory.get(sku) || 0;
      if (rsrQty !== dbQty) {
        discrepancies.push({
          sku,
          rsrQuantity: rsrQty,
          dbQuantity: dbQty,
          difference: rsrQty - dbQty
        });
      }
    }
    
    const isValid = discrepancies.length === 0 && rsrTotalQuantity === dbTotalQuantity;
    
    if (isValid) {
      console.log('✅ Database integrity validated - perfect match with RSR file');
    } else {
      console.log(`❌ Database integrity issues found:`);
      console.log(`   - ${discrepancies.length} product quantity mismatches`);
      console.log(`   - Total quantity difference: ${rsrTotalQuantity - dbTotalQuantity} units`);
      
      if (discrepancies.length > 0) {
        console.log('📋 Sample discrepancies:');
        discrepancies.slice(0, 5).forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.sku}: RSR=${item.rsrQuantity}, DB=${item.dbQuantity} (diff: ${item.difference})`);
        });
      }
    }
    
    return { isValid, discrepancies };
  }

  /**
   * Fix database discrepancies found during validation
   */
  async fixDatabaseDiscrepancies(filePath: string): Promise<{ fixed: number; errors: number }> {
    console.log('🔧 Fixing database discrepancies...');
    
    const validation = await this.validateDatabaseIntegrity(filePath);
    
    if (validation.isValid) {
      console.log('✅ No discrepancies to fix');
      return { fixed: 0, errors: 0 };
    }
    
    let fixed = 0;
    let errors = 0;
    
    for (const discrepancy of validation.discrepancies) {
      try {
        const [product] = await db.select().from(products).where(eq(products.sku, discrepancy.sku));
        if (product) {
          await db.update(products)
            .set({
              stockQuantity: discrepancy.rsrQuantity,
              inStock: discrepancy.rsrQuantity > 0
            })
            .where(eq(products.id, product.id));
          fixed++;
        }
      } catch (error) {
        console.error(`Error fixing ${discrepancy.sku}:`, error);
        errors++;
      }
    }
    
    console.log(`✅ Fixed ${fixed} discrepancies, ${errors} errors`);
    return { fixed, errors };
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