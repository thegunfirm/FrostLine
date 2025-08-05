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
  membershipPaid: boolean("membership_paid").default(false), // Track FAP payment status
  stripeCustomerId: text("stripe_customer_id"), // For product payments
  fapCustomerId: text("fap_customer_id"), // For membership payments
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
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
  internalSpecial: boolean("internal_special").default(false), // Internal special pricing/promotion
  specialDescription: text("special_description"), // Description of internal special
  accessories: text("accessories"), // What accessories come with the product
  distributor: text("distributor").default("RSR"),
  requiresFFL: boolean("requires_ffl").default(false),
  mustRouteThroughGunFirm: boolean("must_route_through_gun_firm").default(false),
  tags: json("tags"),
  caliber: text("caliber"), // Extracted caliber (9mm, .45ACP, .223, etc.)
  capacity: integer("capacity"), // Magazine capacity for handguns/rifles
  firearmType: text("firearm_type"), // Extracted firearm type (1911, Glock, AR-15, etc.)
  barrelLength: text("barrel_length"), // Extracted barrel length (4", 3.9", etc.)
  finish: text("finish"), // Extracted finish/color (FDE, Black, Stainless, etc.)
  frameSize: text("frame_size"), // Extracted frame size (Compact, Full Size, Subcompact, etc.)
  actionType: text("action_type"), // Extracted action type (DA/SA, Striker, etc.)
  sightType: text("sight_type"), // Extracted sight type (Night Sights, Fiber Optic, etc.)
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
  platformCategory: text("platform_category"), // Parts platform categorization (Glock, AR-15, AR-10, etc.)
  partTypeCategory: text("part_type_category"), // Parts type categorization (Magazine, Trigger, etc.)
  nfaItemType: text("nfa_item_type"), // NFA item type (SBR, Suppressor, Destructive Device, etc.)
  barrelLengthNfa: text("barrel_length_nfa"), // NFA-specific barrel length
  finishNfa: text("finish_nfa"), // NFA-specific finish
  accessoryType: text("accessoryType"), // Accessory type (Sights, Grips, Cases, Holsters, etc.)
  compatibility: text("compatibility"), // Platform compatibility (AR-15, Glock, 1911, etc.)
  materialFinish: text("materialFinish"), // Material/finish (Aluminum, Steel, Polymer, etc.)
  mountType: text("mountType"), // Mount type (Picatinny, Weaver, Quick Detach, etc.)
  receiverType: text("receiver_type"), // Receiver type (Handgun Lower, Rifle Lower, Upper, etc.)
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
  fulfillmentGroups: json("fulfillment_groups"), // Direct, FFL Non-Dropship, FFL Dropship
  authorizeNetTransactionId: text("authorize_net_transaction_id"),
  paymentMethod: text("payment_method").default("authorize_net"), // authorize_net, stripe, etc
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

// Cart persistence for authenticated users
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  items: json("items").notNull(), // Array of cart items
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CMS settings for checkout configuration
export const checkoutSettings = pgTable("checkout_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fulfillment configuration
export const fulfillmentSettings = pgTable("fulfillment_settings", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "direct", "ffl_non_dropship", "ffl_dropship"  
  deliveryDaysMin: integer("delivery_days_min").notNull(),
  deliveryDaysMax: integer("delivery_days_max").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
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
  buttonText: text("button_text"),
  buttonLink: text("button_link"),
  backgroundImage: text("background_image"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categoryRibbons = pgTable("category_ribbons", {
  id: serial("id").primaryKey(),
  categoryName: text("category_name").notNull(),
  displayName: text("display_name"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: text("category").default("general"),
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

export const cartsRelations = relations(carts, ({ one }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type FFL = typeof ffls.$inferSelect;
export type InsertFFL = typeof ffls.$inferInsert;
export type Cart = typeof carts.$inferSelect;
export type InsertCart = typeof carts.$inferInsert;
export type CheckoutSetting = typeof checkoutSettings.$inferSelect;
export type InsertCheckoutSetting = typeof checkoutSettings.$inferInsert;
export type FulfillmentSetting = typeof fulfillmentSettings.$inferSelect;
export type InsertFulfillmentSetting = typeof fulfillmentSettings.$inferInsert;
export type StateShippingPolicy = typeof stateShippingPolicies.$inferSelect;
export type TierPricingRule = typeof tierPricingRules.$inferSelect;
export type HeroCarouselSlide = typeof heroCarouselSlides.$inferSelect;
export type InsertHeroCarouselSlide = typeof heroCarouselSlides.$inferInsert;
export type CategoryRibbon = typeof categoryRibbons.$inferSelect;
export type AdminSetting = typeof adminSettings.$inferSelect;

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertProductSchema = createInsertSchema(products);
export const insertOrderSchema = createInsertSchema(orders);
export const insertFflSchema = createInsertSchema(ffls);
export const insertCartSchema = createInsertSchema(carts);

// Validation schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.omit({
  id: true,
  createdAt: true,
  lifetimeSavings: true,
  savingsIfGold: true,
  savingsIfPlatinum: true,
  role: true,
  isBanned: true,
  membershipPaid: true,
  stripeCustomerId: true,
  fapCustomerId: true,
  emailVerified: true,
  emailVerificationToken: true,
});

export const updateUserTierSchema = z.object({
  subscriptionTier: z.enum(["Bronze", "Gold", "Platinum"]),
});