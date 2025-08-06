import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { SubscriptionEnforcement } from "@/components/auth/subscription-enforcement";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, Clock, CreditCard, Shield, AlertTriangle, Star, ArrowRight, Minus, Plus, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const formatPrice = (price: number | string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numPrice.toFixed(2)}`;
};

// Upgrade Benefits Component
function UpgradeBenefits({ user }: { user: any }) {
  const { getTotalPrice } = useCart();
  const [, setLocation] = useLocation();
  
  if (!user) return null;

  const currentTier = user.membershipTier || 'bronze';
  const totalPrice = getTotalPrice();
  
  // Calculate savings based on tier
  const bronzeDiscount = 0;
  const goldDiscount = 0.05; // 5%
  const platinumDiscount = 0.15; // 15%
  
  const currentSavings = currentTier === 'platinum' ? totalPrice * platinumDiscount :
                        currentTier === 'gold' ? totalPrice * goldDiscount : 0;
  
  const potentialSavings = totalPrice * platinumDiscount;
  const additionalSavings = potentialSavings - currentSavings;

  // Safety check for NaN values
  if (isNaN(totalPrice) || isNaN(currentSavings) || isNaN(potentialSavings) || isNaN(additionalSavings)) {
    return null;
  }

  const handleUpgrade = () => {
    // Store current location to return after upgrade
    sessionStorage.setItem('checkout_return_url', '/order-summary');
    setLocation('/membership');
  };

  if (currentTier === 'platinum') {
    return (
      <Alert className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
        <Star className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="flex items-center justify-between">
            <span>
              <strong>Platinum Member Benefits:</strong> You're saving <span className="font-bold text-red-600">{formatPrice(currentSavings)}</span> on this order with your 15% discount!
            </span>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
              Premium Member
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <Star className="w-4 h-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="flex items-center justify-between">
          <div>
            {currentTier === 'gold' ? (
              <>
                <strong>Gold Member:</strong> You're saving <span className="font-bold text-red-600">{formatPrice(currentSavings)}</span> on this order. 
                Upgrade to Platinum and save an additional <span className="font-bold text-red-600">{formatPrice(additionalSavings)}</span>!
              </>
            ) : (
              <>
                <strong>Upgrade to Platinum:</strong> Save <span className="font-bold text-red-600">{formatPrice(potentialSavings)}</span> on this order with 15% off everything!
              </>
            )}
          </div>
          <Button 
            onClick={handleUpgrade}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white animate-pulse hover:animate-none"
          >
            Upgrade Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function OrderSummaryPageContent() {
  const { items, getTotalPrice, hasFirearms, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch delivery time settings
  const { data: deliveryTimeSettings } = useQuery({
    queryKey: ['/api/delivery-time-settings'],
  });

  // Helper function to determine fulfillment type for a product
  const getFulfillmentType = (item: any) => {
    if (!item.requiresFFL) {
      return 'drop_to_consumer';
    }
    
    const dropToFflBrands = ['GLOCK', 'SMITH & WESSON', 'SIG SAUER', 'S&W', 'SIG'];
    const manufacturer = (item.manufacturer || '').toUpperCase();
    
    if (dropToFflBrands.some(brand => manufacturer.includes(brand))) {
      return 'drop_to_ffl';
    }
    
    return 'no_drop_to_ffl';
  };

  // Helper function to get delivery time for a fulfillment type
  const getDeliveryTime = (fulfillmentType: string) => {
    if (!deliveryTimeSettings || !Array.isArray(deliveryTimeSettings)) return '3-5 business days';
    
    const setting = deliveryTimeSettings.find((s: any) => s.fulfillmentType === fulfillmentType);
    return setting?.estimatedDays || '3-5 business days';
  };

  const handleProceedToCheckout = async () => {
    setIsProcessing(true);
    
    try {
      // Always go to shipping first - FFL selection will be handled within the checkout flow
      setLocation('/shipping');
    } catch (error) {
      console.error('Error proceeding to checkout:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some items to your cart to proceed with checkout.</p>
          <Button onClick={() => setLocation('/products')}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/cart')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Order Summary</h1>
        <p className="text-gray-600 mt-2">Review your items before proceeding to checkout</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Items in Your Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => {
                const fulfillmentType = getFulfillmentType(item);
                const deliveryTime = getDeliveryTime(fulfillmentType);
                
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <img
                      src={`/api/rsr-image/${item.productSku || item.sku}`}
                      alt={item.productName}
                      className="w-32 h-auto object-contain rounded-lg flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = "/fallback-logo.png";
                        e.currentTarget.onerror = null;
                      }}
                    />
                    
                    <div className="flex-1 min-w-0 ml-2">
                      <h3 className="font-semibold text-gray-900 mb-1">{item.productName}</h3>
                      
                      <div className="flex items-center gap-2 mb-2">
                        {item.manufacturer && (
                          <Badge variant="outline" className="text-xs">
                            {item.manufacturer}
                          </Badge>
                        )}
                        {item.requiresFFL && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            FFL Required
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>Estimated delivery: {deliveryTime}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Qty:</span>
                        <div className="flex items-center border rounded">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const newQty = Math.max(0, item.quantity - 1);
                              updateQuantity(item.id, newQty);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              if (value >= 0) {
                                updateQuantity(item.id, value);
                              }
                            }}
                            className="w-12 text-center text-sm border-0 bg-transparent focus:outline-none focus:ring-0"
                            min="0"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateQuantity(item.id, item.quantity + 1);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeItem(item.id);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                      {(item as any).priceBronze && (item as any).priceBronze > item.price && (
                        <div className="text-sm text-gray-500 line-through">
                          {formatPrice((item as any).priceBronze * item.quantity)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Order Totals & Upgrade Section */}
        <div className="space-y-4">
          {/* Upgrade Benefits */}
          <UpgradeBenefits user={user} />
          
          {/* Order Total */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Order Total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(getTotalPrice())}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Taxes</span>
                <span>Calculated at checkout</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatPrice(getTotalPrice())}</span>
              </div>
              
              {hasFirearms() && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    This order contains firearms and requires FFL dealer selection.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={handleProceedToCheckout}
                disabled={isProcessing}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                size="lg"
              >
                {isProcessing ? (
                  'Processing...'
                ) : hasFirearms() ? (
                  <>
                    Select FFL Dealer <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Proceed to Shipping <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Secure checkout powered by SSL encryption</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Security Features */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  <span>Multiple payment options accepted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-green-600" />
                  <span>Fast & secure shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>FFL compliance guaranteed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function OrderSummary() {
  return (
    <SubscriptionEnforcement>
      <OrderSummaryPageContent />
    </SubscriptionEnforcement>
  );
}