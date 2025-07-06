import { db } from '../db';
import { products, pricingConfiguration, type Product } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface PricingRules {
  id: number;
  name: string;
  bronzeMarkupType: string;
  bronzeMarkupValue: string;
  goldMarkupType: string;
  goldMarkupValue: string;
  platinumMarkupType: string;
  platinumMarkupValue: string;
  priceThreshold: string;
  lowPriceBronzePercentage: string;
  lowPriceGoldPercentage: string;
  lowPricePlatinumPercentage: string;
  isActive: boolean;
  createdAt: Date;
}

export interface TierPricing {
  bronze: number;
  gold: number;
  platinum: number;
}

export interface RSRPricing {
  dealerPrice: number;
  mapPrice?: number;
  msrpPrice?: number;
}

class PricingService {
  private cachedRules: PricingRules | null = null;
  private lastRulesFetch: Date | null = null;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get active pricing rules (cached for performance)
   */
  async getPricingRules(): Promise<PricingRules | null> {
    const now = new Date();
    
    // Return cached rules if still valid
    if (this.cachedRules && this.lastRulesFetch && 
        (now.getTime() - this.lastRulesFetch.getTime()) < this.CACHE_DURATION) {
      return this.cachedRules;
    }

    try {
      const [rules] = await db.select()
        .from(pricingConfiguration)
        .where(eq(pricingConfiguration.isActive, true))
        .limit(1);

      this.cachedRules = rules || null;
      this.lastRulesFetch = now;
      
      return this.cachedRules;
    } catch (error) {
      console.error('Error fetching pricing rules:', error);
      return this.getDefaultRules();
    }
  }

  /**
   * Get default pricing rules if database is unavailable
   */
  private getDefaultRules(): PricingRules {
    return {
      id: 1,
      name: 'Default Pricing Rules',
      bronzeMarkupType: 'flat',
      bronzeMarkupValue: '20.00',
      goldMarkupType: 'flat',
      goldMarkupValue: '20.00',
      platinumMarkupType: 'flat',
      platinumMarkupValue: '20.00',
      priceThreshold: '10.00',
      lowPriceBronzePercentage: '25.00',
      lowPriceGoldPercentage: '15.00',
      lowPricePlatinumPercentage: '5.00',
      isActive: true,
      createdAt: new Date()
    };
  }

  /**
   * Calculate tier pricing based on RSR pricing data
   */
  async calculateTierPricing(rsrPricing: RSRPricing): Promise<TierPricing> {
    const rules = await this.getPricingRules();
    if (!rules) {
      throw new Error('No pricing rules available');
    }

    const { dealerPrice, mapPrice, msrpPrice } = rsrPricing;
    const threshold = parseFloat(rules.priceThreshold);

    // For products with all three prices (dealer, MAP, MSRP)
    if (mapPrice && msrpPrice) {
      return {
        platinum: this.applyMarkup(dealerPrice, rules.platinumMarkupType, rules.platinumMarkupValue, threshold, rules.lowPricePlatinumPercentage),
        gold: this.applyMarkup(mapPrice, rules.goldMarkupType, rules.goldMarkupValue, threshold, rules.lowPriceGoldPercentage),
        bronze: this.applyMarkup(msrpPrice, rules.bronzeMarkupType, rules.bronzeMarkupValue, threshold, rules.lowPriceBronzePercentage)
      };
    }

    // For products without MAP - calculate midpoint between dealer and MSRP
    if (msrpPrice && !mapPrice) {
      const midpoint = (dealerPrice + msrpPrice) / 2;
      
      return {
        platinum: this.applyMarkup(dealerPrice, rules.platinumMarkupType, rules.platinumMarkupValue, threshold, rules.lowPricePlatinumPercentage),
        gold: this.applyMarkup(midpoint, rules.goldMarkupType, rules.goldMarkupValue, threshold, rules.lowPriceGoldPercentage),
        bronze: this.applyMarkup(msrpPrice, rules.bronzeMarkupType, rules.bronzeMarkupValue, threshold, rules.lowPriceBronzePercentage)
      };
    }

    // Fallback for products with only dealer price
    return {
      platinum: this.applyMarkup(dealerPrice, rules.platinumMarkupType, rules.platinumMarkupValue, threshold, rules.lowPricePlatinumPercentage),
      gold: this.applyMarkup(dealerPrice * 1.15, rules.goldMarkupType, rules.goldMarkupValue, threshold, rules.lowPriceGoldPercentage),
      bronze: this.applyMarkup(dealerPrice * 1.30, rules.bronzeMarkupType, rules.bronzeMarkupValue, threshold, rules.lowPriceBronzePercentage)
    };
  }

  /**
   * Apply markup to a base price
   */
  private applyMarkup(
    basePrice: number,
    markupType: string,
    markupValue: string,
    threshold: number,
    lowPricePercentage: string
  ): number {
    const markup = parseFloat(markupValue);
    const lowPricePercent = parseFloat(lowPricePercentage);

    // Use percentage markup for low-priced items
    if (basePrice < threshold) {
      return basePrice * (1 + lowPricePercent / 100);
    }

    // Apply configured markup type
    if (markupType === 'percentage') {
      return basePrice * (1 + markup / 100);
    } else {
      return basePrice + markup;
    }
  }

  /**
   * Get display price for a product based on user tier
   * CRITICAL: Never return platinum price for public display
   */
  async getDisplayPrice(product: Product, userTier: string | null, isAuthenticated: boolean): Promise<number | null> {
    // Public users (not authenticated) can only see Bronze pricing
    if (!isAuthenticated) {
      return product.priceBronze ? parseFloat(product.priceBronze) : null;
    }

    // Authenticated users see pricing based on their tier
    switch (userTier) {
      case 'Platinum':
        // Platinum pricing is NEVER displayed publicly - only in cart or member areas
        return null; // This forces platinum pricing to be handled separately
      case 'Gold':
        return product.priceGold ? parseFloat(product.priceGold) : null;
      case 'Bronze':
      default:
        return product.priceBronze ? parseFloat(product.priceBronze) : null;
    }
  }

  /**
   * Get tier pricing for cart/checkout (authenticated users only)
   */
  async getCartPrice(product: Product, userTier: string): Promise<number | null> {
    switch (userTier) {
      case 'Platinum':
        return product.pricePlatinum ? parseFloat(product.pricePlatinum) : null;
      case 'Gold':
        return product.priceGold ? parseFloat(product.priceGold) : null;
      case 'Bronze':
      default:
        return product.priceBronze ? parseFloat(product.priceBronze) : null;
    }
  }

  /**
   * Calculate potential savings for tier upgrade prompts
   */
  async calculateSavings(product: Product, currentTier: string): Promise<{ goldSavings: number; platinumSavings: number }> {
    const bronzePrice = product.priceBronze ? parseFloat(product.priceBronze) : 0;
    const goldPrice = product.priceGold ? parseFloat(product.priceGold) : 0;
    const platinumPrice = product.pricePlatinum ? parseFloat(product.pricePlatinum) : 0;

    const goldSavings = currentTier === 'Bronze' ? Math.max(0, bronzePrice - goldPrice) : 0;
    const platinumSavings = currentTier === 'Bronze' ? Math.max(0, bronzePrice - platinumPrice) :
                           currentTier === 'Gold' ? Math.max(0, goldPrice - platinumPrice) : 0;

    return { goldSavings, platinumSavings };
  }

  /**
   * Update pricing configuration
   */
  async updatePricingRules(updates: Partial<PricingRules>): Promise<void> {
    try {
      await db.update(pricingConfiguration)
        .set(updates)
        .where(eq(pricingConfiguration.isActive, true));
      
      // Clear cache
      this.cachedRules = null;
      this.lastRulesFetch = null;
    } catch (error) {
      console.error('Error updating pricing rules:', error);
      throw error;
    }
  }

  /**
   * Initialize default pricing configuration
   */
  async initializeDefaultPricing(): Promise<void> {
    try {
      const existing = await db.select()
        .from(pricingConfiguration)
        .where(eq(pricingConfiguration.isActive, true))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(pricingConfiguration).values({
          name: 'Default Pricing Rules',
          bronzeMarkupType: 'flat',
          bronzeMarkupValue: '20.00',
          goldMarkupType: 'flat',
          goldMarkupValue: '20.00',
          platinumMarkupType: 'flat',
          platinumMarkupValue: '20.00',
          priceThreshold: '10.00',
          lowPriceBronzePercentage: '25.00',
          lowPriceGoldPercentage: '15.00',
          lowPricePlatinumPercentage: '5.00',
          isActive: true
        });
      }
    } catch (error) {
      console.error('Error initializing default pricing:', error);
    }
  }
}

export const pricingService = new PricingService();