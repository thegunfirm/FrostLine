import { db } from './db';
import { orders, orderLines, products, firearmsComplianceSettings } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import type { InsertOrder } from '@shared/schema';

export interface FirearmsComplianceConfig {
  policyFirearmWindowDays: number;
  policyFirearmLimit: number;
  featureMultiFirearmHold: boolean;
  featureFflHold: boolean;
}

export interface ComplianceCheckResult {
  hasFirearms: boolean;
  requiresHold: boolean;
  holdType: 'FFL' | 'Multi-Firearm' | null;
  firearmsCount: number;
  pastFirearmsCount: number;
  windowDays: number;
  limitQuantity: number;
  reason?: string;
}

export interface CartItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  isFirearm: boolean;
  requiresFFL: boolean;
  manufacturer?: string; // Product manufacturer for drop-ship eligibility
}

export class FirearmsComplianceService {
  private config: FirearmsComplianceConfig | null = null;

  /**
   * Load compliance configuration from database
   */
  private async loadConfig(): Promise<FirearmsComplianceConfig> {
    if (this.config) {
      return this.config;
    }

    const settings = await db
      .select()
      .from(firearmsComplianceSettings)
      .where(eq(firearmsComplianceSettings.isActive, true))
      .limit(1);

    if (settings.length === 0) {
      // Default configuration if none exists
      this.config = {
        policyFirearmWindowDays: 30,
        policyFirearmLimit: 5,
        featureMultiFirearmHold: true,
        featureFflHold: true,
      };
    } else {
      const setting = settings[0];
      this.config = {
        policyFirearmWindowDays: setting.policyFirearmWindowDays,
        policyFirearmLimit: setting.policyFirearmLimit,
        featureMultiFirearmHold: setting.featureMultiFirearmHold,
        featureFflHold: setting.featureFflHold,
      };
    }

    return this.config;
  }

  /**
   * Check if cart items have firearms
   */
  async checkCartForFirearms(cartItems: CartItem[]): Promise<boolean> {
    return cartItems.some(item => item.isFirearm || item.requiresFFL);
  }

  /**
   * Calculate past firearms count in rolling window using SQL
   */
  async calculatePastFirearmsCount(userId: number, windowDays: number): Promise<number> {
    const result = await db.execute(sql`
      SELECT COALESCE(SUM(l.quantity), 0)::integer AS past_qty
      FROM orders o
      JOIN order_lines l ON l.order_id = o.id
      WHERE o.user_id = ${userId}
        AND l.is_firearm = true
        AND o.status IN ('Paid', 'Pending FFL', 'Ready to Fulfill', 'Shipped')
        AND o.created_at >= NOW() - (make_interval(days => ${windowDays}))
    `);

    return (result.rows[0] as any)?.past_qty || 0;
  }

  /**
   * Check if user has verified FFL on file
   */
  async userHasVerifiedFFL(userId: number): Promise<boolean> {
    // Check if user has preferredFflId set and that FFL is active
    const userWithFFL = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, userId),
      with: {
        preferredFfl: true,
      },
    });

    return !!(userWithFFL?.preferredFfl && userWithFFL.preferredFfl.isAtfActive);
  }

  /**
   * Comprehensive compliance check for checkout
   */
  async performComplianceCheck(
    userId: number,
    cartItems: CartItem[]
  ): Promise<ComplianceCheckResult> {
    const config = await this.loadConfig();
    const hasFirearms = await this.checkCartForFirearms(cartItems);
    const currentFirearmsCount = cartItems
      .filter(item => item.isFirearm || item.requiresFFL)
      .reduce((sum, item) => sum + item.quantity, 0);

    // No firearms, no holds needed
    if (!hasFirearms) {
      return {
        hasFirearms: false,
        requiresHold: false,
        holdType: null,
        firearmsCount: 0,
        pastFirearmsCount: 0,
        windowDays: config.policyFirearmWindowDays,
        limitQuantity: config.policyFirearmLimit,
      };
    }

    // Check FFL requirement first
    if (config.featureFflHold && hasFirearms) {
      const hasVerifiedFFL = await this.userHasVerifiedFFL(userId);
      
      if (!hasVerifiedFFL) {
        return {
          hasFirearms: true,
          requiresHold: true,
          holdType: 'FFL',
          firearmsCount: currentFirearmsCount,
          pastFirearmsCount: 0, // Not relevant for FFL hold
          windowDays: config.policyFirearmWindowDays,
          limitQuantity: config.policyFirearmLimit,
          reason: 'No verified FFL on file',
        };
      }
    }

    // Check multi-firearm limit
    if (config.featureMultiFirearmHold) {
      const pastFirearmsCount = await this.calculatePastFirearmsCount(
        userId,
        config.policyFirearmWindowDays
      );
      const totalFirearmsCount = pastFirearmsCount + currentFirearmsCount;

      if (totalFirearmsCount >= config.policyFirearmLimit) {
        return {
          hasFirearms: true,
          requiresHold: true,
          holdType: 'Multi-Firearm',
          firearmsCount: currentFirearmsCount,
          pastFirearmsCount,
          windowDays: config.policyFirearmWindowDays,
          limitQuantity: config.policyFirearmLimit,
          reason: `Would exceed limit of ${config.policyFirearmLimit} firearms in ${config.policyFirearmWindowDays} days`,
        };
      }
    }

    // No holds needed
    return {
      hasFirearms: true,
      requiresHold: false,
      holdType: null,
      firearmsCount: currentFirearmsCount,
      pastFirearmsCount: await this.calculatePastFirearmsCount(
        userId,
        config.policyFirearmWindowDays
      ),
      windowDays: config.policyFirearmWindowDays,
      limitQuantity: config.policyFirearmLimit,
    };
  }

  /**
   * Map order status to appropriate status based on hold type
   */
  getOrderStatusForHold(holdType: 'FFL' | 'Multi-Firearm' | null): string {
    switch (holdType) {
      case 'FFL':
        return 'Pending FFL';
      case 'Multi-Firearm':
        return 'Hold – Multi-Firearm';
      default:
        return 'Paid'; // No hold, normal processing
    }
  }

  /**
   * Map order status to Zoho deal stage
   */
  mapOrderStatusToDealStage(orderStatus: string): string {
    const statusMapping: Record<string, string> = {
      'Pending FFL': 'Pending FFL',
      'Hold – Multi-Firearm': 'Compliance Hold',
      'Ready to Fulfill': 'Ready to Fulfill',
      'Paid': 'Paid',
      'Shipped': 'Closed Won',
      'Canceled': 'Closed Lost',
      'Cancelled': 'Closed Lost',
    };

    return statusMapping[orderStatus] || 'Qualification';
  }

  /**
   * Get current compliance configuration
   */
  async getComplianceConfig(): Promise<FirearmsComplianceConfig> {
    return await this.loadConfig();
  }

  /**
   * Update compliance configuration (admin only)
   */
  async updateComplianceConfig(
    config: Partial<FirearmsComplianceConfig>,
    modifiedBy: number
  ): Promise<void> {
    const currentConfig = await this.loadConfig();
    const updatedConfig = { ...currentConfig, ...config };

    // First, deactivate existing config
    await db
      .update(firearmsComplianceSettings)
      .set({ isActive: false })
      .where(eq(firearmsComplianceSettings.isActive, true));

    // Insert new active config
    await db.insert(firearmsComplianceSettings).values({
      policyFirearmWindowDays: updatedConfig.policyFirearmWindowDays,
      policyFirearmLimit: updatedConfig.policyFirearmLimit,
      featureMultiFirearmHold: updatedConfig.featureMultiFirearmHold,
      featureFflHold: updatedConfig.featureFflHold,
      isActive: true,
      lastModifiedBy: modifiedBy,
    });

    // Clear cached config
    this.config = null;
  }
}

// Export singleton instance
export const firearmsComplianceService = new FirearmsComplianceService();