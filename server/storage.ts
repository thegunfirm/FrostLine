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
import { eq, like, and, or, desc, asc, ne } from "drizzle-orm";

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
    // Priority 1: Same manufacturer AND same category (most relevant)
    const sameManufacturerAndCategory = await db.select().from(products)
      .where(
        and(
          eq(products.isActive, true),
          eq(products.manufacturer, manufacturer),
          eq(products.category, category),
          // Exclude the current product
          ne(products.id, productId)
        )
      )
      .orderBy(desc(products.inStock), desc(products.createdAt))
      .limit(4);

    // Priority 2: Same category, different manufacturer (fill remaining slots)
    const sameCategoryDifferentManufacturer = await db.select().from(products)
      .where(
        and(
          eq(products.isActive, true),
          eq(products.category, category),
          ne(products.manufacturer, manufacturer),
          // Exclude the current product
          ne(products.id, productId)
        )
      )
      .orderBy(desc(products.inStock), desc(products.createdAt))
      .limit(4);

    // Combine results, prioritizing same manufacturer + category
    const relatedProducts = [...sameManufacturerAndCategory, ...sameCategoryDifferentManufacturer].slice(0, 8);
    
    return relatedProducts;
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
