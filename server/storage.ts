import { 
  users, 
  products, 
  orders, 
  ffls,
  carts, 
  stateShippingPolicies,
  tierPricingRules,
  heroCarouselSlides,
  apiConfigurations,
  emailTemplates,
  supportTickets,
  supportTicketMessages,
  orderNotes,
  systemSettings,
  userActivityLogs,
  checkoutSettings,
  fulfillmentSettings,
  atfDirectoryFiles,
  fflDataSources,
  orderActivityLogs,
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
  type InsertHeroCarouselSlide,
  type ApiConfiguration,
  type InsertApiConfiguration,
  type EmailTemplate,
  type InsertEmailTemplate,
  type SupportTicket,
  type InsertSupportTicket,
  type SupportTicketMessage,
  type InsertSupportTicketMessage,
  type OrderNote,
  type InsertOrderNote,
  type SystemSetting,
  type InsertSystemSetting,
  type UserActivityLog,
  type InsertUserActivityLog,
  type CheckoutSetting,
  type InsertCheckoutSetting,
  type FulfillmentSetting,
  type InsertFulfillmentSetting,
  type AtfDirectoryFile,
  type InsertAtfDirectoryFile,
  type FflDataSource,
  type InsertFflDataSource,
  type OrderActivityLog,
  type InsertOrderActivityLog,
  tierLabelSettings,
  type TierLabelSetting,
  type InsertTierLabelSetting
} from "@shared/schema";
import { db } from "./db";
import { eq, like, ilike, and, or, desc, asc, ne, sql, gt, gte, lte, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  updateUserTier(id: number, tier: string): Promise<User>;
  updateUserZohoId(id: number, zohoContactId: string): Promise<User>;
  verifyUserEmail(token: string): Promise<User | undefined>;
  setPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<boolean>;
  resetPassword(token: string, newPassword: string): Promise<User | undefined>;
  
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
  getOrderWithDetails(id: number): Promise<any>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order>;
  updateOrderZohoId(id: number, zohoDealId: string): Promise<Order>;
  getUserOrders(userId: number): Promise<Order[]>;
  getOrderItems(orderId: number): Promise<any[]>;
  
  // FFL operations
  getFFLs(filters?: { zip?: string; status?: string }): Promise<FFL[]>;
  getFFL(id: number): Promise<FFL | undefined>;
  getFFLByLicense(licenseNumber: string): Promise<FFL | undefined>;
  createFFL(ffl: InsertFFL): Promise<FFL>;
  updateFFL(id: number, updates: Partial<FFL>): Promise<FFL>;
  updateFFLZohoId(id: number, zohoVendorId: string): Promise<FFL>;
  deleteFFL(id: number): Promise<void>;
  getAllFFLs(): Promise<FFL[]>;
  searchFFLsByZip(zip: string, radius?: number): Promise<FFL[]>;
  clearAllFFLs(): Promise<void>;
  markFflAsPreferred(id: number): Promise<FFL>;
  markFflAsNotPreferred(id: number): Promise<FFL>;
  getPreferredFFLs(): Promise<FFL[]>;
  
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
  
  // CMS Operations - API Configuration Management (Admin Only)
  getApiConfigurations(): Promise<ApiConfiguration[]>;
  getApiConfiguration(id: number): Promise<ApiConfiguration | undefined>;
  createApiConfiguration(config: InsertApiConfiguration): Promise<ApiConfiguration>;
  updateApiConfiguration(id: number, updates: Partial<ApiConfiguration>): Promise<ApiConfiguration>;
  deleteApiConfiguration(id: number): Promise<void>;
  
  // CMS Operations - Email Templates (Manager/Higher Level Staff)
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplateByName(templateName: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, updates: Partial<EmailTemplate>): Promise<EmailTemplate>;
  deleteEmailTemplate(id: number): Promise<void>;
  
  // CMS Operations - Support Tickets (Support Staff)
  getSupportTickets(filters?: { assignedTo?: number; status?: string; priority?: string }): Promise<SupportTicket[]>;
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: number, updates: Partial<SupportTicket>): Promise<SupportTicket>;
  assignSupportTicket(id: number, assignedTo: number): Promise<SupportTicket>;
  
  // Support Ticket Messages
  getSupportTicketMessages(ticketId: number): Promise<SupportTicketMessage[]>;
  createSupportTicketMessage(message: InsertSupportTicketMessage): Promise<SupportTicketMessage>;
  
  // Order Notes (Support Staff)
  getOrderNotes(orderId: number): Promise<OrderNote[]>;
  createOrderNote(note: InsertOrderNote): Promise<OrderNote>;
  
  // System Settings (Admin Only)
  getSystemSettings(): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  updateSystemSetting(key: string, value: string, modifiedBy: number): Promise<SystemSetting>;
  
  // User Activity Logs (Support/Admin)
  getUserActivityLogs(userId?: number, limit?: number): Promise<UserActivityLog[]>;
  logUserActivity(log: InsertUserActivityLog): Promise<UserActivityLog>;

  // ATF Directory Management (Management Level Staff)
  getAtfDirectoryFiles(): Promise<AtfDirectoryFile[]>;
  getAtfDirectoryFile(id: number): Promise<AtfDirectoryFile | undefined>;
  createAtfDirectoryFile(file: InsertAtfDirectoryFile): Promise<AtfDirectoryFile>;
  updateAtfDirectoryFile(id: number, updates: Partial<AtfDirectoryFile>): Promise<AtfDirectoryFile>;
  
  // FFL Data Source Tracking
  getFflDataSources(): Promise<FflDataSource[]>;
  createFflDataSource(source: InsertFflDataSource): Promise<FflDataSource>;
  updateFflDataSource(id: number, updates: Partial<FflDataSource>): Promise<FflDataSource>;

  // Tier Label Settings operations
  getTierLabelSettings(): Promise<TierLabelSetting[]>;
  getTierLabelSetting(settingKey: string): Promise<TierLabelSetting | undefined>;
  updateTierLabelSetting(settingKey: string, updates: Partial<TierLabelSetting>): Promise<TierLabelSetting>;
  createTierLabelSetting(setting: InsertTierLabelSetting): Promise<TierLabelSetting>;
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

  async updateUserZohoId(id: number, zohoContactId: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ zohoContactId })
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

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async setPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<boolean> {
    try {
      const [user] = await db.update(users)
        .set({ 
          passwordResetToken: token,
          passwordResetExpires: expiresAt
        })
        .where(eq(users.email, email))
        .returning();
      return !!user;
    } catch (error) {
      console.error("Error setting password reset token:", error);
      return false;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<User | undefined> {
    try {
      // First verify token exists and is not expired
      const [user] = await db.select().from(users)
        .where(and(
          eq(users.passwordResetToken, token),
          sql`password_reset_expires > NOW()`
        ));
      
      if (!user) {
        return undefined; // Token invalid or expired
      }

      // Check if new password is the same as previous password
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new Error("Please choose a different password. You cannot reuse your previous password.");
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      const [updatedUser] = await db.update(users)
        .set({ 
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null
        })
        .where(eq(users.passwordResetToken, token))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error; // Re-throw to preserve the error message
    }
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

  async getProductByUpc(upc: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.upcCode, upc));
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

  async updateOrderPayment(orderId: number, paymentData: { 
    authorizeNetTransactionId: string; 
    status: string 
  }): Promise<Order> {
    const [order] = await db.update(orders)
      .set({
        authorizeNetTransactionId: paymentData.authorizeNetTransactionId,
        status: paymentData.status
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const [order] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return order;
  }

  async updateOrderZohoId(id: number, zohoDealId: string): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ zohoDealId })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ ...updates })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getOrderWithDetails(id: number): Promise<any> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        user: true,
        orderItems: {
          with: {
            product: true
          }
        }
      }
    });
    return order;
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.orderDate));
  }

  async getOrderItems(orderId: number): Promise<any[]> {
    return await db.select().from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  // CMS Admin search methods for orders
  async searchOrdersForAdmin(params: {
    orderNumber?: string;
    customerName?: string;
    fflId?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: any[], total: number }> {
    const { orderNumber, customerName, fflId, startDate, endDate, status, page = 1, limit = 20 } = params;
    
    // Get all orders first, then filter in-memory for simplicity
    const allOrders = await db.select().from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.orderDate));

    // Filter orders based on search criteria
    let filteredOrders = allOrders.filter((orderWithUser: any) => {
      const order = orderWithUser.orders;
      const user = orderWithUser.users;

      if (orderNumber && !order.id.toString().includes(orderNumber)) {
        return false;
      }

      if (status && status !== 'all' && order.status !== status) {
        return false;
      }

      if (fflId && order.fflRecipientId !== fflId) {
        return false;
      }

      if (startDate && new Date(order.orderDate) < new Date(startDate)) {
        return false;
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (new Date(order.orderDate) > endDateTime) {
          return false;
        }
      }

      if (customerName) {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        if (!fullName.includes(customerName.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    const total = filteredOrders.length;
    const offset = (page - 1) * limit;
    const paginatedOrders = filteredOrders.slice(offset, offset + limit);

    // Format the results
    const formattedOrders = paginatedOrders.map((orderWithUser: any) => ({
      ...orderWithUser.orders,
      user: orderWithUser.users
    }));

    return {
      orders: formattedOrders,
      total
    };
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



  // Cart persistence operations
  async saveUserCart(userId: number, items: any[]): Promise<void> {
    console.log(`Saving cart for user ${userId} with ${items.length} items:`, items);
    
    try {
      const existingCart = await db.select().from(carts)
        .where(eq(carts.userId, userId))
        .limit(1);
      
      if (existingCart.length > 0) {
        await db.update(carts)
          .set({ 
            items: items, // Store as JSON directly, not string
            updatedAt: new Date() 
          })
          .where(eq(carts.userId, userId));
        console.log(`✅ Updated existing cart for user ${userId}`);
      } else {
        await db.insert(carts).values({
          userId,
          items: items, // Store as JSON directly, not string
          updatedAt: new Date()
        });
        console.log(`✅ Created new cart for user ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Cart save error for user ${userId}:`, error);
      throw error;
    }
  }

  async getUserCart(userId: number): Promise<{ items: any[] }> {
    try {
      const [cart] = await db.select().from(carts)
        .where(eq(carts.userId, userId))
        .limit(1);
      
      if (!cart) {
        console.log(`No cart found for user ${userId}, returning empty cart`);
        return { items: [] };
      }
      
      const items = Array.isArray(cart.items) ? cart.items : (typeof cart.items === 'string' ? JSON.parse(cart.items) : []);
      console.log(`✅ Retrieved cart for user ${userId} with ${items.length} items`);
      
      return { items };
    } catch (error) {
      console.error(`❌ Cart fetch error for user ${userId}:`, error);
      return { items: [] };
    }
  }

  // Fulfillment settings operations
  async getFulfillmentSettings(): Promise<FulfillmentSetting[]> {
    try {
      return await db.select().from(fulfillmentSettings)
        .where(eq(fulfillmentSettings.isActive, true))
        .orderBy(asc(fulfillmentSettings.type));
    } catch (error) {
      console.error("Fulfillment settings fetch error:", error);
      throw error;
    }
  }

  // Checkout settings operations
  async getCheckoutSettings(): Promise<Record<string, string>> {
    try {
      const settings = await db.select().from(checkoutSettings);
      const result: Record<string, string> = {};
      
      settings.forEach(setting => {
        result[setting.key] = setting.value;
      });
      
      return result;
    } catch (error) {
      console.error("Checkout settings fetch error:", error);
      throw error;
    }
  }

  async updateFFL(id: number, updates: Partial<FFL>): Promise<FFL> {
    const [ffl] = await db.update(ffls).set(updates).where(eq(ffls.id, id)).returning();
    return ffl;
  }

  async searchFFLsByZip(zip: string, radius = 25): Promise<FFL[]> {
    try {
      console.log(`🔍 ZIP ${zip} search: True distance-based search within ${radius} miles`);
      
      const targetZip = zip.substring(0, 5);
      
      // Get coordinates for target ZIP using free geocoding service
      const targetCoords = await this.getZipCoordinates(targetZip);
      if (!targetCoords) {
        console.log(`❌ Could not geocode ZIP ${targetZip}`);
        return [];
      }
      
      console.log(`📍 Target: ${targetZip} at ${targetCoords.lat}, ${targetCoords.lon}`);
      
      // Get regional FFLs to limit database load (use broader region for more candidates)
      const zipPrefix = targetZip.substring(0, 2); // Broader region (first 2 digits)
      const regionalFFLs = await db.select().from(ffls)
        .where(
          and(
            eq(ffls.isAvailableToUser, true),
            sql`LEFT(${ffls.zip}, 2) = ${zipPrefix}`
          )
        )
        .limit(200); // Get more candidates for better distance filtering
      
      console.log(`📊 Checking ${regionalFFLs.length} FFLs in ${zipPrefix}xx region`);
      
      // Calculate real distances for each FFL
      const fflsWithDistance = [];
      
      for (const ffl of regionalFFLs) {
        const fflZip = ffl.zip.substring(0, 5);
        const fflCoords = await this.getZipCoordinates(fflZip);
        
        if (!fflCoords) continue;
        
        const distance = this.calculateHaversineDistance(
          targetCoords.lat, targetCoords.lon,
          fflCoords.lat, fflCoords.lon
        );
        
        if (distance <= radius) {
          fflsWithDistance.push({
            ...ffl,
            distance: Math.round(distance * 10) / 10
          });
        }
      }
      
      // Sort by actual distance
      fflsWithDistance.sort((a, b) => a.distance - b.distance);
      
      console.log(`✅ Found ${fflsWithDistance.length} FFLs within ${radius} miles`);
      
      // Return top 25 results without distance property
      return fflsWithDistance.slice(0, 25).map(({ distance, ...ffl }) => ffl);
    } catch (error) {
      console.error(`❌ ZIP search error for ${zip}:`, error);
      throw error;
    }
  }

  // Cache for ZIP coordinates to avoid repeated API calls
  private zipCoordinatesCache = new Map<string, { lat: number; lon: number } | null>();

  private async getZipCoordinates(zip: string): Promise<{ lat: number; lon: number } | null> {
    // Check cache first
    if (this.zipCoordinatesCache.has(zip)) {
      return this.zipCoordinatesCache.get(zip)!;
    }

    try {
      // Import zipcodes using dynamic import for ES modules
      const { default: zipcodes } = await import('zipcodes');
      const location = zipcodes.lookup(zip);
      
      if (location && location.latitude && location.longitude) {
        const coords = {
          lat: parseFloat(location.latitude),
          lon: parseFloat(location.longitude)
        };
        
        console.log(`📍 Geocoded ZIP ${zip}: ${coords.lat}, ${coords.lon}`);
        this.zipCoordinatesCache.set(zip, coords);
        return coords;
      }
      
      console.log(`❌ No coordinates found for ZIP ${zip}`);
      this.zipCoordinatesCache.set(zip, null);
      return null;
    } catch (error) {
      console.error(`Error geocoding ZIP ${zip}:`, error);
      this.zipCoordinatesCache.set(zip, null);
      return null;
    }
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async searchFFLsByName(businessName: string, radius = 25): Promise<FFL[]> {
    // Search FFLs by business name OR trade name (DBA) using fuzzy matching
    const searchTerm = `%${businessName.toLowerCase()}%`;
    
    return await db.select().from(ffls)
      .where(
        and(
          eq(ffls.isAvailableToUser, true),
          sql`(LOWER(${ffls.businessName}) LIKE ${searchTerm} OR LOWER(COALESCE(${ffls.tradeNameDba}, '')) LIKE ${searchTerm})`
        )
      )
      .orderBy(
        // Order by relevance: 
        // 1. Trade name (DBA) exact matches first (like "Guns Plus")
        // 2. Business name starts with search term 
        // 3. Trade name starts with search term
        // 4. Contains match in business name
        // 5. Contains match in trade name
        sql`CASE 
          WHEN LOWER(COALESCE(${ffls.tradeNameDba}, '')) = ${businessName.toLowerCase()} THEN 1
          WHEN LOWER(${ffls.businessName}) LIKE ${businessName.toLowerCase() + '%'} THEN 2
          WHEN LOWER(COALESCE(${ffls.tradeNameDba}, '')) LIKE ${businessName.toLowerCase() + '%'} THEN 3
          WHEN LOWER(${ffls.businessName}) LIKE ${searchTerm} THEN 4
          ELSE 5
        END`,
        asc(ffls.businessName)
      )
      .limit(50);
  }

  async getAllFFLs(): Promise<FFL[]> {
    return await db.select().from(ffls)
      .orderBy(asc(ffls.businessName));
  }



  async getFFLByLicense(licenseNumber: string): Promise<FFL | undefined> {
    const [ffl] = await db.select().from(ffls).where(eq(ffls.licenseNumber, licenseNumber));
    return ffl || undefined;
  }

  async clearAllFFLs(): Promise<void> {
    await db.delete(ffls);
  }

  async deleteFFL(id: number): Promise<void> {
    await db.delete(ffls)
      .where(eq(ffls.id, id));
  }

  async updateFFL(id: number, updates: Partial<FFL>): Promise<FFL> {
    const [ffl] = await db.update(ffls)
      .set(updates)
      .where(eq(ffls.id, id))
      .returning();
    return ffl;
  }

  async updateFFLZohoId(id: number, zohoVendorId: string): Promise<FFL> {
    const [ffl] = await db.update(ffls)
      .set({ zohoVendorId })
      .where(eq(ffls.id, id))
      .returning();
    return ffl;
  }

  async markFflAsPreferred(id: number): Promise<FFL> {
    const [ffl] = await db.update(ffls)
      .set({ status: 'Preferred' })
      .where(eq(ffls.id, id))
      .returning();
    return ffl;
  }

  async markFflAsNotPreferred(id: number): Promise<FFL> {
    const [ffl] = await db.update(ffls)
      .set({ status: ffls.isRsrPartner ? 'OnFile' : 'NotOnFile' })
      .where(eq(ffls.id, id))
      .returning();
    return ffl;
  }

  async getPreferredFFLs(): Promise<FFL[]> {
    return await db.select().from(ffls)
      .where(eq(ffls.status, 'Preferred'))
      .orderBy(asc(ffls.businessName));
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
      .orderBy(heroCarouselSlides.sortOrder);
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
      .orderBy(heroCarouselSlides.sortOrder);
  }

  async clearAllProducts(): Promise<void> {
    await db.delete(products);
  }

  // CMS Operations Implementation

  // API Configuration Management (Admin Only)
  async getApiConfigurations(): Promise<ApiConfiguration[]> {
    return await db.select().from(apiConfigurations)
      .orderBy(asc(apiConfigurations.serviceName));
  }

  async getApiConfiguration(id: number): Promise<ApiConfiguration | undefined> {
    const [config] = await db.select().from(apiConfigurations)
      .where(eq(apiConfigurations.id, id));
    return config || undefined;
  }

  async createApiConfiguration(config: InsertApiConfiguration): Promise<ApiConfiguration> {
    const [newConfig] = await db.insert(apiConfigurations)
      .values(config)
      .returning();
    return newConfig;
  }

  async updateApiConfiguration(id: number, updates: Partial<ApiConfiguration>): Promise<ApiConfiguration> {
    const [config] = await db.update(apiConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(apiConfigurations.id, id))
      .returning();
    return config;
  }

  async deleteApiConfiguration(id: number): Promise<void> {
    await db.delete(apiConfigurations)
      .where(eq(apiConfigurations.id, id));
  }

  // Email Templates (Manager/Higher Level Staff)
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates)
      .orderBy(asc(emailTemplates.category), asc(emailTemplates.templateName));
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    return template || undefined;
  }

  async getEmailTemplateByName(templateName: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates)
      .where(and(
        eq(emailTemplates.templateName, templateName),
        eq(emailTemplates.isActive, true)
      ));
    return template || undefined;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateEmailTemplate(id: number, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const [template] = await db.update(emailTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return template;
  }

  async deleteEmailTemplate(id: number): Promise<void> {
    await db.delete(emailTemplates)
      .where(eq(emailTemplates.id, id));
  }

  // Support Tickets (Support Staff)
  async getSupportTickets(filters?: { assignedTo?: number; status?: string; priority?: string }): Promise<SupportTicket[]> {
    let query = db.select().from(supportTickets);
    
    const conditions = [];
    
    if (filters?.assignedTo) {
      conditions.push(eq(supportTickets.assignedTo, filters.assignedTo));
    }
    
    if (filters?.status) {
      conditions.push(eq(supportTickets.status, filters.status));
    }
    
    if (filters?.priority) {
      conditions.push(eq(supportTickets.priority, filters.priority));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets)
      .where(eq(supportTickets.id, id));
    return ticket || undefined;
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    // Generate ticket number
    const ticketNumber = `TK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const [newTicket] = await db.insert(supportTickets)
      .values({ ...ticket, ticketNumber })
      .returning();
    return newTicket;
  }

  async updateSupportTicket(id: number, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    const [ticket] = await db.update(supportTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket;
  }

  async assignSupportTicket(id: number, assignedTo: number): Promise<SupportTicket> {
    const [ticket] = await db.update(supportTickets)
      .set({ assignedTo, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket;
  }

  // Support Ticket Messages
  async getSupportTicketMessages(ticketId: number): Promise<SupportTicketMessage[]> {
    return await db.select().from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(asc(supportTicketMessages.createdAt));
  }

  async createSupportTicketMessage(message: InsertSupportTicketMessage): Promise<SupportTicketMessage> {
    const [newMessage] = await db.insert(supportTicketMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  // Order Notes (Support Staff)
  async getOrderNotes(orderId: number): Promise<OrderNote[]> {
    return await db.select().from(orderNotes)
      .where(eq(orderNotes.orderId, orderId))
      .orderBy(desc(orderNotes.createdAt));
  }

  async createOrderNote(note: InsertOrderNote): Promise<OrderNote> {
    const [newNote] = await db.insert(orderNotes)
      .values(note)
      .returning();
    return newNote;
  }

  // System Settings (Admin Only)
  async getSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings)
      .orderBy(asc(systemSettings.category), asc(systemSettings.settingKey));
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings)
      .where(eq(systemSettings.settingKey, key));
    return setting || undefined;
  }

  async updateSystemSetting(key: string, value: string, modifiedBy: number): Promise<SystemSetting> {
    const existingSetting = await this.getSystemSetting(key);
    
    if (existingSetting) {
      const [setting] = await db.update(systemSettings)
        .set({ 
          settingValue: value, 
          lastModifiedBy: modifiedBy,
          updatedAt: new Date() 
        })
        .where(eq(systemSettings.settingKey, key))
        .returning();
      return setting;
    } else {
      const [setting] = await db.insert(systemSettings)
        .values({
          settingKey: key,
          settingValue: value,
          dataType: 'string',
          category: 'general',
          lastModifiedBy: modifiedBy
        })
        .returning();
      return setting;
    }
  }

  // User Activity Logs (Support/Admin)
  async getUserActivityLogs(userId?: number, limit = 100): Promise<UserActivityLog[]> {
    let query = db.select().from(userActivityLogs);
    
    if (userId) {
      query = query.where(eq(userActivityLogs.userId, userId));
    }
    
    return await query
      .orderBy(desc(userActivityLogs.createdAt))
      .limit(limit);
  }

  async logUserActivity(log: InsertUserActivityLog): Promise<UserActivityLog> {
    const [newLog] = await db.insert(userActivityLogs)
      .values(log)
      .returning();
    return newLog;
  }

  // FAP Integration Methods
  async updateUserSubscription(userId: number, updates: { subscriptionTier?: string; subscriptionStatus?: string }): Promise<User> {
    const [user] = await db.update(users)
      .set({ 
        subscriptionTier: updates.subscriptionTier,
        // Note: subscriptionStatus field may need to be added to schema
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // ATF Directory Management (Management Level Staff)
  async getAtfDirectoryFiles(): Promise<AtfDirectoryFile[]> {
    return await db.select()
      .from(atfDirectoryFiles)
      .orderBy(desc(atfDirectoryFiles.createdAt));
  }

  async getAtfDirectoryFile(id: number): Promise<AtfDirectoryFile | undefined> {
    const [file] = await db.select()
      .from(atfDirectoryFiles)
      .where(eq(atfDirectoryFiles.id, id));
    return file || undefined;
  }

  async createAtfDirectoryFile(file: InsertAtfDirectoryFile): Promise<AtfDirectoryFile> {
    const [newFile] = await db.insert(atfDirectoryFiles)
      .values(file)
      .returning();
    return newFile;
  }

  async updateAtfDirectoryFile(id: number, updates: Partial<AtfDirectoryFile>): Promise<AtfDirectoryFile> {
    const [updatedFile] = await db.update(atfDirectoryFiles)
      .set(updates)
      .where(eq(atfDirectoryFiles.id, id))
      .returning();
    return updatedFile;
  }

  // FFL Data Source Tracking
  async getFflDataSources(): Promise<FflDataSource[]> {
    return await db.select()
      .from(fflDataSources)
      .orderBy(desc(fflDataSources.lastUpdated));
  }

  async createFflDataSource(source: InsertFflDataSource): Promise<FflDataSource> {
    const [newSource] = await db.insert(fflDataSources)
      .values(source)
      .returning();
    return newSource;
  }

  async updateFflDataSource(id: number, updates: Partial<FflDataSource>): Promise<FflDataSource> {
    const [updatedSource] = await db.update(fflDataSources)
      .set(updates)
      .where(eq(fflDataSources.id, id))
      .returning();
    return updatedSource;
  }

  // Tier Label Settings operations
  async getTierLabelSettings(): Promise<TierLabelSetting[]> {
    return await db.select()
      .from(tierLabelSettings)
      .orderBy(tierLabelSettings.settingKey);
  }

  async getTierLabelSetting(settingKey: string): Promise<TierLabelSetting | undefined> {
    const [setting] = await db.select()
      .from(tierLabelSettings)
      .where(eq(tierLabelSettings.settingKey, settingKey));
    return setting || undefined;
  }

  async updateTierLabelSetting(settingKey: string, updates: Partial<TierLabelSetting>): Promise<TierLabelSetting> {
    const [setting] = await db.update(tierLabelSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tierLabelSettings.settingKey, settingKey))
      .returning();
    return setting;
  }

  async createTierLabelSetting(setting: InsertTierLabelSetting): Promise<TierLabelSetting> {
    const [newSetting] = await db.insert(tierLabelSettings)
      .values(setting)
      .returning();
    return newSetting;
  }
}

export const storage = new DatabaseStorage();
