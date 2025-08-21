import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@shared/schema";
import { Link } from "wouter";
import { ImageIcon, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProductCardProps {
  product: Product | any; // Allow both database Product and Algolia search result types
  onAddToCart?: (product: Product | any) => void;
  onViewDetails?: (product: Product | any) => void;
}

export function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  // Fetch dynamic fallback image from CMS
  const { data: fallbackImageSetting } = useQuery({
    queryKey: ["/api/admin/fallback-image"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/fallback-image");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const fallbackImage = fallbackImageSetting?.value || "/fallback-logo.png";
  
  // Use RSR image service for product images - match product detail page logic
  const getImageUrl = () => {
    const imageKey = product?.rsrStockNumber || product?.sku;
    if (!imageKey) return fallbackImage;
    return `/api/rsr-image/${imageKey}`;
  };
  
  const imageUrl = getImageUrl();
  const altText = product.name || 'Product Image';

  // Only show pricing if any tier has a price > 0
  const hasPricing = parseFloat(product.priceBronze || "0") > 0 || 
                     parseFloat(product.priceGold || "0") > 0 || 
                     parseFloat(product.pricePlatinum || "0") > 0;

  return (
    <Link href={`/product/${product.sku || product.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        <CardContent className="p-3 sm:p-2">
          <div className="bg-gray-100 rounded-lg mb-2 sm:mb-1 overflow-hidden flex items-center justify-center min-h-[120px] sm:min-h-[100px]">
            <img
              src={imageUrl}
              alt={altText}
              className="w-full h-auto object-contain transition-opacity duration-300 max-w-full"
              onError={(e) => {
                // Debug logging for image load failures
                console.log('Image load error:', e.currentTarget.src, 'Status:', e.type);
                if (e.currentTarget.src !== fallbackImage) {
                  console.log('RSR image failed, using fallback:', fallbackImage);
                  e.currentTarget.src = fallbackImage;
                  e.currentTarget.onerror = null; // Prevent infinite loop
                }
              }}
              onLoad={(e) => {
                console.log('Image loaded successfully:', e.currentTarget.src);
              }}
            />
          </div>
          <div className="space-y-2 sm:space-y-1">
            <h3 className="font-medium text-sm sm:text-sm leading-tight line-clamp-2">{product.name}</h3>
            <div className="flex items-center justify-between text-sm sm:text-xs">
              <span className="text-gray-600 font-medium">{product.manufacturer}</span>
              <div className="flex items-center gap-1">
                {product.inStock ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
                <span className="text-gray-500 text-xs hidden sm:inline">
                  {product.inStock ? "In Stock" : "Out of Stock"}
                </span>
              </div>
            </div>
            {hasPricing && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 text-xs">
                <span className="text-black px-2 py-1 sm:px-1 sm:py-0.5 rounded text-xs font-medium" style={{background: 'linear-gradient(135deg, rgb(251 191 36) 0%, rgb(245 158 11) 50%, rgb(217 119 6) 100%)'}}>${(parseFloat(product.priceBronze || "0")).toFixed(2)}</span>
                <span className="text-black px-2 py-1 sm:px-1 sm:py-0.5 rounded text-xs font-medium" style={{background: 'linear-gradient(135deg, rgb(254 240 138) 0%, rgb(250 204 21) 50%, rgb(234 179 8) 100%)'}}>${(parseFloat(product.priceGold || "0")).toFixed(2)}</span>
                <span className="text-black px-2 py-1 sm:px-1 sm:py-0.5 rounded text-xs font-medium" style={{background: 'linear-gradient(135deg, rgb(209 213 219) 0%, rgb(156 163 175) 50%, rgb(107 114 128) 100%)'}}>${(parseFloat(product.pricePlatinum || "0")).toFixed(2).replace(/\d/g, '*')}</span>
              </div>
            )}
            {!hasPricing && (
              <div className="text-xs text-gray-500 italic">
                Contact for pricing
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
