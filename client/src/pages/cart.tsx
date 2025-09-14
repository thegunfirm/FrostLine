import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, X, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";

const formatPrice = (price: number | string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numPrice.toFixed(2)}`;
};

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, getItemCount } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
            <p className="text-gray-600 mb-6">
              Browse our selection and add items to your cart to get started.
            </p>
            <Link href="/">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white">
                Start Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>
                
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={`${item.productMPN}-${item.productId}`} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "/api/admin/fallback-image";
                            }}
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {item.productName}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{item.manufacturer}</p>
                          
                          {item.requiresFFL && (
                            <p className="text-xs text-orange-600 mb-2">FFL Required</p>
                          )}

                          {/* Pricing Tiers for Non-Authenticated Users */}
                          {!user && (
                            <div className="space-y-2 mb-4">
                              <Button 
                                size="sm" 
                                className="text-xs h-7 px-3 text-black font-medium hover:opacity-90 w-full justify-start"
                                style={{background: 'linear-gradient(135deg, rgb(251 191 36) 0%, rgb(245 158 11) 50%, rgb(217 119 6) 100%)'}}
                                onClick={() => {/* Navigate to account creation */}}
                              >
                                Bronze: {formatPrice(item.priceBronze || item.price)} - Create an Account for Free
                              </Button>
                              
                              <Button 
                                size="sm" 
                                className="text-xs h-7 px-3 text-black font-medium hover:opacity-90 w-full justify-start"
                                style={{background: 'linear-gradient(135deg, rgb(254 240 138) 0%, rgb(250 204 21) 50%, rgb(234 179 8) 100%)'}}
                                onClick={() => {/* Navigate to Gold membership signup */}}
                              >
                                Gold: {formatPrice(item.priceGold || item.price)} - Join Now to get this price
                              </Button>
                              
                              <Button 
                                size="sm" 
                                className="text-xs h-7 px-3 text-black font-medium hover:opacity-90 w-full justify-start"
                                style={{background: 'linear-gradient(135deg, rgb(209 213 219) 0%, rgb(156 163 175) 50%, rgb(107 114 128) 100%)'}}
                                onClick={() => {/* Navigate to Platinum membership signup */}}
                              >
                                Platinum: {formatPrice(item.pricePlatinum || item.price)} - Join Now to get this price
                              </Button>
                            </div>
                          )}

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center border border-gray-300 rounded">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => updateQuantity(item.productSku, Math.max(1, item.quantity - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="px-3 py-1 text-sm font-medium min-w-[40px] text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => updateQuantity(item.productSku, Math.min(10, item.quantity + 1))}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeItem(item.productSku)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatPrice(item.price)} each
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-sm sticky top-8">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Items ({getItemCount()})</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span className="text-green-600">FREE</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                </div>

                <Button 
                  className="w-full mt-6 bg-amber-500 hover:bg-amber-600 text-white text-lg py-3"
                  size="lg"
                  onClick={() => {
                    if (user) {
                      // User is authenticated, proceed to checkout
                      setLocation('/order-summary');
                    } else {
                      // User not authenticated, redirect to login with return URL
                      setLocation('/login?redirect=' + encodeURIComponent('/order-summary'));
                    }
                  }}
                  data-testid="button-proceed-checkout"
                >
                  Proceed to Checkout
                </Button>

                <div className="mt-4 text-center">
                  <Link href="/">
                    <Button variant="ghost" className="text-blue-600 hover:text-blue-700">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>

                {!user && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Save with membership!</strong>
                    </p>
                    <p className="text-xs text-blue-600">
                      Create a free account or upgrade to Gold/Platinum for exclusive pricing on all items.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}