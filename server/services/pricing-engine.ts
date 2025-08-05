import { db } from "../db";
import { tierPricingRules, products } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface PricingCalculation {
  bronze: number;
  gold: number | null;
  platinum: number;
}

export class PricingEngine {
  private activePricingRules: any = null;
  private lastRulesFetch = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get active pricing rules with caching
   */
  private async getActivePricingRules() {
    const now = Date.now();
    
    if (!this.activePricingRules || (now - this.lastRulesFetch) > this.CACHE_DURATION) {
      const [rules] = await db
        .select()
        .from(tierPricingRules)
        .where(eq(tierPricingRules.isActive, true))
        .limit(1);
      
      this.activePricingRules = rules;
      this.lastRulesFetch = now;
    }
    
    return this.activePricingRules;
  }

  /**
   * Calculate tier pricing based on RSR wholesale, MSRP, and MAP prices
   */
  async calculateTierPricing(
    wholesalePrice: number,
    mapPrice: number | null,
    msrpPrice: number | null = null
  ): Promise<PricingCalculation> {
    
    // Bronze = MSRP (if available and valid), otherwise apply markup rules
    const bronze = (msrpPrice !== null && msrpPrice !== undefined && msrpPrice > 0) ? 
      msrpPrice : 
      await this.calculateMarkupPrice(wholesalePrice, 'bronze');
    
    // Gold = MAP (if available and valid), otherwise apply markup rules  
    const gold = (mapPrice !== null && mapPrice !== undefined && mapPrice > 0) ? 
      mapPrice : 
      await this.calculateMarkupPrice(wholesalePrice, 'gold');
    
    // Platinum = Apply markup rules (dealer pricing)
    const platinum = await this.calculateMarkupPrice(wholesalePrice, 'platinum');

    return { bronze, gold, platinum };
  }

  /**
   * Calculate pricing using markup rules for a specific tier
   */
  private async calculateMarkupPrice(wholesalePrice: number, tier: 'bronze' | 'gold' | 'platinum'): Promise<number> {
    const rules = await this.getActivePricingRules();
    
    if (!rules) {
      // Default rules if no pricing rules configured
      const defaultMarkups = {
        bronze: { percentage: 25, threshold: 200, flat: 50 },
        gold: { percentage: 15, threshold: 200, flat: 30 },
        platinum: { percentage: 5, threshold: 200, flat: 10 }
      };
      const markup = defaultMarkups[tier];
      return this.applyMarkup(wholesalePrice, "percentage", markup.percentage, markup.threshold, markup.flat);
    }

    // Apply tier-specific markup rules
    switch (tier) {
      case 'bronze':
        return this.applyMarkup(
          wholesalePrice,
          rules.bronzeMarkupType,
          parseFloat(rules.bronzeMarkupValue),
          parseFloat(rules.bronzeThreshold),
          parseFloat(rules.bronzeFlatMarkup)
        );
      case 'gold':
        return this.applyMarkup(
          wholesalePrice,
          rules.goldMarkupType,
          parseFloat(rules.goldMarkupValue),
          parseFloat(rules.goldThreshold),
          parseFloat(rules.goldFlatMarkup)
        );
      case 'platinum':
        return this.applyMarkup(
          wholesalePrice,
          rules.platinumMarkupType,
          parseFloat(rules.platinumMarkupValue),
          parseFloat(rules.platinumThreshold),
          parseFloat(rules.platinumFlatMarkup)
        );
      default:
        return wholesalePrice;
    }
  }

  /**
   * Apply markup based on type and threshold
   */
  private applyMarkup(
    basePrice: number,
    markupType: string,
    percentageValue: number,
    threshold: number,
    flatValue: number
  ): number {
    if (markupType === "flat") {
      return basePrice + (basePrice >= threshold ? flatValue : (basePrice * percentageValue / 100));
    } else {
      // Percentage markup
      if (basePrice >= threshold) {
        return basePrice + flatValue; // Use flat markup for products over threshold
      } else {
        return basePrice * (1 + percentageValue / 100); // Use percentage markup for products under threshold
      }
    }
  }

  /**
   * Update product pricing in database
   */
  async updateProductPricing(productId: number, pricing: PricingCalculation) {
    console.log(`💰 Updating product ${productId}: Bronze=$${pricing.bronze}, Gold=$${pricing.gold}, Platinum=$${pricing.platinum}`);
    await db
      .update(products)
      .set({
        priceBronze: pricing.bronze.toFixed(2),
        priceGold: pricing.gold ? pricing.gold.toFixed(2) : null,
        pricePlatinum: pricing.platinum.toFixed(2)
      })
      .where(eq(products.id, productId));
  }

  /**
   * Recalculate all product pricing using MSRP and MAP data
   */
  async recalculateAllProductPricing() {
    console.log("🔄 Recalculating all product pricing...");
    
    const allProducts = await db
      .select({
        id: products.id,
        priceWholesale: products.priceWholesale,
        priceMAP: products.priceMAP,
        priceMSRP: products.priceMSRP
      })
      .from(products);

    let updatedCount = 0;
    
    for (const product of allProducts) {
      const pricing = await this.calculateTierPricing(
        parseFloat(product.priceWholesale),
        product.priceMAP ? parseFloat(product.priceMAP) : null,
        product.priceMSRP ? parseFloat(product.priceMSRP) : null
      );
      
      await this.updateProductPricing(product.id, pricing);
      updatedCount++;
    }

    console.log(`✅ Updated pricing for ${updatedCount} products`);
    return updatedCount;
  }
}

export const pricingEngine = new PricingEngine();