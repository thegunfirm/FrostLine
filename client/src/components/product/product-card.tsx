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
          {/* Bronze Price - MSRP */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-amber-600">Bronze:</span>
            <span className="text-xs font-medium text-gun-black">
              ${parseFloat(product.priceBronze || "0").toFixed(2)}
            </span>
          </div>
          
          {/* Gold Price - MAP (if available and different from Bronze) */}
          {product.priceGold && parseFloat(product.priceGold) !== parseFloat(product.priceBronze || "0") && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-yellow-500">Gold:</span>
              <span className="text-xs font-medium text-gun-black">
                ${parseFloat(product.priceGold).toFixed(2)}
              </span>
            </div>
          )}
          
          {/* Your Price - Show user's tier pricing */}
          {user ? (
            <div className="flex justify-between items-center border-t border-gray-200 pt-1">
              <span className="text-xs text-gun-gray-light font-medium">Your Price:</span>
              <div className="text-sm font-bold text-gun-gold">
                {user.subscriptionTier === 'Gold' && product.priceGold ? 
                  `$${parseFloat(product.priceGold).toFixed(2)}` :
                  user.subscriptionTier === 'Platinum' ? 
                    'Login to cart' :
                    `$${parseFloat(product.priceBronze || "0").toFixed(2)}`
                }
                <span className="text-xs ml-1 text-gun-gray-light">({user.subscriptionTier})</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center border-t border-gray-200 pt-1">
              <span className="text-xs text-gun-gray-light font-medium">Platinum:</span>
              <span className="text-xs text-gun-gold font-medium">
                Login to view
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
