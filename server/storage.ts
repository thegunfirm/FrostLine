import { 
  users, 
  products, 
  orders, 
  ffls, 
  stateShippingPolicies,
  tierPricingRules,
  type User, 
  type InsertUser,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type FFL,
  type InsertFFL,
  type StateShippingPolicy,
  type TierPricingRule
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, or, desc, asc } from "drizzle-orm";

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
    let query = db.select().from(products);
    
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(products.category, filters.category));
    }
    
    if (filters?.manufacturer) {
      conditions.push(eq(products.manufacturer, filters.manufacturer));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          like(products.name, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`)
        )
      );
    }
    
    if (filters?.inStock !== undefined) {
      conditions.push(eq(products.inStock, filters.inStock));
    }
    
    conditions.push(eq(products.isActive, true));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(products.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
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
}

export const storage = new DatabaseStorage();
