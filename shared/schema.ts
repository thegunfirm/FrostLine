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
  role: text("role").notNull().default("user"), // user, admin, support, dealer, manager
  isBanned: boolean("is_banned").default(false),
  membershipPaid: boolean("membership_paid").default(false), // Track FAP payment status
  stripeCustomerId: text("stripe_customer_id"), // For product payments
  fapCustomerId: text("fap_customer_id"), // For membership payments
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
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
  isRsrPartner: boolean("is_rsr_partner").default(false), // True if on RSR list
  isAtfActive: boolean("is_atf_active").default(true), // True if on current ATF list
  licenseType: text("license_type"), // 01-Dealer, 07-Manufacturer, etc.
  tradeNameDba: text("trade_name_dba"), // Doing Business As name
  mailingAddress: json("mailing_address"),
  licenseExpiration: timestamp("license_expiration"),
  lastAtfUpdate: timestamp("last_atf_update"),
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

// Order Restrictions for firearms compliance  
export const orderRestrictions = pgTable("order_restrictions", {
  id: serial("id").primaryKey(),
  restrictionType: text("restriction_type").notNull(), // "firearms_per_order", "firearms_per_month"
  maxQuantity: integer("max_quantity").notNull().default(5),
  requiresHumanReview: boolean("requires_human_review").default(true),
  isActive: boolean("is_active").default(true),
  description: text("description"),
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
export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = typeof adminSettings.$inferInsert;
export type OrderRestriction = typeof orderRestrictions.$inferSelect;
export type InsertOrderRestriction = typeof orderRestrictions.$inferInsert;
export type InsertHeroCarouselSlide = typeof heroCarouselSlides.$inferInsert;
export type CategoryRibbon = typeof categoryRibbons.$inferSelect;
export type AtfDirectoryFile = typeof atfDirectoryFiles.$inferSelect;
export type InsertAtfDirectoryFile = typeof atfDirectoryFiles.$inferInsert;
export type FflDataSource = typeof fflDataSources.$inferSelect;
export type InsertFflDataSource = typeof fflDataSources.$inferInsert;

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

// CMS Tables for Role-Based Management

// API Configuration Management (Admin Only)
export const apiConfigurations = pgTable("api_configurations", {
  id: serial("id").primaryKey(),
  serviceName: text("service_name").notNull().unique(), // RSR, Algolia, Authorize.Net, etc.
  configType: text("config_type").notNull(), // endpoint, credentials, settings
  configKey: text("config_key").notNull(), // specific configuration key
  configValue: text("config_value").notNull(), // encrypted configuration value
  isActive: boolean("is_active").default(true),
  description: text("description"), // Human-readable description
  lastModifiedBy: integer("last_modified_by").notNull(), // user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Templates (Manager/Higher Level Staff)
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull().unique(), // welcome, order_confirmation, ffl_transfer, etc.
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  variables: json("variables"), // Array of available template variables
  isActive: boolean("is_active").default(true),
  category: text("category").notNull(), // authentication, orders, shipping, etc.
  description: text("description"),
  lastModifiedBy: integer("last_modified_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Support Tickets (Support Staff)
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  customerId: integer("customer_id").notNull(),
  assignedTo: integer("assigned_to"), // support staff user ID
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
  category: text("category").notNull(), // order, shipping, ffl, account, technical
  relatedOrderId: integer("related_order_id"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Support Ticket Messages
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  senderId: integer("sender_id").notNull(), // user ID (customer or support staff)
  senderType: text("sender_type").notNull(), // customer, support, system
  message: text("message").notNull(),
  isInternal: boolean("is_internal").default(false), // internal staff notes
  attachments: json("attachments"), // Array of attachment objects
  createdAt: timestamp("created_at").defaultNow(),
});

// Order Management Extensions (Support Staff)
export const orderNotes = pgTable("order_notes", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  authorId: integer("author_id").notNull(), // support staff user ID
  noteType: text("note_type").notNull(), // internal, customer_communication, fulfillment
  content: text("content").notNull(),
  isVisibleToCustomer: boolean("is_visible_to_customer").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// System Settings (Admin Only)
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // Fixed column name
  value: text("value").notNull(), // Fixed column name
  dataType: text("data_type").notNull(), // string, number, boolean, json
  category: text("category").notNull(), // site, shipping, payments, inventory
  description: text("description"),
  isPublic: boolean("is_public").default(false), // whether setting is visible to frontend
  lastModifiedBy: integer("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Membership Tier Settings (CMS Management)
export const membershipTierSettings = pgTable("membership_tier_settings", {
  id: serial("id").primaryKey(),
  tier: text("tier").notNull().unique(), // Bronze, Gold, Platinum
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }).notNull(),
  features: json("features").notNull(), // Array of feature strings
  isPopular: boolean("is_popular").default(false),
  isFounderPricing: boolean("is_founder_pricing").default(false),
  founderLimit: integer("founder_limit").default(1000),
  founderCountRemaining: integer("founder_count_remaining").default(1000),
  description: text("description"),
  lastModifiedBy: integer("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ATF Directory File Management (Management Level Staff)
export const atfDirectoryFiles = pgTable("atf_directory_files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(), // Object storage path
  fileSize: integer("file_size").notNull(), // Size in bytes
  fileType: text("file_type").notNull(), // xlsx, txt, csv
  periodMonth: integer("period_month").notNull(), // 1-12
  periodYear: integer("period_year").notNull(), // 2025, etc.
  uploadedBy: integer("uploaded_by").notNull(), // management staff user ID
  processedAt: timestamp("processed_at"), // When file was processed into FFLs
  processingStatus: text("processing_status").notNull().default("pending"), // pending, processing, completed, failed
  recordsTotal: integer("records_total"), // Total records in file
  recordsProcessed: integer("records_processed"), // Successfully processed
  recordsSkipped: integer("records_skipped"), // Skipped (duplicates, errors)
  errorLog: text("error_log"), // Processing errors
  isActive: boolean("is_active").default(true), // Current active directory
  notes: text("notes"), // Management notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// FFL Data Source Tracking
export const fflDataSources = pgTable("ffl_data_sources", {
  id: serial("id").primaryKey(),
  sourceType: text("source_type").notNull(), // 'rsr', 'atf', 'manual'
  sourceName: text("source_name").notNull(), // 'RSR Distribution', 'ATF Directory July 2025', etc.
  lastUpdated: timestamp("last_updated").notNull(),
  recordCount: integer("record_count").notNull(),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Activity Logs (Support/Admin)
export const userActivityLogs = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // login, order_placed, password_change, etc.
  details: json("details"), // Additional context about the action
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CMS Relations
export const apiConfigurationsRelations = relations(apiConfigurations, ({ one }) => ({
  lastModifiedByUser: one(users, {
    fields: [apiConfigurations.lastModifiedBy],
    references: [users.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  lastModifiedByUser: one(users, {
    fields: [emailTemplates.lastModifiedBy],
    references: [users.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  customer: one(users, {
    fields: [supportTickets.customerId],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id],
  }),
  relatedOrder: one(orders, {
    fields: [supportTickets.relatedOrderId],
    references: [orders.id],
  }),
  messages: many(supportTicketMessages),
}));

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportTicketMessages.ticketId],
    references: [supportTickets.id],
  }),
  sender: one(users, {
    fields: [supportTicketMessages.senderId],
    references: [users.id],
  }),
}));

export const orderNotesRelations = relations(orderNotes, ({ one }) => ({
  order: one(orders, {
    fields: [orderNotes.orderId],
    references: [orders.id],
  }),
  author: one(users, {
    fields: [orderNotes.authorId],
    references: [users.id],
  }),
}));

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  lastModifiedByUser: one(users, {
    fields: [systemSettings.lastModifiedBy],
    references: [users.id],
  }),
}));

export const userActivityLogsRelations = relations(userActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLogs.userId],
    references: [users.id],
  }),
}));

// CMS Insert Schemas
export const insertApiConfigurationSchema = createInsertSchema(apiConfigurations);
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates);
export const insertSupportTicketSchema = createInsertSchema(supportTickets);
export const insertSupportTicketMessageSchema = createInsertSchema(supportTicketMessages);
export const insertOrderNoteSchema = createInsertSchema(orderNotes);
export const insertSystemSettingSchema = createInsertSchema(systemSettings);
export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs);

// CMS Types
export type InsertApiConfiguration = z.infer<typeof insertApiConfigurationSchema>;
export type ApiConfiguration = typeof apiConfigurations.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicketMessage = z.infer<typeof insertSupportTicketMessageSchema>;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertOrderNote = z.infer<typeof insertOrderNoteSchema>;
export type OrderNote = typeof orderNotes.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;