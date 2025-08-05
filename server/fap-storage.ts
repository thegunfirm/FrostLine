import { db } from "./db";
import { fapUsers, fapCmsSettings, deliveryTimeSettings, subscriptionTiers, fapAuditLog, type FapUser, type InsertFapUser, type FapCmsSetting, type InsertFapCmsSetting, type DeliveryTimeSetting, type InsertDeliveryTimeSetting, type SubscriptionTier, type InsertSubscriptionTier } from "@shared/fap-schema";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IFapStorage {
  // User Management
  getFapUser(id: number): Promise<FapUser | undefined>;
  getFapUserByEmail(email: string): Promise<FapUser | undefined>;
  createFapUser(user: InsertFapUser): Promise<FapUser>;
  updateFapUser(id: number, updates: Partial<FapUser>): Promise<FapUser>;
  updateUserSubscriptionTier(id: number, tier: string, paid: boolean): Promise<FapUser>;
  validateFapUserCredentials(email: string, password: string): Promise<FapUser | null>;

  // CMS Settings Management
  getCmsSettings(category?: string): Promise<FapCmsSetting[]>;
  getCmsSetting(key: string): Promise<FapCmsSetting | undefined>;
  setCmsSetting(setting: InsertFapCmsSetting): Promise<FapCmsSetting>;
  updateCmsSetting(key: string, value: string, updatedBy: number): Promise<FapCmsSetting>;

  // Delivery Time Management
  getDeliveryTimeSettings(): Promise<DeliveryTimeSetting[]>;
  getDeliveryTimeByFulfillmentType(type: string, category?: string): Promise<DeliveryTimeSetting | undefined>;
  updateDeliveryTimeSetting(id: number, updates: Partial<DeliveryTimeSetting>): Promise<DeliveryTimeSetting>;

  // Subscription Tier Management
  getSubscriptionTiers(): Promise<SubscriptionTier[]>;
  getSubscriptionTier(tierName: string): Promise<SubscriptionTier | undefined>;
  updateSubscriptionTier(id: number, updates: Partial<SubscriptionTier>): Promise<SubscriptionTier>;

  // Settings Helpers
  getSubscriptionEnforcementEnabled(): Promise<boolean>;
  getFflSourceSettings(): Promise<{ useAtf: boolean; useRsr: boolean }>;
}

export class FapDatabaseStorage implements IFapStorage {
  // User Management
  async getFapUser(id: number): Promise<FapUser | undefined> {
    const [user] = await db.select().from(fapUsers).where(eq(fapUsers.id, id));
    return user || undefined;
  }

  async getFapUserByEmail(email: string): Promise<FapUser | undefined> {
    const [user] = await db.select().from(fapUsers).where(eq(fapUsers.email, email));
    return user || undefined;
  }

  async createFapUser(user: InsertFapUser): Promise<FapUser> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(user.passwordHash, 10);
    const [newUser] = await db
      .insert(fapUsers)
      .values({
        ...user,
        passwordHash: hashedPassword,
      })
      .returning();
    return newUser;
  }

  async updateFapUser(id: number, updates: Partial<FapUser>): Promise<FapUser> {
    const [updatedUser] = await db
      .update(fapUsers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fapUsers.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserSubscriptionTier(id: number, tier: string, paid: boolean): Promise<FapUser> {
    const [updatedUser] = await db
      .update(fapUsers)
      .set({
        subscriptionTier: tier,
        membershipPaid: paid,
        subscriptionStatus: paid ? 'active' : 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(fapUsers.id, id))
      .returning();
    return updatedUser;
  }

  async validateFapUserCredentials(email: string, password: string): Promise<FapUser | null> {
    const user = await this.getFapUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  // CMS Settings Management
  async getCmsSettings(category?: string): Promise<FapCmsSetting[]> {
    const query = db.select().from(fapCmsSettings).where(eq(fapCmsSettings.isActive, true));
    
    if (category) {
      return await query.where(eq(fapCmsSettings.category, category));
    }
    
    return await query;
  }

  async getCmsSetting(key: string): Promise<FapCmsSetting | undefined> {
    const [setting] = await db
      .select()
      .from(fapCmsSettings)
      .where(and(eq(fapCmsSettings.settingKey, key), eq(fapCmsSettings.isActive, true)));
    return setting || undefined;
  }

  async setCmsSetting(setting: InsertFapCmsSetting): Promise<FapCmsSetting> {
    const [newSetting] = await db
      .insert(fapCmsSettings)
      .values(setting)
      .returning();
    return newSetting;
  }

  async updateCmsSetting(key: string, value: string, updatedBy: number): Promise<FapCmsSetting> {
    const [updatedSetting] = await db
      .update(fapCmsSettings)
      .set({
        settingValue: value,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(fapCmsSettings.settingKey, key))
      .returning();
    return updatedSetting;
  }

  // Delivery Time Management
  async getDeliveryTimeSettings(): Promise<DeliveryTimeSetting[]> {
    return await db
      .select()
      .from(deliveryTimeSettings)
      .where(eq(deliveryTimeSettings.isActive, true))
      .orderBy(deliveryTimeSettings.fulfillmentType, deliveryTimeSettings.productCategory);
  }

  async getDeliveryTimeByFulfillmentType(type: string, category?: string): Promise<DeliveryTimeSetting | undefined> {
    let query = db
      .select()
      .from(deliveryTimeSettings)
      .where(and(
        eq(deliveryTimeSettings.fulfillmentType, type),
        eq(deliveryTimeSettings.isActive, true)
      ));

    if (category) {
      query = query.where(eq(deliveryTimeSettings.productCategory, category));
    }

    const [setting] = await query;
    return setting || undefined;
  }

  async updateDeliveryTimeSetting(id: number, updates: Partial<DeliveryTimeSetting>): Promise<DeliveryTimeSetting> {
    const [updatedSetting] = await db
      .update(deliveryTimeSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deliveryTimeSettings.id, id))
      .returning();
    return updatedSetting;
  }

  // Subscription Tier Management
  async getSubscriptionTiers(): Promise<SubscriptionTier[]> {
    return await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.isActive, true))
      .orderBy(subscriptionTiers.sortOrder);
  }

  async getSubscriptionTier(tierName: string): Promise<SubscriptionTier | undefined> {
    const [tier] = await db
      .select()
      .from(subscriptionTiers)
      .where(and(eq(subscriptionTiers.tierName, tierName), eq(subscriptionTiers.isActive, true)));
    return tier || undefined;
  }

  async updateSubscriptionTier(id: number, updates: Partial<SubscriptionTier>): Promise<SubscriptionTier> {
    const [updatedTier] = await db
      .update(subscriptionTiers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptionTiers.id, id))
      .returning();
    return updatedTier;
  }

  // Settings Helpers
  async getSubscriptionEnforcementEnabled(): Promise<boolean> {
    const setting = await this.getCmsSetting('subscription_enforcement_enabled');
    return setting?.settingValue === 'true';
  }

  async getFflSourceSettings(): Promise<{ useAtf: boolean; useRsr: boolean }> {
    const atfSetting = await this.getCmsSetting('ffl_source_atf_enabled');
    const rsrSetting = await this.getCmsSetting('ffl_source_rsr_enabled');
    
    return {
      useAtf: atfSetting?.settingValue === 'true',
      useRsr: rsrSetting?.settingValue === 'true',
    };
  }
}

export const fapStorage = new FapDatabaseStorage();