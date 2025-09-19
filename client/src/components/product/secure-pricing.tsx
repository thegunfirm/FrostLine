import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Lock, Star, Crown } from "lucide-react";

interface SecurePricingProps {
  product: {
    priceBronze: string | null;
    priceGold: string | null;
    pricePlatinum: string | null;
    priceMSRP: string | null;
  };
  showUpgradePrompt?: boolean;
  className?: string;
}

export function SecurePricing({ product, showUpgradePrompt = true, className = "" }: SecurePricingProps) {
  const { user } = useAuth();
  
  // Fetch hide Gold pricing setting
  const { data: hideGoldSetting } = useQuery({
    queryKey: ["/api/admin/system-settings/hide_gold_when_equal_map"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const shouldHideGoldPricing = () => {
    // Hide Gold pricing if the setting is enabled and MSRP equals MAP
    if (hideGoldSetting?.value === "true") {
      const bronzePrice = product.priceBronze ? parseFloat(product.priceBronze) : 0;
      const goldPrice = product.priceGold ? parseFloat(product.priceGold) : 0;
      
      // If Bronze (MSRP) equals Gold (MAP), hide Gold pricing
      if (bronzePrice > 0 && goldPrice > 0 && Math.abs(bronzePrice - goldPrice) < 0.01) {
        return true;
      }
    }
    return false;
  };
  
  // CRITICAL: Never display platinum pricing publicly
  const getUserPrice = () => {
    if (!user) {
      // Public users only see Bronze pricing
      return product.priceBronze ? parseFloat(product.priceBronze) : null;
    }

    // Helper function to safely parse and validate tier prices
    const getSafePrice = (priceString: string | null): number | null => {
      if (!priceString) return null;
      const parsed = parseFloat(priceString);
      return (isFinite(parsed) && parsed > 0) ? parsed : null;
    };

    // Authenticated users see pricing based on tier
    switch (user.subscriptionTier) {
      case 'Platinum':
        // Platinum users see Gold pricing on product pages (Platinum pricing only in cart)
        return getSafePrice(product.priceGold) || 
               getSafePrice(product.priceBronze);
      case 'Gold':
        // Check if Gold pricing should be hidden when MSRP equals MAP
        if (shouldHideGoldPricing()) {
          return getSafePrice(product.priceBronze);
        }
        // Gold users get Gold pricing, fallback to Bronze if Gold unavailable
        return getSafePrice(product.priceGold) || 
               getSafePrice(product.priceBronze);
      case 'Bronze':
      default:
        return getSafePrice(product.priceBronze);
    }
  };

  const getUserTier = () => {
    return user?.subscriptionTier || 'Bronze';
  };

  const calculateSavings = () => {
    if (!user || !product.priceBronze) return null;

    const bronzePrice = parseFloat(product.priceBronze);
    const currentPrice = getUserPrice();
    
    if (!currentPrice || currentPrice >= bronzePrice) return null;
    
    return bronzePrice - currentPrice;
  };

  const getUpgradePrompt = () => {
    if (!user || !showUpgradePrompt) return null;

    const tier = getUserTier();
    const bronzePrice = product.priceBronze ? parseFloat(product.priceBronze) : 0;
    const goldPrice = product.priceGold ? parseFloat(product.priceGold) : 0;

    // Only show Gold upgrade if Gold pricing is available and not hidden
    if (tier === 'Bronze' && goldPrice > 0 && product.priceGold && !shouldHideGoldPricing()) {
      const goldSavings = bronzePrice - goldPrice;
      if (goldSavings > 0) {
        return {
          savings: goldSavings,
          targetTier: 'Gold',
          message: `Save $${goldSavings.toFixed(2)} with Gold membership`
        };
      }
    }

    return null;
  };

  const userPrice = getUserPrice();
  const userTier = getUserTier();
  const savings = calculateSavings();
  const upgradePrompt = getUpgradePrompt();

  if (!userPrice) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        <Lock className="w-4 h-4 inline mr-1" />
        Login to see pricing
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main Price Display */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-foreground">
          ${userPrice.toFixed(2)}
        </span>
        
        {/* Tier Badge */}
        <Badge variant={userTier === 'Gold' ? 'default' : 'secondary'} className="text-xs">
          {userTier === 'Gold' && <Star className="w-3 h-3 mr-1" />}
          {userTier === 'Platinum' && <Crown className="w-3 h-3 mr-1" />}
          {userTier}
        </Badge>
      </div>

      {/* Savings Display */}
      {savings && savings > 0 && (
        <div className="text-sm text-green-600 dark:text-green-400">
          You save: ${savings.toFixed(2)}
        </div>
      )}

      {/* MSRP Reference (if available) */}
      {product.priceMSRP && parseFloat(product.priceMSRP) > userPrice && (
        <div className="text-sm text-muted-foreground">
          <span className="line-through">MSRP: ${parseFloat(product.priceMSRP).toFixed(2)}</span>
        </div>
      )}

      {/* Upgrade Prompt */}
      {upgradePrompt && (
        <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md text-sm">
          <div className="text-blue-700 dark:text-blue-300 font-medium">
            {upgradePrompt.message}
          </div>
          <div className="text-blue-600 dark:text-blue-400 text-xs mt-1">
            Upgrade to {upgradePrompt.targetTier} membership
          </div>
        </div>
      )}

      {/* Privacy Notice for Platinum */}
      {userTier === 'Platinum' && (
        <div className="text-xs text-muted-foreground italic">
          * Platinum pricing available in cart
        </div>
      )}
    </div>
  );
}

/**
 * Cart-specific pricing component that can show Platinum prices
 * ONLY use this in authenticated cart/checkout contexts
 */
export function CartPricing({ product, userTier }: { 
  product: SecurePricingProps['product'], 
  userTier: string 
}) {
  // Helper function to safely parse and validate tier prices
  const getSafePrice = (priceString: string | null): number | null => {
    if (!priceString) return null;
    const parsed = parseFloat(priceString);
    return (isFinite(parsed) && parsed > 0) ? parsed : null;
  };

  const getCartPrice = () => {
    switch (userTier) {
      case 'Platinum':
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
  };

  const cartPrice = getCartPrice();

  if (!cartPrice) {
    return <span className="text-muted-foreground">Price unavailable</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-semibold">
        ${cartPrice.toFixed(2)}
      </span>
      <Badge variant={userTier === 'Platinum' ? 'default' : 'secondary'} className="text-xs">
        {userTier === 'Platinum' && <Crown className="w-3 h-3 mr-1" />}
        {userTier === 'Gold' && <Star className="w-3 h-3 mr-1" />}
        {userTier}
      </Badge>
    </div>
  );
}