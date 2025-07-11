import { pgTable, text, serial, integer, boolean, decimal, timestamp, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  subscriptionTier: text("subscription_tier").notNull().default("Bronze"), // Bronze, Gold, Platinum
  createdAt: timestamp("created_at").defaultNow(),
  lifetimeSavings: decimal("lifetime_savings", { precision: 10, scale: 2 }).default("0.00"),
  savingsIfGold: decimal("savings_if_gold", { precision: 10, scale: 2 }).default("0.00"),
  savingsIfPlatinum: decimal("savings_if_platinum", { precision: 10, scale: 2 }).default("0.00"),
  preferredFflId: integer("preferred_ffl_id"),
  shippingAddress: json("shipping_address"),
  role: text("role").notNull().default("user"), // user, admin, support, dealer
  isBanned: boolean("is_banned").default(false),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  subcategoryName: text("subcategory_name"), // RSR subcategory for proper classification
  departmentNumber: text("department_number"), // RSR department number (01, 02, 05, etc.)
  departmentDesc: text("department_desc"), // RSR department description
  subDepartmentDesc: text("sub_department_desc"), // RSR sub-department description
  manufacturer: text("manufacturer"),
  manufacturerPartNumber: text("manufacturer_part_number"), // Manufacturer's part number
  sku: text("sku").unique(),
  priceWholesale: decimal("price_wholesale", { precision: 10, scale: 2 }).notNull(), // RSR Dealer Price (Platinum base)
  priceMAP: decimal("price_map", { precision: 10, scale: 2 }), // RSR MAP price (Gold base)
  priceMSRP: decimal("price_msrp", { precision: 10, scale: 2 }), // RSR MSRP price (Bronze base)
  priceBronze: decimal("price_bronze", { precision: 10, scale: 2 }), // Calculated Bronze price
  priceGold: decimal("price_gold", { precision: 10, scale: 2 }), // Calculated Gold price
  pricePlatinum: decimal("price_platinum", { precision: 10, scale: 2 }), // Calculated Platinum price
  inStock: boolean("in_stock").default(true),
  stockQuantity: integer("stock_quantity").default(0),
  allocated: text("allocated"), // RSR allocation status (Y/N)
  newItem: boolean("new_item").default(false), // Whether it's a new product
  promo: text("promo"), // Promotional information
  accessories: text("accessories"), // What accessories come with the product
  distributor: text("distributor").default("RSR"),
  requiresFFL: boolean("requires_ffl").default(false),
  mustRouteThroughGunFirm: boolean("must_route_through_gun_firm").default(false),
  tags: json("tags"),
  caliber: text("caliber"), // Extracted caliber (9mm, .45ACP, .223, etc.)
  firearmType: text("firearm_type"), // Extracted firearm type (1911, Glock, AR-15, etc.)
  compatibilityTags: json("compatibility_tags"), // Array of compatibility tags for related products
  images: json("images"), // Array of image objects with multiple resolutions
  upcCode: text("upc_code"),
  weight: decimal("weight", { precision: 8, scale: 2 }).default("0"),
  dimensions: json("dimensions"), // {length, width, height}
  restrictions: json("restrictions"), // RSR restrictions object
  stateRestrictions: json("state_restrictions"), // Array of restricted states
  groundShipOnly: boolean("ground_ship_only").default(false),
  adultSignatureRequired: boolean("adult_signature_required").default(false),
  dropShippable: boolean("drop_shippable").default(true), // RSR field 69: Can be drop shipped directly to consumer
  prop65: boolean("prop65").default(false), // California Prop 65 warning required
  returnPolicyDays: integer("return_policy_days").default(30),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  orderDate: timestamp("order_date").defaultNow(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("Pending"), // Pending, Processing, Shipped, Delivered, Cancelled, Returned
  items: json("items").notNull(),
  fflRecipientId: integer("ffl_recipient_id"),
  shippingMethod: text("shipping_method"),
  shippingAddress: json("shipping_address"),
  trackingNumber: text("tracking_number"),
  savingsRealized: decimal("savings_realized", { precision: 10, scale: 2 }).default("0.00"),
});

export const ffls = pgTable("ffls", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  licenseNumber: text("license_number").notNull().unique(),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  address: json("address").notNull(),
  zip: text("zip").notNull(),
  status: text("status").notNull().default("NotOnFile"), // NotOnFile, OnFile, Preferred
  licenseDocumentUrl: text("license_document_url"),
  isAvailableToUser: boolean("is_available_to_user").default(true),
  regionRestrictions: json("region_restrictions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stateShippingPolicies = pgTable("state_shipping_policies", {
  id: serial("id").primaryKey(),
  state: text("state").notNull().unique(),
  ammoMustGoToFFL: boolean("ammo_must_go_to_ffl").default(false),
  blocked: boolean("blocked").default(false),
  customNote: text("custom_note"),
});

export const tierPricingRules = pgTable("tier_pricing_rules", {
  id: serial("id").primaryKey(),
  appliesTo: text("applies_to").notNull(), // productType, global, category
  condition: text("condition"), // e.g., "price < 100"
  markupType: text("markup_type").notNull(), // percentage, flat
  markupValue: decimal("markup_value", { precision: 10, scale: 2 }).notNull(),
  appliedToTiers: json("applied_to_tiers").notNull(), // ["Bronze", "Gold", "Platinum"]
  isActive: boolean("is_active").default(true),
});

// Pricing configuration for flexible tier pricing
export const pricingConfiguration = pgTable("pricing_configuration", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "Default Pricing Rules"
  bronzeMarkupType: text("bronze_markup_type").notNull().default("flat"), // "flat" or "percentage"
  bronzeMarkupValue: decimal("bronze_markup_value", { precision: 10, scale: 2 }).notNull().default("20.00"),
  goldMarkupType: text("gold_markup_type").notNull().default("flat"), // "flat" or "percentage"
  goldMarkupValue: decimal("gold_markup_value", { precision: 10, scale: 2 }).notNull().default("20.00"),
  platinumMarkupType: text("platinum_markup_type").notNull().default("flat"), // "flat" or "percentage"
  platinumMarkupValue: decimal("platinum_markup_value", { precision: 10, scale: 2 }).notNull().default("20.00"),
  priceThreshold: decimal("price_threshold", { precision: 10, scale: 2 }).notNull().default("10.00"), // Switch to percentage below this
  lowPriceBronzePercentage: decimal("low_price_bronze_percentage", { precision: 5, scale: 2 }).notNull().default("25.00"),
  lowPriceGoldPercentage: decimal("low_price_gold_percentage", { precision: 5, scale: 2 }).notNull().default("15.00"),
  lowPricePlatinumPercentage: decimal("low_price_platinum_percentage", { precision: 5, scale: 2 }).notNull().default("5.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const heroCarouselSlides = pgTable("hero_carousel_slides", {
  id: serial("id").primaryKey(),
  title: text("title"),
  subtitle: text("subtitle"),
  imageUrl: text("image_url").notNull(),
  buttonText: text("button_text"),
  buttonLink: text("button_link"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// AI Search Learning System Tables
export const searchCache = pgTable("search_cache", {
  id: serial("id").primaryKey(),
  originalQuery: text("original_query").notNull().unique(),
  expandedQuery: text("expanded_query").notNull(),
  results: json("results").notNull(),
  metadata: json("metadata").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const searchLearning = pgTable("search_learning", {
  id: serial("id").primaryKey(),
  originalQuery: text("original_query").notNull(),
  expandedQuery: text("expanded_query").notNull(),
  resultCount: integer("result_count").notNull(),
  userInteractions: json("user_interactions").notNull(),
  relevanceScore: decimal("relevance_score", { precision: 3, scale: 2 }).notNull(),
  learningData: json("learning_data"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const searchFeedback = pgTable("search_feedback", {
  id: serial("id").primaryKey(),
  searchQuery: text("search_query").notNull(),
  feedbackText: text("feedback_text").notNull(),
  category: text("category"),
  timestamp: timestamp("timestamp").defaultNow(),
  isResolved: boolean("is_resolved").default(false),
});

// Category ribbon management for CMS
export const categoryRibbons = pgTable("category_ribbons", {
  id: serial("id").primaryKey(),
  categoryName: text("category_name").notNull().unique(),
  ribbonText: text("ribbon_text").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// System settings for various configurations
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  isEditable: boolean("is_editable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Filter configurations for CMS-controlled search filtering
export const filterConfigurations = pgTable("filter_configurations", {
  id: serial("id").primaryKey(),
  filterType: text("filter_type").notNull(), // "category", "manufacturer", "price_range", etc.
  displayName: text("display_name").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  defaultValue: text("default_value").default("all"),
  displayOrder: integer("display_order").default(0),
  isRequired: boolean("is_required").default(false),
  options: json("options"), // Array of available options for dropdown filters
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Category settings for CMS control
export const categorySettings = pgTable("category_settings", {
  id: serial("id").primaryKey(),
  categoryName: text("category_name").notNull().unique(),
  isEnabled: boolean("is_enabled").default(true),
  displayOrder: integer("display_order").default(0),
  parentCategory: text("parent_category"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  orders: many(orders),
  preferredFfl: one(ffls, {
    fields: [users.preferredFflId],
    references: [ffls.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  // Add relations as needed for order items, etc.
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  fflRecipient: one(ffls, {
    fields: [orders.fflRecipientId],
    references: [ffls.id],
  }),
}));

export const fflsRelations = relations(ffls, ({ many }) => ({
  orders: many(orders),
  preferredByUsers: many(users),
}));

export const pricingRules = pgTable("pricing_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // Bronze tier markup rules
  bronzeMarkupType: text("bronze_markup_type").notNull().default("percentage"), // 'flat' or 'percentage'
  bronzeMarkupValue: decimal("bronze_markup_value", { precision: 10, scale: 2 }).notNull().default("10.00"),
  bronzeThreshold: decimal("bronze_threshold", { precision: 10, scale: 2 }).notNull().default("200.00"),
  bronzeFlatMarkup: decimal("bronze_flat_markup", { precision: 10, scale: 2 }).notNull().default("20.00"),
  // Gold tier markup rules
  goldMarkupType: text("gold_markup_type").notNull().default("percentage"),
  goldMarkupValue: decimal("gold_markup_value", { precision: 10, scale: 2 }).notNull().default("5.00"),
  goldThreshold: decimal("gold_threshold", { precision: 10, scale: 2 }).notNull().default("200.00"),
  goldFlatMarkup: decimal("gold_flat_markup", { precision: 10, scale: 2 }).notNull().default("15.00"),
  // Platinum tier markup rules
  platinumMarkupType: text("platinum_markup_type").notNull().default("percentage"),
  platinumMarkupValue: decimal("platinum_markup_value", { precision: 10, scale: 2 }).notNull().default("2.00"),
  platinumThreshold: decimal("platinum_threshold", { precision: 10, scale: 2 }).notNull().default("200.00"),
  platinumFlatMarkup: decimal("platinum_flat_markup", { precision: 10, scale: 2 }).notNull().default("10.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  subscriptionTier: true,
  shippingAddress: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  description: true,
  category: true,
  manufacturer: true,
  sku: true,
  priceWholesale: true,
  requiresFFL: true,
  tags: true,
  images: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  userId: true,
  totalPrice: true,
  items: true,
  fflRecipientId: true,
  shippingAddress: true,
});

export const insertFflSchema = createInsertSchema(ffls).pick({
  businessName: true,
  licenseNumber: true,
  contactEmail: true,
  phone: true,
  address: true,
  zip: true,
});

export const insertHeroCarouselSlideSchema = createInsertSchema(heroCarouselSlides).pick({
  title: true,
  subtitle: true,
  imageUrl: true,
  buttonText: true,
  buttonLink: true,
  displayOrder: true,
  isActive: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).pick({
  key: true,
  value: true,
  description: true,
  category: true,
  isActive: true,
});

export const insertPricingRuleSchema = createInsertSchema(pricingRules).pick({
  name: true,
  bronzeMarkupType: true,
  bronzeMarkupValue: true,
  bronzeThreshold: true,
  bronzeFlatMarkup: true,
  goldMarkupType: true,
  goldMarkupValue: true,
  goldThreshold: true,
  goldFlatMarkup: true,
  platinumMarkupType: true,
  platinumMarkupValue: true,
  platinumThreshold: true,
  platinumFlatMarkup: true,
  isActive: true,
});

export const insertFilterConfigurationSchema = createInsertSchema(filterConfigurations).pick({
  filterType: true,
  displayName: true,
  isEnabled: true,
  defaultValue: true,
  displayOrder: true,
  isRequired: true,
  options: true,
});

export const insertCategorySettingSchema = createInsertSchema(categorySettings).pick({
  categoryName: true,
  isEnabled: true,
  displayOrder: true,
  parentCategory: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type FFL = typeof ffls.$inferSelect;
export type InsertFFL = z.infer<typeof insertFflSchema>;
export type StateShippingPolicy = typeof stateShippingPolicies.$inferSelect;
export type TierPricingRule = typeof tierPricingRules.$inferSelect;
export type HeroCarouselSlide = typeof heroCarouselSlides.$inferSelect;
export type InsertHeroCarouselSlide = z.infer<typeof insertHeroCarouselSlideSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = z.infer<typeof insertPricingRuleSchema>;
export type FilterConfiguration = typeof filterConfigurations.$inferSelect;
export type InsertFilterConfiguration = z.infer<typeof insertFilterConfigurationSchema>;
export type CategorySetting = typeof categorySettings.$inferSelect;
export type InsertCategorySetting = z.infer<typeof insertCategorySettingSchema>;
