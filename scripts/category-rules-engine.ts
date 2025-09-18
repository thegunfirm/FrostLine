/**
 * Category Rules Engine - Deterministic product categorization
 * 
 * This engine implements strict precedence rules to categorize products correctly:
 * 1. NFA items → "NFA Products"
 * 2. Department 01 → "Handguns" 
 * 3. Department 05 → Split into "Rifles" vs "Shotguns" based on indicators
 * 4. Parts detection → Appropriate parts categories
 * 5. Never fallback to "Accessories" for firearms
 */

export interface ProductData {
  id: number;
  name: string;
  sku: string;
  category: string;
  department_number: string | null;
  department_desc: string | null;
  sub_department_desc: string | null;
  subcategory_name: string | null;
  nfa_item_type: string | null;
  receiver_type: string | null;
  caliber: string | null;
  requires_ffl: boolean;
  is_firearm: boolean;
  platform_category: string | null;
  manufacturer: string;
}

export interface CategoryChange {
  productId: number;
  sku: string;
  name: string;
  fromCategory: string;
  toCategory: string;
  reason: string;
}

/**
 * Determines if a product is a shotgun based on various indicators
 */
function isShotgun(product: ProductData): boolean {
  const name = product.name?.toLowerCase() || '';
  const subcategory = product.subcategory_name?.toLowerCase() || '';
  const subDept = product.sub_department_desc?.toLowerCase() || '';
  const caliber = product.caliber?.toLowerCase() || '';
  
  // Shotgun gauge indicators
  const shotgunGauges = ['12 ga', '20 ga', '28 ga', '16 ga', '10 ga', '.410', '410'];
  const hasShotgunGauge = shotgunGauges.some(gauge => 
    name.includes(gauge) || caliber.includes(gauge) || caliber.includes(gauge.replace(' ', ''))
  );
  
  // Shotgun keywords
  const shotgunKeywords = ['shotgun', 'shot gun', 'sxs', 'side by side', 'over under', 'o/u', 'semi-auto shotgun'];
  const hasShotgunKeyword = shotgunKeywords.some(keyword => 
    name.includes(keyword) || subcategory.includes(keyword) || subDept.includes(keyword)
  );
  
  return hasShotgunGauge || hasShotgunKeyword;
}

/**
 * Determines if a product is a rifle based on various indicators
 */
function isRifle(product: ProductData): boolean {
  const name = product.name?.toLowerCase() || '';
  const subcategory = product.subcategory_name?.toLowerCase() || '';
  const subDept = product.sub_department_desc?.toLowerCase() || '';
  const caliber = product.caliber?.toLowerCase() || '';
  const receiverType = product.receiver_type?.toLowerCase() || '';
  
  // Rifle caliber indicators
  const rifleCalibersExact = [
    '5.56', '223', '556', '.223', '.556',
    '308', '.308', '7.62', '7.62x51', '7.62x39',
    '300 blk', '300blk', '.300 blk', '300 blackout',
    '6.5', '6.5cm', '6.5 creedmoor', '6.5 grendel',
    '30-06', '.30-06', '270', '.270', '30-30', '.30-30',
    '7mm', '338', '.338', '375', '.375', '50 bmg', '.50 bmg',
    '22 lr', '.22 lr', '22lr', '17 hmr', '.17 hmr',
    '243', '.243', '25-06', '.25-06', '7mm-08', '280',
    '22-250', '.22-250', '204', '.204'
  ];
  
  const hasRifleCaliber = rifleCalibersExact.some(cal => {
    const normalizedCaliber = caliber.replace(/[^\w\d.-]/g, '');
    const normalizedCal = cal.replace(/[^\w\d.-]/g, '');
    return normalizedCaliber.includes(normalizedCal) || caliber.includes(cal);
  });
  
  // Rifle keywords
  const rifleKeywords = ['rifle', 'carbine', 'ar-15', 'ar15', 'ak-47', 'ak47', 'bolt action', 'semi-auto rifle'];
  const hasRifleKeyword = rifleKeywords.some(keyword => 
    name.includes(keyword) || subcategory.includes(keyword) || subDept.includes(keyword)
  );
  
  // Receiver type indicators
  const rifleReceiverTypes = ['rifle lower', 'rifle upper', 'rifle receiver'];
  const hasRifleReceiver = rifleReceiverTypes.some(type => receiverType.includes(type));
  
  return hasRifleCaliber || hasRifleKeyword || hasRifleReceiver;
}

/**
 * Determines if a product is an accessory (not a firearm)
 */
function isAccessory(product: ProductData): boolean {
  const name = product.name?.toLowerCase() || '';
  const subcategory = product.subcategory_name?.toLowerCase() || '';
  
  // Accessory keywords that clearly indicate non-firearm products
  const accessoryKeywords = [
    // Triggers and parts
    'trigger', 'spring', 'pin', 'bolt carrier', 'buffer', 'handguard',
    'stock', 'rail', 'grip', 'barrel', 'upper', 'lower', 'receiver',
    // Sights and optics  
    'sight', 'scope', 'optic', 'red dot', 'laser', 'light', 'flashlight',
    // Containers and carrying
    'holster', 'case', 'sling', 'bag', 'pouch', 'strap',
    // Cleaning and maintenance
    'cleaning', 'oil', 'solvent', 'brush', 'kit', 'tool', 'wrench', 'gauge',
    // Targets and training
    'target', 'bullseye', 'snap cap', 'dummy', 'speed loader',
    // Attachments
    'mount', 'bipod', 'adapter', 'conversion', 'plug', 'cap', 'cover', 'protector',
    // Recoil and muzzle devices
    'recoil pad', 'butt pad', 'cheek rest', 'flash hider', 'muzzle brake', 'compensator',
    // Magazines
    'magazine', 'mag ', 'mags', ' mag'
  ];
  
  // Check if product name contains accessory keywords
  const hasAccessoryKeyword = accessoryKeywords.some(keyword => 
    name.includes(keyword) || subcategory.includes(keyword)
  );
  
  // If it has accessory keywords but NO firearm model identifiers, it's an accessory
  if (hasAccessoryKeyword) {
    // Check for firearm model patterns that would indicate it's a complete firearm
    const firearmModelPatterns = [
      /glock\s*\d+/i,
      /sig\s*(p\d+|m\d+)/i,
      /smith.*wesson.*m&p/i,
      /ruger\s*(lcp|sr\d+|gp\d+|security)/i,
      /colt\s*(1911|python|anaconda)/i,
      /beretta\s*(92|m9|apx)/i,
      /\bar-?\d+/i,  // AR-15, AR-10
      /\bak-?\d+/i,  // AK-47, AK-74
      /\bm(1|4|16)\b/i,
      /\d+(\.\d+)?\s*(mm|acp|mag|special|gauge|ga)\s+(pistol|rifle|shotgun|revolver|carbine)/i
    ];
    
    const hasFirearmModel = firearmModelPatterns.some(pattern => pattern.test(name));
    
    return !hasFirearmModel;
  }
  
  return false;
}

/**
 * Determines if a product is a parts/components item
 */
function isPartsItem(product: ProductData): boolean {
  const receiverType = product.receiver_type?.toLowerCase() || '';
  const platformCategory = product.platform_category?.toLowerCase() || '';
  const name = product.name?.toLowerCase() || '';
  
  // Receiver type indicators
  const partsReceiverTypes = ['lower', 'upper', 'receiver'];
  const hasPartsReceiver = partsReceiverTypes.some(type => receiverType.includes(type));
  
  // Platform category indicates parts
  const hasPlatformCategory = Boolean(platformCategory);
  
  // Parts keywords in name
  const partsKeywords = ['upper receiver', 'lower receiver', 'receiver set', 'conversion kit'];
  const hasPartsKeyword = partsKeywords.some(keyword => name.includes(keyword));
  
  return hasPartsReceiver || hasPlatformCategory || hasPartsKeyword;
}

/**
 * Applies category rules to determine the correct category for a product
 */
export function applyCategoryRules(product: ProductData): string {
  // Rule 1: NFA items always go to NFA Products
  if (product.nfa_item_type) {
    return 'NFA Products';
  }
  
  // Rule 2: Check if this is an accessory BEFORE categorizing as firearm
  if (isAccessory(product)) {
    // Determine the specific type of accessory
    const name = product.name?.toLowerCase() || '';
    
    if (name.includes('magazine') || name.includes(' mag ') || name.includes(' mags')) {
      return 'Magazines';
    }
    if (name.includes('scope') || name.includes('optic') || name.includes('sight') || name.includes('red dot')) {
      return 'Optics';
    }
    if (name.includes('trigger') || name.includes('spring') || name.includes('barrel') || 
        name.includes('upper') || name.includes('lower') || name.includes('receiver')) {
      return 'Parts';
    }
    if (name.includes('suppressor') || name.includes('silencer')) {
      return 'NFA Products';
    }
    
    // Default accessories
    return 'Accessories';
  }
  
  // Rule 3: Department 01 → Handguns (if not an accessory)
  if (product.department_number === '01' && !isAccessory(product)) {
    return 'Handguns';
  }
  
  // Rule 4: Department 05 → Split Rifles vs Shotguns (if not an accessory)
  if (product.department_number === '05' && !isAccessory(product)) {
    // Check for parts first within long guns
    if (isPartsItem(product)) {
      if (product.receiver_type?.toLowerCase().includes('upper')) {
        return 'Upper Receivers & Conversion Kits';
      } else if (product.receiver_type?.toLowerCase().includes('lower')) {
        return 'Uppers/Lowers';
      } else {
        return 'Parts';
      }
    }
    
    // Check for shotgun indicators
    if (isShotgun(product)) {
      return 'Shotguns';
    }
    
    // Check for rifle indicators or default to rifles for department 05
    if (isRifle(product) || product.requires_ffl || product.is_firearm) {
      return 'Rifles';
    }
    
    // Default department 05 to Rifles (long guns are typically rifles)
    return 'Rifles';
  }
  
  // Rule 5: Parts detection for other departments
  if (isPartsItem(product)) {
    if (product.receiver_type?.toLowerCase().includes('upper')) {
      return 'Upper Receivers & Conversion Kits';
    } else if (product.receiver_type?.toLowerCase().includes('lower')) {
      return 'Uppers/Lowers';
    } else {
      return 'Parts';
    }
  }
  
  // Rule 6: Never fallback to Accessories for firearms
  if (product.requires_ffl || product.is_firearm) {
    // If it's a firearm but we can't categorize it properly, 
    // make a best guess based on name analysis
    if (isRifle(product)) {
      return 'Rifles';
    } else if (isShotgun(product)) {
      return 'Shotguns';
    } else {
      return 'Handguns'; // Default for unidentifiable firearms
    }
  }
  
  // For non-firearms, keep existing category (likely already correct)
  return product.category;
}

/**
 * Analyzes a product and returns category change information
 */
export function analyzeProductCategory(product: ProductData): CategoryChange | null {
  const newCategory = applyCategoryRules(product);
  
  if (newCategory !== product.category) {
    let reason = '';
    
    if (product.nfa_item_type) {
      reason = `NFA item type: ${product.nfa_item_type}`;
    } else if (product.department_number === '01') {
      reason = 'Department 01 (Handguns)';
    } else if (product.department_number === '05') {
      if (isShotgun(product)) {
        reason = 'Department 05 + shotgun indicators (gauges/keywords)';
      } else {
        reason = 'Department 05 + rifle indicators/default';
      }
    } else if (isPartsItem(product)) {
      reason = 'Parts detection (receiver type/platform category)';
    } else if (product.requires_ffl || product.is_firearm) {
      reason = 'Firearm requiring proper categorization';
    } else {
      reason = 'Category rules analysis';
    }
    
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      fromCategory: product.category,
      toCategory: newCategory,
      reason: reason
    };
  }
  
  return null;
}

/**
 * Batch analyzes products and returns summary statistics
 */
export function analyzeCategorizationChanges(products: ProductData[]): {
  changes: CategoryChange[];
  summary: Record<string, { from: Record<string, number>; to: Record<string, number> }>;
  totalChanges: number;
} {
  const changes: CategoryChange[] = [];
  const summary: Record<string, { from: Record<string, number>; to: Record<string, number> }> = {};
  
  for (const product of products) {
    const change = analyzeProductCategory(product);
    if (change) {
      changes.push(change);
      
      // Track summary statistics
      if (!summary[change.toCategory]) {
        summary[change.toCategory] = { from: {}, to: {} };
      }
      
      summary[change.toCategory].from[change.fromCategory] = 
        (summary[change.toCategory].from[change.fromCategory] || 0) + 1;
    }
  }
  
  // Calculate "to" counts for summary
  for (const change of changes) {
    if (summary[change.toCategory]) {
      summary[change.toCategory].to[change.toCategory] = 
        (summary[change.toCategory].to[change.toCategory] || 0) + 1;
    }
  }
  
  return {
    changes,
    summary,
    totalChanges: changes.length
  };
}