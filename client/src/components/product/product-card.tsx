import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Product } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useProgressiveImage } from "@/hooks/use-progressive-image";
import { SecurePricing } from "@/components/product/secure-pricing";

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
        
        <div className="mb-3">
          <SecurePricing 
            product={{
              priceBronze: product.priceBronze,
              priceGold: product.priceGold,
              pricePlatinum: product.pricePlatinum,
              priceMSRP: product.priceMSRP
            }}
            showUpgradePrompt={false}
            className="text-sm"
          />
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
