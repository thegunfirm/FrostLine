import { db } from "../db";
import { pricingRules, products } from "@shared/schema";
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
        .from(pricingRules)
        .where(eq(pricingRules.isActive, true))
        .limit(1);
      
      this.activePricingRules = rules;
      this.lastRulesFetch = now;
    }
    
    return this.activePricingRules;
  }

  /**
   * Calculate tier pricing based on RSR wholesale price and MAP
   */
  async calculateTierPricing(
    wholesalePrice: number,
    mapPrice: number | null
  ): Promise<PricingCalculation> {
    const rules = await this.getActivePricingRules();
    
    if (!rules) {
      // Default rules if no pricing rules configured
      return {
        bronze: this.applyMarkup(wholesalePrice, "percentage", 25, 200, 50), // 25% or $50 flat
        gold: mapPrice ? this.applyMarkup(wholesalePrice, "percentage", 15, 200, 30) : null, // 15% or $30 flat
        platinum: this.applyMarkup(wholesalePrice, "percentage", 5, 200, 10) // 5% or $10 flat
      };
    }

    // Calculate Bronze pricing
    const bronze = this.applyMarkup(
      wholesalePrice,
      rules.bronzeMarkupType,
      parseFloat(rules.bronzeMarkupValue),
      parseFloat(rules.bronzeThreshold),
      parseFloat(rules.bronzeFlatMarkup)
    );

    // Calculate Gold pricing - only if MAP is available
    const gold = mapPrice ? this.applyMarkup(
      wholesalePrice,
      rules.goldMarkupType,
      parseFloat(rules.goldMarkupValue),
      parseFloat(rules.goldThreshold),
      parseFloat(rules.goldFlatMarkup)
    ) : null;

    // Calculate Platinum pricing
    const platinum = this.applyMarkup(
      wholesalePrice,
      rules.platinumMarkupType,
      parseFloat(rules.platinumMarkupValue),
      parseFloat(rules.platinumThreshold),
      parseFloat(rules.platinumFlatMarkup)
    );

    return { bronze, gold, platinum };
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
   * Recalculate all product pricing
   */
  async recalculateAllProductPricing() {
    console.log("🔄 Recalculating all product pricing...");
    
    const allProducts = await db
      .select({
        id: products.id,
        priceWholesale: products.priceWholesale,
        priceMAP: products.priceMAP
      })
      .from(products);

    let updatedCount = 0;
    
    for (const product of allProducts) {
      const pricing = await this.calculateTierPricing(
        parseFloat(product.priceWholesale),
        product.priceMAP ? parseFloat(product.priceMAP) : null
      );
      
      await this.updateProductPricing(product.id, pricing);
      updatedCount++;
    }

    console.log(`✅ Updated pricing for ${updatedCount} products`);
    return updatedCount;
  }
}

export const pricingEngine = new PricingEngine();