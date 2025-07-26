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
    clearCart,
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

  // Calculate potential savings for membership upsell
  const calculateSavings = () => {
    if (!user) {
      // For non-logged users: compare Bronze vs Platinum pricing
      const bronzeCost = items.reduce((sum, item) => {
        const bronzePrice = item.priceBronze || item.price;
        return sum + bronzePrice * item.quantity;
      }, 0);
      
      const platinumCost = items.reduce((sum, item) => {
        const platinumPrice = item.pricePlatinum || item.price;
        return sum + platinumPrice * item.quantity;
      }, 0);
      
      const savings = bronzeCost - platinumCost;
      return { savings: Math.max(0, savings) };
    } else {
      // For logged users: compare their current price vs Platinum pricing
      const currentCost = items.reduce((sum, item) => {
        return sum + item.price * item.quantity;
      }, 0);
      
      const platinumCost = items.reduce((sum, item) => {
        const platinumPrice = item.pricePlatinum || item.price;
        return sum + platinumPrice * item.quantity;
      }, 0);
      
      const savings = currentCost - platinumCost;
      return { savings: Math.max(0, savings) };
    }
  };

  const { savings } = calculateSavings();

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-xs p-0 bg-white border-l shadow-xl fixed right-0 top-0 h-full z-50">
        <SheetHeader className="px-4 py-3 border-b bg-gray-50">
          <SheetTitle className="flex items-center justify-between text-sm font-semibold">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart ({itemCount})
            </div>
            <Link href="/cart">
              <Button 
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                onClick={() => setCartOpen(false)}
              >
                Go to Cart
              </Button>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <ShoppingCart className="h-8 w-8 text-gray-400 mb-3" />
              <h3 className="text-sm font-medium mb-1">Your cart is empty</h3>
              <p className="text-xs text-gray-500">
                Add items to get started
              </p>
            </div>
          ) : (
            <div className="py-2">
              {items.map((item, index) => (
                <div key={`${item.productSku}-${item.productId}`} className="flex gap-2 py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-shrink-0">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-10 h-10 object-contain rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/api/admin/fallback-image';
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs truncate leading-tight">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {item.manufacturer}
                    </p>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold">
                        {formatPrice(item.price)}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (item.quantity <= 1) {
                              removeItem(item.id);
                            } else {
                              updateQuantity(item.id, item.quantity - 1);
                            }
                          }}
                          className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        
                        <span className="text-xs font-medium w-6 text-center">
                          {item.quantity}
                        </span>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.id, Math.min(10, item.quantity + 1))}
                          className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-5 w-5 p-0 text-gray-400 hover:text-red-500 ml-0.5"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>

                    {item.requiresFFL && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
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
          <div className="border-t bg-gray-50 p-4 space-y-3">
            {hasFirearms() && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
                <span className="text-amber-700">FFL transfer required</span>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''}):</span>
                <span className="text-sm font-bold">{formatPrice(total)}</span>
              </div>
              
              <div className="space-y-2">
                {!user && savings > 0 && (
                  <div className="relative">
                    <Button 
                      className="w-full bg-gradient-to-br from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2 relative overflow-hidden"
                      onClick={() => {/* Navigate to signup */}}
                    >
                      <span className="relative z-10">Join Now & Save {formatPrice(savings)}</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-gray-300/20 animate-pulse"></div>
                    </Button>
                  </div>
                )}
                  
                {!user && (
                  <div className="text-center">
                    <button className="text-xs text-blue-600 underline">
                      Sign in
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}