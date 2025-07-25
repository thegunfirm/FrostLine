import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { ShoppingCart, Minus, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

export function CartSheet() {
  const { user } = useAuth();
  const { 
    items, 
    isCartOpen, 
    setCartOpen, 
    updateQuantity, 
    removeItem, 
    getTotalPrice, 
    getItemCount,
    hasFirearms 
  } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const total = getTotalPrice();
  const itemCount = getItemCount();

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
            {itemCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-4">
                Browse our products and add items to your cart
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`${item.productSku}-${item.productId}`} className="flex gap-3 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex-shrink-0">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-12 h-12 object-contain rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/api/admin/fallback-image';
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate leading-tight">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.manufacturer}
                    </p>
                    
                    {/* Show only the best price (Platinum) */}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold text-green-600">
                        {formatPrice(item.price)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.productSku, Math.max(1, item.quantity - 1))}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="text-xs font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.productSku, Math.min(10, item.quantity + 1))}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.productSku)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 ml-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Compact tier pricing info for non-authenticated users */}
                    {!user && (
                      <div className="text-xs text-blue-600 mt-1">
                        Save more with membership • <span className="underline cursor-pointer">Join now</span>
                      </div>
                    )}

                    {item.requiresFFL && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-xs text-amber-600">FFL Required</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            {hasFirearms() && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
                <span className="text-amber-700">FFL transfer required for firearms</span>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''}):</span>
                <span className="text-lg font-bold">{formatPrice(total)}</span>
              </div>
              
              <Link href="/cart">
                <Button 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white" 
                  onClick={() => setCartOpen(false)}
                >
                  Go to Cart
                </Button>
              </Link>

              {!user && (
                <div className="text-center text-xs text-blue-600">
                  <span className="underline cursor-pointer">Sign in</span> for member pricing
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}