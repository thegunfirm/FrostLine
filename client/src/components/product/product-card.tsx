import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@shared/schema";
import { Link } from "wouter";
import { ImageIcon, CheckCircle, XCircle } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  // Use RSR image service for product images
  const imageUrl = product.sku ? `/api/rsr-image/${product.sku}` : '/api/placeholder-image.jpg';
  const altText = product.name || 'Product Image';







  return (
    <Link href={`/product/${product.sku || product.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        <CardContent className="p-2">
          <div className="bg-gray-100 rounded-lg mb-1 overflow-hidden flex items-center justify-center min-h-[120px]">
            <img
              src={imageUrl}
              alt={altText}
              className="w-full h-auto object-contain transition-opacity duration-300"
              onError={(e) => {
                // Show professional placeholder for missing RSR images
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="w-full h-full hidden items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded">
              <div className="text-center text-gray-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-xs font-medium">Product image not available</p>
                <p className="text-xs text-gray-400 mt-1">RSR image pending</p>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-sm leading-tight">{product.name}</h3>
            <div className="text-xs text-gray-600">{product.manufacturer}</div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-black px-1 py-0.5 rounded text-xs" style={{background: 'linear-gradient(135deg, rgb(251 191 36) 0%, rgb(245 158 11) 50%, rgb(217 119 6) 100%)'}}>${(parseFloat(product.priceBronze || product.price_bronze || "0")).toFixed(2)}</span>
                <span className="text-black px-1 py-0.5 rounded text-xs" style={{background: 'linear-gradient(135deg, rgb(254 240 138) 0%, rgb(250 204 21) 50%, rgb(234 179 8) 100%)'}}>${(parseFloat(product.priceGold || product.price_gold || "0")).toFixed(2)}</span>
                <span className="text-black px-1 py-0.5 rounded text-xs" style={{background: 'linear-gradient(135deg, rgb(209 213 219) 0%, rgb(156 163 175) 50%, rgb(107 114 128) 100%)'}}>${(parseFloat(product.pricePlatinum || product.price_platinum || "0")).toFixed(2).replace(/\d/g, '*')}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {product.inStock ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
                <span className="text-xs text-gray-500">
                  {product.inStock ? "In Stock" : "Out of Stock"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
