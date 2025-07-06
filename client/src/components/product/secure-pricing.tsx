import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
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
  
  // CRITICAL: Never display platinum pricing publicly
  const getUserPrice = () => {
    if (!user) {
      // Public users only see Bronze pricing
      return product.priceBronze ? parseFloat(product.priceBronze) : null;
    }

    // Authenticated users see pricing based on tier
    switch (user.subscriptionTier) {
      case 'Gold':
        return product.priceGold ? parseFloat(product.priceGold) : null;
      case 'Bronze':
        return product.priceBronze ? parseFloat(product.priceBronze) : null;
      default:
        return product.priceBronze ? parseFloat(product.priceBronze) : null;
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

    if (tier === 'Bronze' && goldPrice > 0) {
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
          {userTier} Price
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
  const getCartPrice = () => {
    switch (userTier) {
      case 'Platinum':
        return product.pricePlatinum ? parseFloat(product.pricePlatinum) : null;
      case 'Gold':
        return product.priceGold ? parseFloat(product.priceGold) : null;
      case 'Bronze':
      default:
        return product.priceBronze ? parseFloat(product.priceBronze) : null;
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