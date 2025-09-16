/**
 * Centralized Pricing Utility
 * 
 * This utility consolidates ALL pricing logic across the application to ensure
 * consistency between search results, product pages, cart, and other components.
 */

export interface ProductPricing {
  priceBronze: string | null;
  priceGold: string | null;
  pricePlatinum: string | null;
  priceMSRP: string | null;
  priceMAP?: string | null;
  inStock?: boolean;
  stockQuantity?: number;
}

export interface User {
  subscriptionTier: string;
}

export interface PricingResult {
  price: number | null;
  tier: string;
  savings: number | null;
  originalPrice: number | null;
  showUpgrade: boolean;
  upgradeSavings: number | null;
  isStockAvailable: boolean;
}

/**
 * Helper function to safely parse and validate tier prices
 */
export function getSafePrice(priceValue: string | number | null | undefined): number | null {
  if (priceValue == null) return null;
  
  const parsed = typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue;
  return (isFinite(parsed) && parsed > 0) ? parsed : null;
}

/**
 * Check if Gold pricing should be hidden when MSRP equals MAP
 */
export function shouldHideGoldPricing(product: ProductPricing, hideGoldSetting?: { value: string }): boolean {
  if (hideGoldSetting?.value !== "true") return false;
  
  const bronzePrice = getSafePrice(product.priceBronze);
  const goldPrice = getSafePrice(product.priceGold);
  
  // If Bronze (MSRP) equals Gold (MAP), hide Gold pricing
  if (bronzePrice && goldPrice && Math.abs(bronzePrice - goldPrice) < 0.01) {
    return true;
  }
  
  return false;
}

/**
 * Get the appropriate price for a user's tier in public contexts (product pages, search)
 * NEVER shows Platinum pricing publicly - only Gold pricing for Platinum users
 */
export function getPublicTierPrice(product: ProductPricing, user: User | null, hideGoldSetting?: { value: string }): number | null {
  if (!user) {
    // Public users only see Bronze pricing
    return getSafePrice(product.priceBronze);
  }

  // Authenticated users see pricing based on tier
  switch (user.subscriptionTier) {
    case 'Platinum':
      // Platinum users see Gold pricing on product pages (Platinum pricing only in cart)
      return getSafePrice(product.priceGold) || getSafePrice(product.priceBronze);
      
    case 'Gold':
      // Check if Gold pricing should be hidden when MSRP equals MAP
      if (shouldHideGoldPricing(product, hideGoldSetting)) {
        return getSafePrice(product.priceBronze);
      }
      // Gold users get Gold pricing, fallback to Bronze if Gold unavailable
      return getSafePrice(product.priceGold) || getSafePrice(product.priceBronze);
      
    case 'Bronze':
    default:
      return getSafePrice(product.priceBronze);
  }
}

/**
 * Get the appropriate price for cart/checkout contexts where Platinum pricing can be revealed
 */
export function getCartTierPrice(product: ProductPricing, user: User | null): number | null {
  if (!user) {
    // Non-logged users see Bronze pricing
    return getSafePrice(product.priceBronze);
  }

  // For logged users, show their tier-appropriate pricing
  switch (user.subscriptionTier) {
    case 'Platinum':
      // Platinum users see their actual Platinum pricing in cart
      return getSafePrice(product.pricePlatinum) || 
             getSafePrice(product.priceGold) || 
             getSafePrice(product.priceBronze);
    case 'Gold':
      return getSafePrice(product.priceGold) || 
             getSafePrice(product.priceBronze);
    case 'Bronze':
    default:
      return getSafePrice(product.priceBronze);
  }
}

/**
 * Get comprehensive pricing information for a product
 */
export function getComprehensivePricing(
  product: ProductPricing, 
  user: User | null, 
  context: 'public' | 'cart' = 'public',
  hideGoldSetting?: { value: string }
): PricingResult {
  const basePrice = context === 'cart' 
    ? getCartTierPrice(product, user)
    : getPublicTierPrice(product, user, hideGoldSetting);

  const bronzePrice = getSafePrice(product.priceBronze);
  const goldPrice = getSafePrice(product.priceGold);
  const platinumPrice = getSafePrice(product.pricePlatinum);
  
  const userTier = user?.subscriptionTier || 'Bronze';
  
  // Calculate savings compared to Bronze price
  const savings = (bronzePrice && basePrice && basePrice < bronzePrice) 
    ? bronzePrice - basePrice 
    : null;

  // Calculate upgrade savings (Bronze to Gold)
  const upgradeSavings = (!user || userTier === 'Bronze') && bronzePrice && goldPrice && goldPrice < bronzePrice
    ? bronzePrice - goldPrice
    : null;

  // Determine if should show upgrade prompt
  const showUpgrade = !user || (userTier === 'Bronze' && !!upgradeSavings && !shouldHideGoldPricing(product, hideGoldSetting));

  // Stock availability
  const isStockAvailable = product.inStock === true || (product.stockQuantity && product.stockQuantity > 0) || false;

  return {
    price: basePrice,
    tier: userTier,
    savings,
    originalPrice: bronzePrice,
    showUpgrade,
    upgradeSavings,
    isStockAvailable
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number | null): string {
  if (price === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}

/**
 * Get all tier prices for display (used in product cards)
 */
export function getAllTierPrices(product: ProductPricing): {
  bronze: number | null;
  gold: number | null;
  platinum: number | null;
} {
  return {
    bronze: getSafePrice(product.priceBronze),
    gold: getSafePrice(product.priceGold),
    platinum: getSafePrice(product.pricePlatinum)
  };
}