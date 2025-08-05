import { pgTable, serial, text, varchar, boolean, timestamp, integer, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// FAP User Management
export const fapUsers = pgTable("fap_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  subscriptionTier: varchar("subscription_tier", { length: 20 }).notNull().default("Bronze"), // Bronze, Gold, Platinum
  subscriptionStatus: varchar("subscription_status", { length: 20 }).notNull().default("active"), // active, inactive, suspended
  subscriptionStartDate: timestamp("subscription_start_date").defaultNow(),
  subscriptionEndDate: timestamp("subscription_end_date"),
  membershipPaid: boolean("membership_paid").notNull().default(false),
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
  role: varchar("role", { length: 20 }).notNull().default("user"), // user, admin, support
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// FAP CMS Settings
export const fapCmsSettings = pgTable("fap_cms_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingValue: text("setting_value").notNull(),
  settingType: varchar("setting_type", { length: 50 }).notNull(), // string, number, boolean, json
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // delivery, subscription, ffl, general
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: integer("updated_by").references(() => fapUsers.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Delivery Time Settings (CMS Controlled)
export const deliveryTimeSettings = pgTable("delivery_time_settings", {
  id: serial("id").primaryKey(),
  fulfillmentType: varchar("fulfillment_type", { length: 50 }).notNull(), // direct, warehouse_ffl, dropship_ffl
  productCategory: varchar("product_category", { length: 100 }),
  minDays: integer("min_days").notNull(),
  maxDays: integer("max_days").notNull(),
  displayText: text("display_text").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscription Tier Definitions
export const subscriptionTiers = pgTable("subscription_tiers", {
  id: serial("id").primaryKey(),
  tierName: varchar("tier_name", { length: 20 }).notNull().unique(), // Bronze, Gold, Platinum
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  benefits: jsonb("benefits").notNull(), // JSON array of benefits
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// FAP Admin Audit Log
export const fapAuditLog = pgTable("fap_audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => fapUsers.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export types
export type FapUser = typeof fapUsers.$inferSelect;
export type InsertFapUser = typeof fapUsers.$inferInsert;
export type FapCmsSetting = typeof fapCmsSettings.$inferSelect;
export type InsertFapCmsSetting = typeof fapCmsSettings.$inferInsert;
export type DeliveryTimeSetting = typeof deliveryTimeSettings.$inferSelect;
export type InsertDeliveryTimeSetting = typeof deliveryTimeSettings.$inferInsert;
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type InsertSubscriptionTier = typeof subscriptionTiers.$inferInsert;
export type FapAuditLog = typeof fapAuditLog.$inferSelect;
export type InsertFapAuditLog = typeof fapAuditLog.$inferInsert;

// Zod schemas
export const insertFapUserSchema = createInsertSchema(fapUsers);
export const selectFapUserSchema = createSelectSchema(fapUsers);
export const insertFapCmsSettingSchema = createInsertSchema(fapCmsSettings);
export const selectFapCmsSettingSchema = createSelectSchema(fapCmsSettings);
export const insertDeliveryTimeSettingSchema = createInsertSchema(deliveryTimeSettings);
export const selectDeliveryTimeSettingSchema = createSelectSchema(deliveryTimeSettings);
export const insertSubscriptionTierSchema = createInsertSchema(subscriptionTiers);
export const selectSubscriptionTierSchema = createSelectSchema(subscriptionTiers);