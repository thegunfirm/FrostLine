import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Product } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const { user } = useAuth();

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
    <Card className="group cursor-pointer hover:shadow-xl transition-shadow duration-300">
      <div className="aspect-square relative overflow-hidden">
        {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
          <img 
            src={product.images[0] as string}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No Image</span>
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
      
      <CardContent className="p-6">
        <div className="mb-2">
          <h3 className="text-lg font-oswald font-semibold text-gun-black mb-1 group-hover:text-gun-gold transition-colors duration-200">
            {product.name}
          </h3>
          <p className="text-gun-gray-light text-sm line-clamp-2">
            {product.description}
          </p>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-gun-black">
            <span className="text-sm text-gun-gray-light">Member Price:</span>
            <div className={cn(
              "text-xl font-bold",
              isPlatinumMember && tierPrice && "platinum-glint"
            )}>
              {formatPrice(tierPrice)}
            </div>
          </div>
          {getAvailabilityBadge()}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(product)}
            className="flex-1"
          >
            View Details
          </Button>
          
          {user && product.inStock && (
            <Button
              onClick={() => onAddToCart?.(product)}
              size="sm"
              className="flex-1 bg-gun-gold hover:bg-gun-gold-bright text-gun-black"
            >
              Add to Cart
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
