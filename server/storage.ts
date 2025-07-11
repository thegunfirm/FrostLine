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
import { eq, like, ilike, and, or, desc, asc, ne } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  updateUserTier(id: number, tier: string): Promise<User>;
  
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
    // Get the current product to extract caliber and firearm type
    const [currentProduct] = await db.select().from(products).where(eq(products.id, productId));
    if (!currentProduct) return [];

    // Extract caliber and firearm type from product name and tags
    const { caliber, firearmType } = this.extractFirearmAttributes(currentProduct.name, currentProduct.tags);



    // Get candidate products for matching - prioritize 1911s when appropriate
    let candidateProducts: Product[] = [];
    
    // If this is a 1911-type firearm, get 1911s first
    if (firearmType && (firearmType.includes('1911') || firearmType.includes('ULTRA CARRY') || firearmType.includes('COMMANDER') || firearmType.includes('OFFICER'))) {
      // Get 1911 products first
      const direct1911s = await db.select().from(products)
        .where(
          and(
            eq(products.isActive, true),
            eq(products.category, category),
            ne(products.id, productId),
            or(
              ilike(products.name, '%1911%'),
              ilike(products.name, '%ULTRA CARRY%'),
              ilike(products.name, '%COMMANDER%'),
              ilike(products.name, '%OFFICER%'),
              ilike(products.name, '%GOVERNMENT%')
            )
          )
        )
        .limit(100);
      

      candidateProducts = direct1911s;
    }
    
    // Fill remaining slots with general category products
    const remainingSlots = 200 - candidateProducts.length;
    if (remainingSlots > 0) {
      const generalProducts = await db.select().from(products)
        .where(
          and(
            eq(products.isActive, true),
            eq(products.category, category),
            ne(products.id, productId)
          )
        )
        .orderBy(desc(products.inStock), desc(products.createdAt))
        .limit(remainingSlots);
      
      // Merge and deduplicate
      const allCandidates = [...candidateProducts, ...generalProducts];
      candidateProducts = allCandidates.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );
    }
    


    // Score and sort products by similarity
    const scoredProducts = candidateProducts.map(product => {
      const score = this.calculateSimilarityScore(
        product,
        { caliber, firearmType, manufacturer }
      );
      return {
        ...product,
        similarityScore: score
      };
    });

    // Sort by similarity score (highest first) and return top 8
    const sortedProducts = scoredProducts
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 8);

    return sortedProducts.map(({ similarityScore, ...product }) => product);
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
