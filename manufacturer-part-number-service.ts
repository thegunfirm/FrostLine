// Service for mapping RSR stock numbers to real manufacturer part numbers
// This addresses the critical issue where RSR doesn't always provide mfgPartNumber

interface ManufacturerMapping {
  rsrStock: string;
  manufacturerPart: string;
  manufacturer: string;
  notes?: string;
}

export class ManufacturerPartNumberService {
  // Comprehensive mapping of RSR stock numbers to real manufacturer part numbers
  private static readonly MANUFACTURER_MAPPINGS: ManufacturerMapping[] = [
    // Colt Manufacturing
    { rsrStock: 'COLT1911', manufacturerPart: 'O1911C', manufacturer: 'Colt Manufacturing', notes: '1911 Government' },
    { rsrStock: 'COLTAR15A4', manufacturerPart: 'CR6920', manufacturer: 'Colt Manufacturing', notes: 'AR-15A4' },
    
    // YHM (Yankee Hill Machine)
    { rsrStock: 'YHM-9680', manufacturerPart: '9680', manufacturer: 'YHMCO', notes: 'Flip Rear Sight' },
    
    // Sig Sauer
    { rsrStock: 'SIGP365', manufacturerPart: 'P365-9-BXR3', manufacturer: 'Sig Sauer', notes: 'P365 9mm' },
    { rsrStock: 'SIGP320C', manufacturerPart: '320C-9-B', manufacturer: 'Sig Sauer', notes: 'P320 Compact' },
    
    // Springfield Armory
    { rsrStock: 'SPAHELLCAT', manufacturerPart: 'HC9319B', manufacturer: 'Springfield Armory', notes: 'Hellcat 9mm' },
    { rsrStock: 'SPA911RO', manufacturerPart: 'PI9129L', manufacturer: 'Springfield Armory', notes: '1911 Range Officer' },
    { rsrStock: 'SPRINGFIELD1911', manufacturerPart: 'PI8020LP', manufacturer: 'Springfield Armory', notes: '1911 Target' },
    
    // Ruger
    { rsrStock: 'RUGERLCP2', manufacturerPart: '3701', manufacturer: 'Sturm, Ruger & Co.', notes: 'LCP II' },
    { rsrStock: 'RUG1103', manufacturerPart: '1103', manufacturer: 'Sturm, Ruger & Co.', notes: '10/22 Carbine' },
    { rsrStock: 'RUGERAR556', manufacturerPart: '8500', manufacturer: 'Sturm, Ruger & Co.', notes: 'AR-556' },
    { rsrStock: 'RUGER10/22', manufacturerPart: '1103', manufacturer: 'Sturm, Ruger & Co.', notes: '10/22 Standard' },
    
    // Smith & Wesson
    { rsrStock: 'SWMP9', manufacturerPart: '11912', manufacturer: 'Smith & Wesson', notes: 'M&P9' },
    { rsrStock: 'SW686', manufacturerPart: '164198', manufacturer: 'Smith & Wesson', notes: 'Model 686' },
    { rsrStock: 'SWMP15SPORT3', manufacturerPart: '12939', manufacturer: 'Smith & Wesson', notes: 'M&P15 Sport III' },
    { rsrStock: 'SWSHIELDPLUS', manufacturerPart: '13242', manufacturer: 'Smith & Wesson', notes: 'Shield Plus' },
    
    // Glock
    { rsrStock: 'GLOCK43X', manufacturerPart: 'PA435S201', manufacturer: 'Glock Inc', notes: 'Glock 43X' },
    { rsrStock: 'GLOCK19GEN5', manufacturerPart: 'PA195S201', manufacturer: 'Glock Inc', notes: 'Glock 19 Gen 5' },
    { rsrStock: 'GLOCK17GEN5', manufacturerPart: 'PA175S201', manufacturer: 'Glock Inc', notes: 'Glock 17 Gen 5' },
    
    // ZAF (Zaffiri Precision)
    { rsrStock: 'ZAFUPK195', manufacturerPart: 'UPK-19-GEN5', manufacturer: 'ZAFPRE', notes: 'Upper Parts Kit G19 Gen5' },
    { rsrStock: 'ZAFZPS319BLK', manufacturerPart: 'ZPS.3-G19-RMR-BLK', manufacturer: 'ZAFPRE', notes: 'ZPS.3 Slide G19 RMR' },
    { rsrStock: 'ZAFZPCOMPG', manufacturerPart: 'ZP-COMP-G', manufacturer: 'ZAFPRE', notes: 'Compensator Glock 9mm' },
    { rsrStock: 'ZAFZPCOMPSP', manufacturerPart: 'ZP-COMP-SP', manufacturer: 'ZAFPRE', notes: 'Compensator Special' },
  ];

  /**
   * Get the real manufacturer part number for a given RSR stock number
   */
  static getManufacturerPartNumber(rsrStockNumber: string, manufacturer: string): string | null {
    const mapping = this.MANUFACTURER_MAPPINGS.find(
      m => m.rsrStock === rsrStockNumber && 
           (m.manufacturer === manufacturer || this.isManufacturerMatch(m.manufacturer, manufacturer))
    );
    
    return mapping?.manufacturerPart || null;
  }

  /**
   * Get the proper SKU for a product (manufacturer part number if available, otherwise RSR stock)
   */
  static getProperSKU(rsrStockNumber: string, manufacturer: string, rsrMfgPartNumber?: string): string {
    // First try RSR-provided manufacturer part number
    if (rsrMfgPartNumber && rsrMfgPartNumber.trim()) {
      return rsrMfgPartNumber.trim();
    }
    
    // Then try our mapping
    const mappedPart = this.getManufacturerPartNumber(rsrStockNumber, manufacturer);
    if (mappedPart) {
      return mappedPart;
    }
    
    // Fallback to RSR stock number (but this should be rare)
    console.warn(`No manufacturer part number found for RSR stock: ${rsrStockNumber}, manufacturer: ${manufacturer}`);
    return rsrStockNumber;
  }

  /**
   * Check if manufacturer names match (accounting for variations)
   */
  private static isManufacturerMatch(mapped: string, actual: string): boolean {
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalize(mapped) === normalize(actual);
  }

  /**
   * Get all mappings for a specific manufacturer
   */
  static getMappingsForManufacturer(manufacturer: string): ManufacturerMapping[] {
    return this.MANUFACTURER_MAPPINGS.filter(
      m => this.isManufacturerMatch(m.manufacturer, manufacturer)
    );
  }

  /**
   * Validate that a product has proper manufacturer part number separation
   */
  static validateProductSeparation(sku: string, rsrStockNumber: string, manufacturerPartNumber: string | null): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check if SKU matches RSR stock (should not happen)
    if (sku === rsrStockNumber) {
      issues.push('SKU matches RSR stock number - should use manufacturer part number');
      recommendations.push('Update SKU to use real manufacturer part number');
    }
    
    // Check if manufacturer part number is missing
    if (!manufacturerPartNumber || manufacturerPartNumber.trim() === '') {
      issues.push('Missing manufacturer part number');
      recommendations.push('Add real manufacturer part number from product documentation');
    }
    
    // Check if manufacturer part number matches SKU (should match)
    if (manufacturerPartNumber && sku !== manufacturerPartNumber) {
      issues.push('SKU does not match manufacturer part number');
      recommendations.push('Update SKU to match manufacturer part number');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }
}

export const manufacturerPartService = new ManufacturerPartNumberService();