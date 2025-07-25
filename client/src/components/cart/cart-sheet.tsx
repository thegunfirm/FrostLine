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
              <Button onClick={() => setCartOpen(false)}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-16 h-16 object-contain rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/fallback-logo.png';
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.productSku}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.manufacturer}
                    </p>
                    
                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-black px-1.5 py-0.5 rounded" style={{background: 'linear-gradient(135deg, rgb(251 191 36) 0%, rgb(245 158 11) 50%, rgb(217 119 6) 100%)'}}>
                          Bronze: {formatPrice(item.priceBronze || item.price)}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-black px-1.5 py-0.5 rounded" style={{background: 'linear-gradient(135deg, rgb(254 240 138) 0%, rgb(250 204 21) 50%, rgb(234 179 8) 100%)'}}>
                            Gold: {formatPrice(item.priceGold || item.price)}
                          </span>
                          {!user && (
                            <Button 
                              size="sm" 
                              className="text-xs h-5 px-2 bg-amber-500 hover:bg-amber-600 text-white"
                              onClick={() => {/* Navigate to membership signup */}}
                            >
                              Join Now to get this price
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-black px-1.5 py-0.5 rounded text-sm font-semibold" style={{background: 'linear-gradient(135deg, rgb(209 213 219) 0%, rgb(156 163 175) 50%, rgb(107 114 128) 100%)'}}>
                          Platinum: {formatPrice(item.price)}
                        </span>
                        {!user && (
                          <Button 
                            size="sm" 
                            className="text-xs h-5 px-2 bg-gray-600 hover:bg-gray-700 text-white"
                            onClick={() => {/* Navigate to membership signup */}}
                          >
                            Join Now to get this price
                          </Button>
                        )}
                      </div>
                    </div>

                    {item.requiresFFL && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-xs text-amber-600">FFL Required</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-8 w-8 p-0"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="w-8 text-center text-sm">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            {hasFirearms() && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">FFL Transfer Required</p>
                  <p className="text-amber-700">
                    Your cart contains firearms that require FFL transfer. 
                    You'll need to select an FFL dealer during checkout.
                  </p>
                </div>
              </div>
            )}

            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatPrice(total)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setCartOpen(false)}>
                  Continue Shopping
                </Button>
                
                <Link href="/checkout">
                  <Button className="w-full" onClick={() => setCartOpen(false)}>
                    Checkout
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}