import { 
  users, 
  products, 
  orders, 
  ffls, 
  stateShippingPolicies,
  tierPricingRules,
  heroCarouselSlides,
  type User, 
  type InsertUser,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type FFL,
  type InsertFFL,
  type StateShippingPolicy,
  type TierPricingRule,
  type HeroCarouselSlide,
  type InsertHeroCarouselSlide
} from "@shared/schema";
import { db } from "./db";
import { eq, like, ilike, and, or, desc, asc, ne, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  updateUserTier(id: number, tier: string): Promise<User>;
  verifyUserEmail(token: string): Promise<User | undefined>;
  
  // Product operations
  getProducts(filters?: {
    category?: string;
    manufacturer?: string;
    search?: string;
    inStock?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product>;
  searchProducts(query: string, limit?: number): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  getRelatedProducts(productId: number, category: string, manufacturer: string): Promise<Product[]>;
  getRelatedProductsDebug(productId: number, category: string, manufacturer: string): Promise<any[]>;
  
  // Order operations
  getOrders(userId?: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order>;
  getUserOrders(userId: number): Promise<Order[]>;
  
  // FFL operations
  getFFLs(filters?: { zip?: string; status?: string }): Promise<FFL[]>;
  getFFL(id: number): Promise<FFL | undefined>;
  createFFL(ffl: InsertFFL): Promise<FFL>;
  updateFFL(id: number, updates: Partial<FFL>): Promise<FFL>;
  searchFFLsByZip(zip: string, radius?: number): Promise<FFL[]>;
  
  // State shipping policies
  getStateShippingPolicies(): Promise<StateShippingPolicy[]>;
  getStateShippingPolicy(state: string): Promise<StateShippingPolicy | undefined>;
  
  // Tier pricing rules
  getTierPricingRules(): Promise<TierPricingRule[]>;
  getActiveTierPricingRules(): Promise<TierPricingRule[]>;
  
  // Hero carousel slides
  getHeroCarouselSlides(): Promise<HeroCarouselSlide[]>;
  getHeroCarouselSlide(id: number): Promise<HeroCarouselSlide | undefined>;
  createHeroCarouselSlide(slide: InsertHeroCarouselSlide): Promise<HeroCarouselSlide>;
  updateHeroCarouselSlide(id: number, updates: Partial<HeroCarouselSlide>): Promise<HeroCarouselSlide>;
  deleteHeroCarouselSlide(id: number): Promise<void>;
  getActiveHeroCarouselSlides(): Promise<HeroCarouselSlide[]>;
  
  // Product management
  clearAllProducts(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserTier(id: number, tier: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ subscriptionTier: tier })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async verifyUserEmail(token: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ 
        emailVerified: true, 
        emailVerificationToken: null 
      })
      .where(eq(users.emailVerificationToken, token))
      .returning();
    return user || undefined;
  }

  // Product operations
  async getProducts(filters?: {
    category?: string;
    manufacturer?: string;
    search?: string;
    inStock?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    // For now, use the same pattern as getFeaturedProducts but apply filters after
    const allProducts = await db.select().from(products)
      .where(eq(products.isActive, true))
      .orderBy(desc(products.createdAt));
    
    // Apply client-side filtering for now to test functionality
    let filteredProducts = allProducts;
    
    if (filters?.category) {
      filteredProducts = filteredProducts.filter(p => p.category === filters.category);
    }
    
    if (filters?.manufacturer) {
      filteredProducts = filteredProducts.filter(p => p.manufacturer === filters.manufacturer);
    }
    
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        (p.description && p.description.toLowerCase().includes(searchTerm))
      );
    }
    
    if (filters?.inStock !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.inStock === filters.inStock);
    }
    
    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 20;
    
    return filteredProducts.slice(offset, offset + limit);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const [product] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return product;
  }

  async searchProducts(query: string, limit = 20): Promise<Product[]> {
    return await db.select().from(products)
      .where(
        and(
          or(
            like(products.name, `%${query}%`),
            like(products.description, `%${query}%`),
            like(products.manufacturer, `%${query}%`)
          ),
          eq(products.isActive, true)
        )
      )
      .limit(limit)
      .orderBy(desc(products.createdAt));
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db.select().from(products)
      .where(and(eq(products.category, category), eq(products.isActive, true)))
      .orderBy(desc(products.createdAt));
  }

  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.isActive, true))
      .orderBy(desc(products.createdAt))
      .limit(limit);
  }

  async getRelatedProducts(productId: number, category: string, manufacturer: string): Promise<Product[]> {
    // Get the current product to extract attributes
    const [currentProduct] = await db.select().from(products).where(eq(products.id, productId));
    if (!currentProduct) return [];

    // Extract caliber and firearm type using the enhanced extractors
    const caliber = this.extractCaliber(currentProduct.name);
    const firearmType = this.extractFirearmType(currentProduct.name);

    // Use Algolia search with intelligent filtering for related products
    return await this.searchRelatedProductsViaAlgolia(productId, category, manufacturer, caliber, firearmType);
  }

  // Search for related products using universal metadata-based approach
  private async searchRelatedProductsViaAlgolia(
    productId: number, 
    category: string, 
    manufacturer: string,
    caliber: string | null,
    firearmType: string | null
  ): Promise<Product[]> {
    // For now, use simple database query with metadata-based scoring
    // Once metadata enrichment completes, we'll use the new fields
    try {
      // Get a diverse set of candidates to ensure we find matches
      // Use ORDER BY RANDOM() to get a diverse sample across the entire catalog
      const candidates = await db.select().from(products)
        .where(and(
          eq(products.isActive, true),
          eq(products.category, category),
          ne(products.id, productId)
        ))
        .orderBy(sql`RANDOM()`)
        .limit(200); // Random sample to ensure diverse products
      
      // Score products based on available metadata
      const scoredProducts = candidates.map(product => {
        let score = 0;
        
        // Same manufacturer gets points
        if (product.manufacturer === manufacturer) {
          score += 30;
        }
        
        // Extract caliber and firearm type for scoring
        const productCaliber = this.extractCaliber(product.name);
        const productFirearmType = this.extractFirearmType(product.name);
        
        // Same caliber gets high points
        if (caliber && productCaliber === caliber) {
          score += 50;
        }
        
        // Same firearm type gets high points
        if (firearmType && productFirearmType === firearmType) {
          score += 60;
        }
        
        // Both caliber and firearm type match = perfect match
        if (caliber && firearmType && productCaliber === caliber && productFirearmType === firearmType) {
          score += 25;
        }
        
        // Compatible calibers for revolvers get medium points
        if (firearmType === 'REVOLVER' && productFirearmType === 'REVOLVER') {
          if ((caliber === '357MAG' && productCaliber === '38SPEC') || 
              (caliber === '38SPEC' && productCaliber === '357MAG')) {
            score += 40; // 357 MAG revolvers can shoot 38 SPEC
          }
        }
        
        // In stock products get small bonus
        if (product.inStock) {
          score += 5;
        }
        
        return { ...product, score };
      });
      
      // Sort by score and return top 8
      return scoredProducts
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ score, ...product }) => product);
        
    } catch (error) {
      console.error('Error in related products search:', error);
      // Simple fallback
      return await db.select().from(products)
        .where(and(
          eq(products.isActive, true),
          eq(products.category, category),
          ne(products.id, productId)
        ))
        .limit(8);
    }
  }

  async getRelatedProductsDebug(
    productId: number,
    category: string,
    manufacturer: string
  ): Promise<any[]> {
    // Get the reference product for caliber/firearm type extraction
    const referenceProduct = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!referenceProduct.length) return [];
    
    const caliber = this.extractCaliber(referenceProduct[0].name);
    const firearmType = this.extractFirearmType(referenceProduct[0].name);
    
    // Get diverse candidates using random sampling
    const candidates = await db.select().from(products)
      .where(and(
        eq(products.isActive, true),
        eq(products.category, category),
        ne(products.id, productId)
      ))
      .orderBy(sql`RANDOM()`)
      .limit(200);
    
    // Score products and return with debug info
    const scoredProducts = candidates.map(product => {
      let score = 0;
      const scoreBreakdown: any = {};
      
      // Same manufacturer gets points
      if (product.manufacturer === manufacturer) {
        score += 30;
        scoreBreakdown.manufacturer = 30;
      }
      
      // Extract caliber and firearm type for scoring
      const productCaliber = this.extractCaliber(product.name);
      const productFirearmType = this.extractFirearmType(product.name);
      
      // Same caliber gets high points
      if (caliber && productCaliber === caliber) {
        score += 50;
        scoreBreakdown.caliber = 50;
      }
      
      // Same firearm type gets high points
      if (firearmType && productFirearmType === firearmType) {
        score += 60;
        scoreBreakdown.firearmType = 60;
      }
      
      // Both caliber and firearm type match = perfect match
      if (caliber && firearmType && productCaliber === caliber && productFirearmType === firearmType) {
        score += 25;
        scoreBreakdown.perfectMatch = 25;
      }
      
      // Compatible calibers for revolvers get medium points
      if (firearmType === 'REVOLVER' && productFirearmType === 'REVOLVER') {
        if ((caliber === '357MAG' && productCaliber === '38SPEC') || 
            (caliber === '38SPEC' && productCaliber === '357MAG')) {
          score += 40;
          scoreBreakdown.compatibleCaliber = 40;
        }
      }
      
      // In stock products get small bonus
      if (product.inStock) {
        score += 5;
        scoreBreakdown.inStock = 5;
      }
      
      return {
        ...product,
        score,
        scoreBreakdown,
        detectedCaliber: productCaliber,
        detectedFirearmType: productFirearmType,
        referenceCaliber: caliber,
        referenceFirearmType: firearmType
      };
    });
    
    return scoredProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Return top 20 for debugging
  }

  // Enhanced caliber extraction for accurate scoring
  private extractCaliber(name: string): string | null {
    // Most specific patterns first
    if (name.match(/357\s*SIG/i)) return '357SIG';
    if (name.match(/357\s*MAG|\.357\s*MAG|357\/38/i)) return '357MAG';
    if (name.match(/38\s*SPEC|\.38\s*SPEC|38\s*SPL|\.38\s*SPL/i)) return '38SPEC';
    if (name.match(/44\s*MAG|\.44\s*MAG/i)) return '44MAG';
    if (name.match(/45\s*ACP|\.45\s*ACP/i)) return '45ACP';
    if (name.match(/40\s*S&W|\.40\s*S&W/i)) return '40SW';
    if (name.match(/380\s*ACP|\.380\s*ACP/i)) return '380ACP';
    if (name.match(/9\s*MM|9MM/i)) return '9MM';
    if (name.match(/10\s*MM|10MM/i)) return '10MM';
    if (name.match(/22\s*LR|\.22\s*LR/i)) return '22LR';
    if (name.match(/223\s*REM|\.223/i)) return '223REM';
    if (name.match(/5\.56|556/i)) return '5.56NATO';
    if (name.match(/308\s*WIN|\.308/i)) return '308WIN';
    if (name.match(/30-06|\.30-06/i)) return '30-06';
    if (name.match(/12\s*GA|12\s*GAUGE/i)) return '12GA';
    if (name.match(/20\s*GA|20\s*GAUGE/i)) return '20GA';
    return null;
  }

  // Enhanced firearm type extraction for accurate scoring
  private extractFirearmType(name: string): string | null {
    // Check for revolvers first (more specific)
    if (name.match(/revolver/i) || name.match(/357\s*MAG|44\s*MAG|38\s*SPEC|38\s*SPL|357\/38/i)) return 'REVOLVER';
    
    // Specific firearm patterns
    if (name.match(/ultra\s*carry/i)) return 'ULTRA_CARRY';
    if (name.match(/commander/i)) return 'COMMANDER';
    if (name.match(/government/i)) return 'GOVERNMENT';
    if (name.match(/1911/i)) return '1911';
    if (name.match(/glock/i)) return 'GLOCK';
    if (name.match(/ar-15|ar15/i)) return 'AR15';
    if (name.match(/ar-10|ar10/i)) return 'AR10';
    if (name.match(/ak-47|ak47/i)) return 'AK47';
    
    // General types
    if (name.match(/shotgun/i)) return 'SHOTGUN';
    if (name.match(/rifle/i)) return 'RIFLE';
    if (name.match(/pistol/i)) return 'PISTOL';
    
    return null;
  }

  // Build intelligent search queries for related products
  private buildRelatedProductSearchQueries(
    category: string,
    manufacturer: string,
    caliber: string | null,
    firearmType: string | null
  ): Array<{ query: string; maxResults: number; priority: number }> {
    const queries = [];

    // Priority 1: Exact firearm type + caliber match (e.g., "1911 9mm")
    if (firearmType && caliber) {
      queries.push({
        query: `${firearmType} ${caliber}`,
        maxResults: 20,
        priority: 100
      });
    }

    // Priority 2: Firearm type match (e.g., "1911")
    if (firearmType) {
      queries.push({
        query: firearmType,
        maxResults: 15,
        priority: 80
      });
    }

    // Priority 3: Caliber + manufacturer match (e.g., "9mm Kimber")
    if (caliber && manufacturer) {
      queries.push({
        query: `${caliber} ${manufacturer}`,
        maxResults: 10,
        priority: 70
      });
    }

    // Priority 4: Caliber match (e.g., "9mm")
    if (caliber) {
      queries.push({
        query: caliber,
        maxResults: 10,
        priority: 60
      });
    }

    // Priority 5: Manufacturer match (e.g., "Kimber")
    queries.push({
      query: manufacturer,
      maxResults: 8,
      priority: 50
    });

    // Priority 6: Category general search (fallback)
    queries.push({
      query: '',
      maxResults: 8,
      priority: 30
    });

    return queries;
  }

  // Convert Algolia hit back to Product format
  private algoliaHitToProduct(hit: any): Product {
    return {
      id: hit.id || 0,
      name: hit.name || hit.title || '',
      description: hit.description || '',
      category: hit.categoryName || '',
      subcategoryName: hit.subcategoryName || null,
      departmentNumber: hit.departmentNumber || null,
      departmentDesc: hit.departmentDesc || null,
      subDepartmentDesc: hit.subDepartmentDesc || null,
      manufacturer: hit.manufacturerName || '',
      manufacturerPartNumber: hit.manufacturerPartNumber || null,
      sku: hit.sku || hit.objectID || '',
      priceWholesale: hit.dealerPrice || '0',
      priceMAP: hit.retailMap || null,
      priceMSRP: hit.msrp || null,
      priceBronze: hit.tierPricing?.bronze || '0',
      priceGold: hit.tierPricing?.gold || '0',
      pricePlatinum: hit.tierPricing?.platinum || '0',
      inStock: hit.inStock || false,
      stockQuantity: hit.inventory?.onHand || 0,
      allocated: hit.inventory?.allocated ? 'Y' : 'N',
      newItem: hit.newItem || false,
      promo: hit.promo || null,
      accessories: hit.accessories || null,
      distributor: hit.distributor || 'RSR',
      requiresFFL: hit.requiresFFL || false,
      mustRouteThroughGunFirm: hit.mustRouteThroughGunFirm || false,
      tags: hit.tags || [],
      images: hit.images || [],
      upcCode: hit.upcCode || null,
      weight: hit.weight || '0',
      dimensions: hit.dimensions || null,
      restrictions: hit.restrictions || null,
      stateRestrictions: hit.stateRestrictions || null,
      groundShipOnly: hit.groundShipOnly || false,
      adultSignatureRequired: hit.adultSignatureRequired || false,
      dropShippable: hit.dropShippable ?? true,
      prop65: hit.prop65 || false,
      returnPolicyDays: hit.returnPolicyDays || 30,
      isActive: hit.isActive ?? true,
      createdAt: hit.createdAt ? new Date(hit.createdAt) : new Date(),
    };
  }

  // Extract caliber and firearm type from product name and tags
  private extractFirearmAttributes(name: string, tags: any): { caliber: string | null, firearmType: string | null } {
    const nameUpper = name.toUpperCase();
    const tagsList = Array.isArray(tags) ? tags.map(tag => tag.toUpperCase()) : [];
    const searchText = (nameUpper + ' ' + tagsList.join(' ')).toUpperCase();

    // Common calibers (prioritized by specificity)
    const calibers = ['9MM', '9 MM', '.45ACP', '45ACP', '45 ACP', '.45', '.40SW', '40SW', '40 S&W', '.40', '.357MAG', '357MAG', '.357', '357', '.38SPEC', '38SPEC', '.38', '.380ACP', '380ACP', '.380', 
                      '10MM', '10 MM', '.22LR', '22LR', '22 LR', '.22', '.223REM', '223REM', '.223', '223', '5.56NATO', '5.56', '.308WIN', '308WIN', '.308', '308', '.300', '300', 
                      '.270WIN', '270WIN', '.270', '270', '.243WIN', '243WIN', '.243', '243', '.30-06', '30-06', '.50AE', '50AE', '.50', '50', '7.62X39', '7.62', '6.5CREED', '6.5'];
    
    // Specific firearm types (prioritized by specificity - most specific first)
    const firearmTypes = [
      // 1911 specific variants (highest priority)
      'ULTRA CARRY II', 'ULTRA CARRY', 'COMMANDER', 'OFFICER', 'GOVERNMENT', 'FULL SIZE 1911', 'COMPACT 1911', 
      '1911A1', '1911', 'SR1911', 'STAINLESS II', 'STAINLESS TARGET II', 'GOLD MATCH II', 'CUSTOM II', 'PRO CARRY',
      // Glock variants
      'GLOCK 17', 'GLOCK 19', 'GLOCK 21', 'GLOCK 22', 'GLOCK 23', 'GLOCK 26', 'GLOCK 27', 'GLOCK 29', 'GLOCK 30', 'GLOCK 34', 'GLOCK 35', 'GLOCK 43', 'GLOCK 48', 'GLOCK',
      // Revolver types
      'SINGLE ACTION REVOLVER', 'DOUBLE ACTION REVOLVER', 'REVOLVER', 'SINGLE ACTION', 'DOUBLE ACTION', 
      // Rifle types
      'AR-15', 'AR15', 'AK-47', 'AK47', 'BOLT ACTION', 'LEVER ACTION', 'SEMI-AUTO RIFLE',
      // General action types
      'STRIKER FIRED', 'HAMMER FIRED', 'STRIKER', 'HAMMER', 'SEMI-AUTO', 'PUMP', 'LEVER'
    ];

    let caliber: string | null = null;
    let firearmType: string | null = null;

    // Find caliber (prioritize more specific matches first)
    for (const cal of calibers) {
      if (searchText.includes(cal)) {
        caliber = cal;
        break;
      }
    }

    // Find firearm type (prioritize more specific matches first)
    for (const type of firearmTypes) {
      if (searchText.includes(type)) {
        firearmType = type;
        break;
      }
    }

    return { caliber, firearmType };
  }

  // Calculate similarity score between products
  private calculateSimilarityScore(product: Product, reference: { caliber: string | null, firearmType: string | null, manufacturer: string }): number {
    let score = 0;
    const { caliber: productCaliber, firearmType: productFirearmType } = this.extractFirearmAttributes(product.name, product.tags);

    // Matching firearm type gets highest priority (especially for 1911s)
    if (reference.firearmType && productFirearmType === reference.firearmType) {
      // 1911s get extra high priority when matching other 1911s
      if (reference.firearmType.includes('1911') || reference.firearmType.includes('ULTRA CARRY') || reference.firearmType.includes('COMMANDER')) {
        score += 70; // Very high score for 1911 matches
      } else {
        score += 60; // High score for other firearm type matches
      }
    }
    
    // Special case: If this is a 1911 product and the reference is also a 1911, give partial match bonus
    else if (reference.firearmType && 
             (reference.firearmType.includes('1911') || reference.firearmType.includes('ULTRA CARRY') || reference.firearmType.includes('COMMANDER')) &&
             productFirearmType && 
             (productFirearmType.includes('1911') || productFirearmType.includes('ULTRA CARRY') || productFirearmType.includes('COMMANDER'))) {
      score += 50; // Partial 1911 match bonus
    }

    // Matching caliber gets very high score
    if (reference.caliber && productCaliber === reference.caliber) {
      score += 50;
    }

    // Same manufacturer gets moderate score (less than firearm type/caliber)
    if (product.manufacturer === reference.manufacturer) {
      score += 30;
    }
    
    // Bonus for both caliber AND firearm type match (perfect match)
    if (reference.caliber && productCaliber === reference.caliber && 
        reference.firearmType && productFirearmType === reference.firearmType) {
      score += 25; // Extra bonus for perfect match
    }

    // In stock products get small bonus
    if (product.inStock) {
      score += 5;
    }

    return score;
  }

  // Order operations
  async getOrders(userId?: number): Promise<Order[]> {
    let query = db.select().from(orders);
    
    if (userId) {
      query = query.where(eq(orders.userId, userId));
    }
    
    return await query.orderBy(desc(orders.orderDate));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const [order] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return order;
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.orderDate));
  }

  // FFL operations
  async getFFLs(filters?: { zip?: string; status?: string }): Promise<FFL[]> {
    let query = db.select().from(ffls);
    
    const conditions = [];
    
    if (filters?.zip) {
      conditions.push(eq(ffls.zip, filters.zip));
    }
    
    if (filters?.status) {
      conditions.push(eq(ffls.status, filters.status));
    }
    
    conditions.push(eq(ffls.isAvailableToUser, true));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(asc(ffls.businessName));
  }

  async getFFL(id: number): Promise<FFL | undefined> {
    const [ffl] = await db.select().from(ffls).where(eq(ffls.id, id));
    return ffl || undefined;
  }

  async createFFL(insertFFL: InsertFFL): Promise<FFL> {
    const [ffl] = await db.insert(ffls).values(insertFFL).returning();
    return ffl;
  }

  async searchFFLsByZip(zip: string, radiusMiles: number = 25): Promise<FFL[]> {
    // For now, return FFLs with same ZIP and nearby ones
    // In production, you'd implement proper geolocation search
    const exactMatches = await db.select().from(ffls)
      .where(and(
        eq(ffls.zip, zip),
        eq(ffls.isAvailableToUser, true)
      ))
      .orderBy(asc(ffls.businessName));
    
    if (exactMatches.length > 0) {
      return exactMatches;
    }
    
    // Fallback: return all available FFLs in same state/region
    // This is a simplified implementation
    return await db.select().from(ffls)
      .where(eq(ffls.isAvailableToUser, true))
      .orderBy(asc(ffls.businessName))
      .limit(20);
  }

  // Cart persistence operations
  async saveUserCart(userId: number, items: any[]): Promise<void> {
    const existingCart = await db.select().from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);
    
    if (existingCart.length > 0) {
      await db.update(carts)
        .set({ 
          items: JSON.stringify(items), 
          updatedAt: new Date() 
        })
        .where(eq(carts.userId, userId));
    } else {
      await db.insert(carts).values({
        userId,
        items: JSON.stringify(items),
        updatedAt: new Date()
      });
    }
  }

  async getUserCart(userId: number): Promise<{ items: any[] } | undefined> {
    const [cart] = await db.select().from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);
    
    if (!cart) return undefined;
    
    return {
      items: typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items
    };
  }

  // Fulfillment settings operations
  async getFulfillmentSettings(): Promise<any[]> {
    return await db.select().from(fulfillmentSettings)
      .where(eq(fulfillmentSettings.isActive, true))
      .orderBy(asc(fulfillmentSettings.type));
  }

  // Checkout settings operations
  async getCheckoutSettings(): Promise<Record<string, string>> {
    const settings = await db.select().from(checkoutSettings);
    const result: Record<string, string> = {};
    
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });
    
    return result;
  }

  async updateFFL(id: number, updates: Partial<FFL>): Promise<FFL> {
    const [ffl] = await db.update(ffls).set(updates).where(eq(ffls.id, id)).returning();
    return ffl;
  }

  async searchFFLsByZip(zip: string, radius = 25): Promise<FFL[]> {
    // Simple zip-based search for now
    return await db.select().from(ffls)
      .where(and(
        like(ffls.zip, `${zip.substring(0, 3)}%`),
        eq(ffls.isAvailableToUser, true)
      ))
      .orderBy(asc(ffls.businessName));
  }

  async getAllFFLs(): Promise<FFL[]> {
    return await db.select().from(ffls)
      .orderBy(asc(ffls.businessName));
  }

  async createFFL(fflData: any): Promise<FFL> {
    const [ffl] = await db.insert(ffls)
      .values(fflData)
      .returning();
    return ffl;
  }

  async deleteFFL(id: number): Promise<void> {
    await db.delete(ffls)
      .where(eq(ffls.id, id));
  }

  async importFFLsFromCSV(csvData: string): Promise<{ imported: number; skipped: number }> {
    const lines = csvData.trim().split('\n');
    let imported = 0;
    let skipped = 0;
    
    for (let i = 1; i < lines.length; i++) { // Skip header
      try {
        const [businessName, licenseNumber, email, phone, street, city, state, zip, status] = lines[i].split(',');
        
        if (!businessName || !licenseNumber || !zip) {
          skipped++;
          continue;
        }
        
        const fflData = {
          businessName: businessName.trim(),
          licenseNumber: licenseNumber.trim(),
          contactEmail: email?.trim() || null,
          phone: phone?.trim() || null,
          address: {
            street: street?.trim() || '',
            city: city?.trim() || '',
            state: state?.trim() || '',
            zip: zip?.trim() || ''
          },
          zip: zip.trim(),
          status: (status?.trim() as 'NotOnFile' | 'OnFile' | 'Preferred') || 'OnFile',
          isAvailableToUser: true
        };
        
        await this.createFFL(fflData);
        imported++;
      } catch (error) {
        console.error('Error importing FFL:', error);
        skipped++;
      }
    }
    
    return { imported, skipped };
  }

  // State shipping policies
  async getStateShippingPolicies(): Promise<StateShippingPolicy[]> {
    return await db.select().from(stateShippingPolicies);
  }

  async getStateShippingPolicy(state: string): Promise<StateShippingPolicy | undefined> {
    const [policy] = await db.select().from(stateShippingPolicies).where(eq(stateShippingPolicies.state, state));
    return policy || undefined;
  }

  // Tier pricing rules
  async getTierPricingRules(): Promise<TierPricingRule[]> {
    return await db.select().from(tierPricingRules);
  }

  async getActiveTierPricingRules(): Promise<TierPricingRule[]> {
    return await db.select().from(tierPricingRules)
      .where(eq(tierPricingRules.isActive, true));
  }

  // Hero carousel slides
  async getHeroCarouselSlides(): Promise<HeroCarouselSlide[]> {
    return await db.select().from(heroCarouselSlides)
      .orderBy(asc(heroCarouselSlides.displayOrder));
  }

  async getHeroCarouselSlide(id: number): Promise<HeroCarouselSlide | undefined> {
    const [slide] = await db.select().from(heroCarouselSlides)
      .where(eq(heroCarouselSlides.id, id));
    return slide || undefined;
  }

  async createHeroCarouselSlide(insertSlide: InsertHeroCarouselSlide): Promise<HeroCarouselSlide> {
    const [slide] = await db.insert(heroCarouselSlides)
      .values(insertSlide)
      .returning();
    return slide;
  }

  async updateHeroCarouselSlide(id: number, updates: Partial<HeroCarouselSlide>): Promise<HeroCarouselSlide> {
    const [slide] = await db.update(heroCarouselSlides)
      .set(updates)
      .where(eq(heroCarouselSlides.id, id))
      .returning();
    return slide;
  }

  async deleteHeroCarouselSlide(id: number): Promise<void> {
    await db.delete(heroCarouselSlides)
      .where(eq(heroCarouselSlides.id, id));
  }

  async getActiveHeroCarouselSlides(): Promise<HeroCarouselSlide[]> {
    return await db.select().from(heroCarouselSlides)
      .where(eq(heroCarouselSlides.isActive, true))
      .orderBy(asc(heroCarouselSlides.displayOrder));
  }

  async clearAllProducts(): Promise<void> {
    await db.delete(products);
  }
}

export const storage = new DatabaseStorage();
