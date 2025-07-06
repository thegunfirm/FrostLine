import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Product } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useProgressiveImage } from "@/hooks/use-progressive-image";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const { user } = useAuth();
  const {
    imageUrl,
    altText,
    isLoading: imageLoading,
    hasError: imageError,
    onLoad,
    onError
  } = useProgressiveImage(product.id, 'card');

  const getTierPrice = (product: Product) => {
    if (!user) return null;
    
    switch (user.subscriptionTier) {
      case "Bronze":
        return product.priceBronze;
      case "Gold":
        return product.priceGold;
      case "Platinum":
        return product.pricePlatinum;
      default:
        return null;
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "Login Required";
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const getAvailabilityBadge = () => {
    if (!product.inStock) {
      return (
        <Badge variant="destructive">
          Out of Stock
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
        In Stock
      </Badge>
    );
  };

  const tierPrice = getTierPrice(product);
  const isPlatinumMember = user?.subscriptionTier === "Platinum";

  return (
    <Card className="group cursor-pointer hover:shadow-xl transition-shadow duration-300 h-fit">
      <div className="aspect-square relative overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl}
            alt={altText || product.name}
            className={cn(
              "w-full h-full object-contain group-hover:scale-105 transition-transform duration-300",
              imageLoading && "opacity-50"
            )}
            onLoad={onLoad}
            onError={onError}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            {imageLoading ? (
              <div className="w-8 h-8 border-4 border-gun-gold border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-gray-400">No Image</span>
            )}
          </div>
        )}
        
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Badge variant="destructive" className="text-lg">
              Out of Stock
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="mb-3">
          <h3 className="text-sm font-oswald font-semibold text-gun-black mb-1 group-hover:text-gun-gold transition-colors duration-200 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-gun-gray-light text-xs line-clamp-2">
            {product.description}
          </p>
        </div>
        
        <div className="mb-3 space-y-1">
          {/* MSRP - Show if available */}
          {product.priceMSRP && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gun-gray-light">MSRP:</span>
              <span className="text-xs text-gun-gray-light line-through">
                ${parseFloat(product.priceMSRP).toFixed(2)}
              </span>
            </div>
          )}
          
          {/* MAP - Show if available */}
          {product.priceMAP && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gun-gray-light">MAP:</span>
              <span className="text-xs text-gun-black font-medium">
                ${parseFloat(product.priceMAP).toFixed(2)}
              </span>
            </div>
          )}
          
          {/* Bronze Price - Always show as reference */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gun-gray-light">Bronze Price:</span>
            <span className="text-xs text-gun-black">
              ${parseFloat(product.priceBronze || "0").toFixed(2)}
            </span>
          </div>
          
          {/* Gold Price - Show if user is not Bronze */}
          {user && user.subscriptionTier !== "Bronze" && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gun-gray-light">Gold Price:</span>
              <span className="text-xs text-gun-black">
                ${parseFloat(product.priceGold || "0").toFixed(2)}
              </span>
            </div>
          )}
          
          {/* Your Price - Show tier-specific pricing, never wholesale/dealer price */}
          {user ? (
            <div className="flex justify-between items-center border-t border-gray-200 pt-1">
              <span className="text-xs text-gun-gray-light font-medium">Your Price:</span>
              <div className={cn(
                "text-sm font-bold text-gun-gold",
                isPlatinumMember && tierPrice && "platinum-glint"
              )}>
                {formatPrice(tierPrice)}
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center border-t border-gray-200 pt-1">
              <span className="text-xs text-gun-gray-light font-medium">Member Price:</span>
              <span className="text-xs text-gun-gold font-medium">
                Login to View
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-3">
          {getAvailabilityBadge()}
        </div>
        
        <div className="flex gap-2">
          <Link href={`/product/${product.id}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              View Details
            </Button>
          </Link>
          
          {user && product.inStock && (
            <Button
              onClick={() => onAddToCart?.(product)}
              size="sm"
              className="flex-1 bg-gun-gold hover:bg-gun-gold-bright text-gun-black text-xs"
            >
              Add to Cart
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
