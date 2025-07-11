/**
 * RSR Intelligence Service
 * Analyzes RSR product names and descriptions to extract patterns and build compatibility matrices
 * Uses AI learning approach to scale across 29k+ products
 */

import { db } from '../db';
import { products } from '@shared/schema';
import { sql } from 'drizzle-orm';

interface ProductIntelligence {
  id: number;
  name: string;
  manufacturer: string;
  caliber?: string;
  barrelLength?: string;
  capacity?: string;
  action?: string;
  firearmType?: string;
  category: string;
  departmentNumber: string;
  weight?: number;
}

interface CaliberCompatibility {
  [key: string]: string[];
}

interface SimilarityScore {
  productId: number;
  score: number;
  reasons: string[];
}

export class RSRIntelligenceService {
  private caliberCompatibility: CaliberCompatibility = {};
  private productCache: Map<number, ProductIntelligence> = new Map();
  private patterns: {
    calibers: RegExp[];
    barrelLengths: RegExp[];
    capacities: RegExp[];
    actions: RegExp[];
    firearmTypes: RegExp[];
  };

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize regex patterns for extracting product information
   */
  private initializePatterns() {
    this.patterns = {
      // Caliber patterns - learned from RSR naming conventions
      calibers: [
        /\b(\d+)MM\b/i,
        /\b(\d+)\s*MAG\b/i,
        /\b(\d+)\s*MAGNUM\b/i,
        /\b(\d+)\s*ACP\b/i,
        /\b(\d+)\s*AUTO\b/i,
        /\b(\d+)\s*S&W\b/i,
        /\b(\d+)\s*SPECIAL\b/i,
        /\b(\d+)\s*SPEC\b/i,
        /\b(\d+)\s*WIN\b/i,
        /\b(\d+)\s*WINCHESTER\b/i,
        /\b(\d+)\s*REM\b/i,
        /\b(\d+)\s*REMINGTON\b/i,
        /\b(\d+)\s*GA\b/i,
        /\b(\d+)\s*GAUGE\b/i,
        /\b(\d+)\s*LR\b/i,
        /\b(\d+)\s*LONG\s*RIFLE\b/i,
        /\b(\d+)\s*WMR\b/i,
        /\b(\d+)\s*CREEDMOOR\b/i,
        /\b(\d+)\s*NOSLER\b/i,
        /\b(\d+)\s*PRC\b/i,
        /\b(\d+)\s*LAPUA\b/i,
        /\b(\d+)\s*BR\b/i,
        /\b(\d+)\s*WEATHERBY\b/i,
        /\b(\d+)\s*ULTRA\s*MAG\b/i,
        /\b(\d+)\s*SHORT\s*MAG\b/i,
        /\b(\d+)\s*WSM\b/i,
        /\b(\d+)\s*WSSM\b/i,
        /\b(\d+)\s*RUM\b/i,
        /\b(\d+)\s*SAUM\b/i,
        /\b(\d+)\s*LEG\b/i,
        /\b(\d+)\s*LEGEND\b/i,
        /\b(\d+)\s*RAPTOR\b/i,
        /\b(\d+)\s*BLACKOUT\b/i,
        /\b(\d+)\s*BLK\b/i,
        /\b(\d+)\s*GRENDEL\b/i,
        /\b(\d+)\s*VALKYRIE\b/i,
        /\b(\d+)\s*ARC\b/i,
        /\b(\d+)\s*FEDERAL\b/i,
        /\b(\d+)\s*NATO\b/i,
        /\b(\d+)\s*SWEDISH\b/i,
        /\b(\d+)\s*MAUSER\b/i,
        /\b(\d+)\s*KURZ\b/i,
        /\b(\d+)\s*NORMA\b/i,
        /\b(\d+)\s*SUPER\b/i,
        /\b(\d+)\s*COMP\b/i,
        /\b(\d+)\s*COMPETITION\b/i,
        // Special caliber formats
        /\b(\d+)X(\d+)\b/i,
        /\b(\d+)\.(\d+)\b/i,
        /\b(\d+)-(\d+)\b/i,
        /\b(\d+)\/(\d+)\b/i,
      ],
      
      // Barrel length patterns
      barrelLengths: [
        /\b(\d+(?:\.\d+)?)\s*"\s*(?:BARREL|BBL|BRL)?\b/i,
        /\b(\d+(?:\.\d+)?)\s*INCH\b/i,
        /\b(\d+(?:\.\d+)?)\s*IN\b/i,
      ],
      
      // Capacity patterns
      capacities: [
        /\b(\d+)\s*(?:RD|ROUND|ROUNDS|SHOT|SHOTS)\b/i,
        /\b(\d+)\s*(?:\+|\-)\s*(\d+)\s*(?:RD|ROUND|ROUNDS)\b/i,
      ],
      
      // Action patterns
      actions: [
        /\b(SEMI|SEMI-AUTO|SEMI-AUTOMATIC)\b/i,
        /\b(BOLT|BOLT-ACTION)\b/i,
        /\b(PUMP|PUMP-ACTION)\b/i,
        /\b(LEVER|LEVER-ACTION)\b/i,
        /\b(BREAK|BREAK-ACTION)\b/i,
        /\b(SINGLE|SINGLE-ACTION)\b/i,
        /\b(DOUBLE|DOUBLE-ACTION)\b/i,
        /\b(SA\/DA)\b/i,
        /\b(STRIKER|STRIKER-FIRED)\b/i,
        /\b(REVOLVER|REV)\b/i,
        /\b(AUTOMATIC|AUTO)\b/i,
        /\b(MANUAL|MANUAL-ACTION)\b/i,
      ],
      
      // Firearm type patterns
      firearmTypes: [
        /\b(PISTOL|HANDGUN|SIDEARM)\b/i,
        /\b(REVOLVER|REV)\b/i,
        /\b(RIFLE|CARBINE|PRECISION)\b/i,
        /\b(SHOTGUN|SCATTER|SMOOTHBORE)\b/i,
        /\b(AR|AR-15|AR-10|AR15|AR10)\b/i,
        /\b(AK|AK-47|AK-74|AK47|AK74)\b/i,
        /\b(1911|NINETEEN-ELEVEN)\b/i,
        /\b(GLOCK|GLK)\b/i,
        /\b(M&P|MP|SHIELD)\b/i,
        /\b(BERETTA|BERETTA)\b/i,
        /\b(SIG|SAUER|P320|P365|P226|P229)\b/i,
        /\b(RUGER|LCP|LC9|SR|PC|AMERICAN|PRECISION)\b/i,
        /\b(REMINGTON|REM|700|870|1100|11-87)\b/i,
        /\b(SAVAGE|SAV|AXIS|ACCUFIT|ACCUTRIGGER)\b/i,
        /\b(WINCHESTER|WIN|MODEL|SXP|XPR)\b/i,
        /\b(MOSSBERG|MOSS|500|590|935|PATRIOT)\b/i,
        /\b(SPRINGFIELD|SAINT|HELLCAT|XD|XDS|XDM)\b/i,
        /\b(KIMBER|ULTRA|CARRY|ECLIPSE|RAPTOR)\b/i,
        /\b(SMITH|WESSON|M&P|BODYGUARD|GOVERNOR)\b/i,
        /\b(COLT|1911|GOVERNMENT|COMMANDER|PYTHON)\b/i,
        /\b(TAURUS|G2|G3|PT|JUDGE|RAGING)\b/i,
        /\b(HENRY|GOLDEN|BOY|LEVER|REPEATING)\b/i,
        /\b(MARLIN|336|1894|1895|MODEL)\b/i,
        /\b(TIKKA|T3|T3X|COMPACT|LITE)\b/i,
        /\b(WEATHERBY|MARK|VANGUARD|CAMILLA)\b/i,
        /\b(BENELLI|SUPER|NOVA|MONTEFELTRO|ETHOS)\b/i,
        /\b(BROWNING|A5|CITORI|MAXUS|X-BOLT)\b/i,
        /\b(CZ|SCORPION|SHADOW|75|85|527|550|557)\b/i,
        /\b(FN|SCAR|FNX|FNS|509|545)\b/i,
        /\b(HK|H&K|VP|USP|P30|MR|HK45)\b/i,
        /\b(WALTHER|PPQ|PPS|P22|CCP|PDP)\b/i,
        /\b(CANIK|TP|SF|ELITE|COMBAT)\b/i,
        /\b(STOEGER|COACH|CONDOR|M3000|M3500)\b/i,
        /\b(ROSSI|RANCH|HAND|CIRCUIT|JUDGE)\b/i,
        /\b(CHIAPPA|RHINO|FIREARMS|1911|SAA)\b/i,
        /\b(DANIEL|DEFENSE|DD|DDM4|MK18)\b/i,
        /\b(BCMGUNFIGHTER|BCM|RECCE|ELW|BFH)\b/i,
        /\b(AERO|PRECISION|M4E1|X15|AR15)\b/i,
        /\b(PALMETTO|STATE|ARMORY|PSA|PA)\b/i,
        /\b(ANDERSON|MANUFACTURING|AM|RF85)\b/i,
        /\b(TROY|INDUSTRIES|ALPHA|BRAVO|CHARLIE)\b/i,
        /\b(NOVESKE|RIFLEWORKS|N4|N6|GEN)\b/i,
        /\b(LWRC|INTERNATIONAL|IC|M6|SPR)\b/i,
        /\b(KNIGHTS|ARMAMENT|KAC|SR|CQB)\b/i,
        /\b(LARUE|TACTICAL|OBR|PredatOBR|UUK)\b/i,
        /\b(GEISSELE|AUTOMATICS|SUPER|DUTY|DDC)\b/i,
        /\b(WILSON|COMBAT|TACTICAL|RECON|RANGER)\b/i,
        /\b(NIGHTHAWK|CUSTOM|GRP|PREDATOR|TALON)\b/i,
      ],
    };
  }

  /**
   * Extract caliber information from product name
   */
  private extractCaliber(name: string): string | null {
    const normalizedName = name.toUpperCase();
    
    for (const pattern of this.patterns.calibers) {
      const match = normalizedName.match(pattern);
      if (match) {
        // Handle different caliber formats
        if (match[1] && match[2]) {
          // Format like "6.5" or "300" with suffix
          return `${match[1]}.${match[2]}`;
        } else if (match[1]) {
          // Single number with suffix
          return match[0].trim();
        }
      }
    }
    
    return null;
  }

  /**
   * Extract barrel length from product name
   */
  private extractBarrelLength(name: string): string | null {
    const normalizedName = name.toUpperCase();
    
    for (const pattern of this.patterns.barrelLengths) {
      const match = normalizedName.match(pattern);
      if (match && match[1]) {
        return `${match[1]}"`;
      }
    }
    
    return null;
  }

  /**
   * Extract capacity information from product name
   */
  private extractCapacity(name: string): string | null {
    const normalizedName = name.toUpperCase();
    
    for (const pattern of this.patterns.capacities) {
      const match = normalizedName.match(pattern);
      if (match) {
        if (match[1] && match[2]) {
          // Format like "10+1"
          return `${match[1]}+${match[2]}`;
        } else if (match[1]) {
          // Single number
          return match[1];
        }
      }
    }
    
    return null;
  }

  /**
   * Extract action type from product name
   */
  private extractAction(name: string): string | null {
    const normalizedName = name.toUpperCase();
    
    for (const pattern of this.patterns.actions) {
      const match = normalizedName.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }
    
    return null;
  }

  /**
   * Extract firearm type from product name
   */
  private extractFirearmType(name: string): string | null {
    const normalizedName = name.toUpperCase();
    
    for (const pattern of this.patterns.firearmTypes) {
      const match = normalizedName.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }
    
    return null;
  }

  /**
   * Analyze a product and extract intelligence
   */
  private analyzeProduct(product: any): ProductIntelligence {
    const intelligence: ProductIntelligence = {
      id: product.id,
      name: product.name,
      manufacturer: product.manufacturer,
      category: product.category,
      departmentNumber: product.departmentNumber,
      weight: product.weight ? parseFloat(product.weight) : undefined,
      caliber: this.extractCaliber(product.name),
      barrelLength: this.extractBarrelLength(product.name),
      capacity: this.extractCapacity(product.name),
      action: this.extractAction(product.name),
      firearmType: this.extractFirearmType(product.name),
    };

    return intelligence;
  }

  /**
   * Build caliber compatibility matrix based on learned patterns
   */
  private buildCaliberCompatibility() {
    // Learn from common caliber families
    this.caliberCompatibility = {
      // 9mm family
      '9MM': ['9MM', '9MM LUGER', '9X19', '9PARA'],
      '9MM LUGER': ['9MM', '9MM LUGER', '9X19', '9PARA'],
      '9X19': ['9MM', '9MM LUGER', '9X19', '9PARA'],
      '9PARA': ['9MM', '9MM LUGER', '9X19', '9PARA'],
      
      // .357/.38 family
      '357MAG': ['357MAG', '357 MAG', '357 MAGNUM', '38SPEC', '38 SPEC', '38 SPECIAL'],
      '357 MAG': ['357MAG', '357 MAG', '357 MAGNUM', '38SPEC', '38 SPEC', '38 SPECIAL'],
      '357 MAGNUM': ['357MAG', '357 MAG', '357 MAGNUM', '38SPEC', '38 SPEC', '38 SPECIAL'],
      '38SPEC': ['357MAG', '357 MAG', '357 MAGNUM', '38SPEC', '38 SPEC', '38 SPECIAL'],
      '38 SPEC': ['357MAG', '357 MAG', '357 MAGNUM', '38SPEC', '38 SPEC', '38 SPECIAL'],
      '38 SPECIAL': ['357MAG', '357 MAG', '357 MAGNUM', '38SPEC', '38 SPEC', '38 SPECIAL'],
      
      // .45 ACP family
      '45ACP': ['45ACP', '45 ACP', '45AUTO', '45 AUTO'],
      '45 ACP': ['45ACP', '45 ACP', '45AUTO', '45 AUTO'],
      '45AUTO': ['45ACP', '45 ACP', '45AUTO', '45 AUTO'],
      '45 AUTO': ['45ACP', '45 ACP', '45AUTO', '45 AUTO'],
      
      // .40 S&W family
      '40SW': ['40SW', '40 SW', '40S&W', '40 S&W'],
      '40 SW': ['40SW', '40 SW', '40S&W', '40 S&W'],
      '40S&W': ['40SW', '40 SW', '40S&W', '40 S&W'],
      '40 S&W': ['40SW', '40 SW', '40S&W', '40 S&W'],
      
      // .380 ACP family
      '380ACP': ['380ACP', '380 ACP', '380AUTO', '380 AUTO'],
      '380 ACP': ['380ACP', '380 ACP', '380AUTO', '380 AUTO'],
      '380AUTO': ['380ACP', '380 ACP', '380AUTO', '380 AUTO'],
      '380 AUTO': ['380ACP', '380 ACP', '380AUTO', '380 AUTO'],
      
      // .22 LR family
      '22LR': ['22LR', '22 LR', '22 LONG RIFLE'],
      '22 LR': ['22LR', '22 LR', '22 LONG RIFLE'],
      '22 LONG RIFLE': ['22LR', '22 LR', '22 LONG RIFLE'],
      
      // 5.56/.223 family
      '223REM': ['223REM', '223 REM', '223 REMINGTON', '556NATO', '556 NATO', '5.56NATO', '5.56 NATO'],
      '223 REM': ['223REM', '223 REM', '223 REMINGTON', '556NATO', '556 NATO', '5.56NATO', '5.56 NATO'],
      '223 REMINGTON': ['223REM', '223 REM', '223 REMINGTON', '556NATO', '556 NATO', '5.56NATO', '5.56 NATO'],
      '556NATO': ['223REM', '223 REM', '223 REMINGTON', '556NATO', '556 NATO', '5.56NATO', '5.56 NATO'],
      '556 NATO': ['223REM', '223 REM', '223 REMINGTON', '556NATO', '556 NATO', '5.56NATO', '5.56 NATO'],
      '5.56NATO': ['223REM', '223 REM', '223 REMINGTON', '556NATO', '556 NATO', '5.56NATO', '5.56 NATO'],
      '5.56 NATO': ['223REM', '223 REM', '223 REMINGTON', '556NATO', '556 NATO', '5.56NATO', '5.56 NATO'],
      
      // .308 Winchester/7.62x51 family
      '308WIN': ['308WIN', '308 WIN', '308 WINCHESTER', '762NATO', '762 NATO', '7.62NATO', '7.62 NATO'],
      '308 WIN': ['308WIN', '308 WIN', '308 WINCHESTER', '762NATO', '762 NATO', '7.62NATO', '7.62 NATO'],
      '308 WINCHESTER': ['308WIN', '308 WIN', '308 WINCHESTER', '762NATO', '762 NATO', '7.62NATO', '7.62 NATO'],
      '762NATO': ['308WIN', '308 WIN', '308 WINCHESTER', '762NATO', '762 NATO', '7.62NATO', '7.62 NATO'],
      '762 NATO': ['308WIN', '308 WIN', '308 WINCHESTER', '762NATO', '762 NATO', '7.62NATO', '7.62 NATO'],
      '7.62NATO': ['308WIN', '308 WIN', '308 WINCHESTER', '762NATO', '762 NATO', '7.62NATO', '7.62 NATO'],
      '7.62 NATO': ['308WIN', '308 WIN', '308 WINCHESTER', '762NATO', '762 NATO', '7.62NATO', '7.62 NATO'],
      
      // 12 gauge family
      '12GA': ['12GA', '12 GA', '12 GAUGE'],
      '12 GA': ['12GA', '12 GA', '12 GAUGE'],
      '12 GAUGE': ['12GA', '12 GA', '12 GAUGE'],
      
      // 20 gauge family
      '20GA': ['20GA', '20 GA', '20 GAUGE'],
      '20 GA': ['20GA', '20 GA', '20 GAUGE'],
      '20 GAUGE': ['20GA', '20 GA', '20 GAUGE'],
    };
  }

  /**
   * Check if two calibers are compatible
   */
  private areCalibersCompatible(caliber1: string, caliber2: string): boolean {
    if (!caliber1 || !caliber2) return false;
    
    const normalizedCaliber1 = caliber1.toUpperCase().trim();
    const normalizedCaliber2 = caliber2.toUpperCase().trim();
    
    if (normalizedCaliber1 === normalizedCaliber2) return true;
    
    const compatibleCalibers = this.caliberCompatibility[normalizedCaliber1];
    if (compatibleCalibers && compatibleCalibers.includes(normalizedCaliber2)) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate similarity score between two products
   */
  private calculateSimilarityScore(product1: ProductIntelligence, product2: ProductIntelligence): SimilarityScore {
    let score = 0;
    const reasons: string[] = [];

    // Perfect match bonus (same manufacturer + caliber + firearm type)
    if (product1.manufacturer === product2.manufacturer && 
        this.areCalibersCompatible(product1.caliber, product2.caliber) && 
        product1.firearmType === product2.firearmType) {
      score += 170;
      reasons.push('Perfect match (manufacturer + caliber + type)');
    }

    // Manufacturer match
    if (product1.manufacturer === product2.manufacturer) {
      score += 50;
      reasons.push('Same manufacturer');
    }

    // Caliber compatibility
    if (this.areCalibersCompatible(product1.caliber, product2.caliber)) {
      score += 80;
      reasons.push('Compatible caliber');
    }

    // Firearm type match
    if (product1.firearmType === product2.firearmType) {
      score += 60;
      reasons.push('Same firearm type');
    }

    // Category match
    if (product1.category === product2.category) {
      score += 40;
      reasons.push('Same category');
    }

    // Department match
    if (product1.departmentNumber === product2.departmentNumber) {
      score += 30;
      reasons.push('Same department');
    }

    // Barrel length similarity (within 2 inches)
    if (product1.barrelLength && product2.barrelLength) {
      const length1 = parseFloat(product1.barrelLength.replace('"', ''));
      const length2 = parseFloat(product2.barrelLength.replace('"', ''));
      if (!isNaN(length1) && !isNaN(length2)) {
        const diff = Math.abs(length1 - length2);
        if (diff <= 2) {
          score += 20;
          reasons.push('Similar barrel length');
        }
      }
    }

    // Capacity similarity (within 3 rounds)
    if (product1.capacity && product2.capacity) {
      const capacity1 = parseInt(product1.capacity);
      const capacity2 = parseInt(product2.capacity);
      if (!isNaN(capacity1) && !isNaN(capacity2)) {
        const diff = Math.abs(capacity1 - capacity2);
        if (diff <= 3) {
          score += 15;
          reasons.push('Similar capacity');
        }
      }
    }

    // Action type match
    if (product1.action === product2.action) {
      score += 25;
      reasons.push('Same action type');
    }

    // Weight similarity (within 20% for hunters/competitive shooters)
    if (product1.weight && product2.weight) {
      const weightDiff = Math.abs(product1.weight - product2.weight);
      const avgWeight = (product1.weight + product2.weight) / 2;
      const percentDiff = (weightDiff / avgWeight) * 100;
      if (percentDiff <= 20) {
        score += 10;
        reasons.push('Similar weight');
      }
    }

    return {
      productId: product2.id,
      score,
      reasons,
    };
  }

  /**
   * Load and analyze all products from database
   */
  async loadProductIntelligence(): Promise<void> {
    console.log('🧠 Loading RSR product intelligence...');
    
    const allProducts = await db.select({
      id: products.id,
      name: products.name,
      manufacturer: products.manufacturer,
      category: products.category,
      departmentNumber: products.departmentNumber,
      weight: products.weight,
    }).from(products);

    console.log(`🔍 Analyzing ${allProducts.length} products for intelligence patterns...`);

    // Analyze each product and build intelligence cache
    for (const product of allProducts) {
      const intelligence = this.analyzeProduct(product);
      this.productCache.set(product.id, intelligence);
    }

    // Build caliber compatibility matrix
    this.buildCaliberCompatibility();

    console.log(`✅ RSR Intelligence loaded: ${this.productCache.size} products analyzed`);
    console.log(`📊 Caliber compatibility matrix: ${Object.keys(this.caliberCompatibility).length} caliber families`);
  }

  /**
   * Find related products using AI learning approach
   */
  async findRelatedProducts(productId: number, limit: number = 8): Promise<any[]> {
    // Ensure intelligence is loaded
    if (this.productCache.size === 0) {
      await this.loadProductIntelligence();
    }

    const targetProduct = this.productCache.get(productId);
    if (!targetProduct) {
      return [];
    }

    console.log(`🎯 Finding related products for: ${targetProduct.name}`);
    console.log(`🔍 Extracted: caliber=${targetProduct.caliber}, type=${targetProduct.firearmType}, barrel=${targetProduct.barrelLength}`);

    // Calculate similarity scores for all other products
    const similarities: SimilarityScore[] = [];
    
    // Get random sample of candidates to ensure diversity
    const allProductIds = Array.from(this.productCache.keys()).filter(id => id !== productId);
    const candidateIds = this.getRandomSample(allProductIds, 500); // Sample 500 candidates

    for (const candidateId of candidateIds) {
      const candidate = this.productCache.get(candidateId);
      if (candidate) {
        const similarity = this.calculateSimilarityScore(targetProduct, candidate);
        if (similarity.score > 50) { // Minimum threshold for relevance
          similarities.push(similarity);
        }
      }
    }

    // Sort by score and take top results
    similarities.sort((a, b) => b.score - a.score);
    const topSimilarities = similarities.slice(0, limit);

    console.log(`📈 Top similarities found: ${topSimilarities.length} products`);
    topSimilarities.forEach((sim, index) => {
      const product = this.productCache.get(sim.productId);
      console.log(`${index + 1}. ${product?.name} (Score: ${sim.score}) - ${sim.reasons.join(', ')}`);
    });

    // Fetch full product details for the top matches
    const relatedProductIds = topSimilarities.map(s => s.productId);
    
    if (relatedProductIds.length === 0) {
      return [];
    }

    const relatedProducts = await db.select({
      id: products.id,
      name: products.name,
      manufacturer: products.manufacturer,
      sku: products.sku,
      priceBronze: products.priceBronze,
      priceGold: products.priceGold,
      pricePlatinum: products.pricePlatinum,
      inStock: products.inStock,
      requiresFFL: products.requiresFFL,
      category: products.category,
    }).from(products)
      .where(sql`${products.id} IN (${sql.join(relatedProductIds.map(id => sql`${id}`), sql`, `)})`);

    // Maintain the order from similarity scoring
    const orderedResults = relatedProductIds.map(id => 
      relatedProducts.find(p => p.id === id)
    ).filter(Boolean);

    return orderedResults;
  }

  /**
   * Get random sample from array for diversity
   */
  private getRandomSample<T>(array: T[], sampleSize: number): T[] {
    if (array.length <= sampleSize) {
      return array;
    }
    
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, sampleSize);
  }

  /**
   * Get intelligence statistics for debugging
   */
  getIntelligenceStats(): any {
    const stats = {
      totalProducts: this.productCache.size,
      calibersFound: new Set<string>(),
      firearmTypesFound: new Set<string>(),
      actionsFound: new Set<string>(),
      manufacturersFound: new Set<string>(),
      categoriesFound: new Set<string>(),
    };

    for (const product of this.productCache.values()) {
      if (product.caliber) stats.calibersFound.add(product.caliber);
      if (product.firearmType) stats.firearmTypesFound.add(product.firearmType);
      if (product.action) stats.actionsFound.add(product.action);
      if (product.manufacturer) stats.manufacturersFound.add(product.manufacturer);
      if (product.category) stats.categoriesFound.add(product.category);
    }

    return {
      totalProducts: stats.totalProducts,
      uniqueCalibers: Array.from(stats.calibersFound).sort(),
      uniqueFirearmTypes: Array.from(stats.firearmTypesFound).sort(),
      uniqueActions: Array.from(stats.actionsFound).sort(),
      uniqueManufacturers: Array.from(stats.manufacturersFound).sort(),
      uniqueCategories: Array.from(stats.categoriesFound).sort(),
      caliberCompatibilityMatrix: this.caliberCompatibility,
    };
  }
}

// Export singleton instance
export const rsrIntelligence = new RSRIntelligenceService();