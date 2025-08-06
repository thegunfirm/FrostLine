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
import { Input } from "@/components/ui/input";
import { Truck, MapPin, Clock, CreditCard, Shield, AlertTriangle, Star, Minus, Plus, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FflSelector } from "@/components/checkout/ffl-selector";
import { PaymentSection } from "@/components/checkout/payment-section";

const formatPrice = (price: number | string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numPrice.toFixed(2)}`;
};

function CheckoutPageContent() {
  const { items, getTotalPrice, hasFirearms, requiresFflSelection, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedFfl, setSelectedFfl] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch fulfillment settings
  const { data: fulfillmentSettings } = useQuery({
    queryKey: ['/api/fulfillment/settings'],
    enabled: !!user,
  });

  // Fetch delivery time settings
  const { data: deliveryTimeSettings } = useQuery({
    queryKey: ['/api/delivery-time-settings'],
  });

  // Helper function to determine fulfillment type for a product
  const getFulfillmentType = (item: any) => {
    if (!item.requiresFFL) {
      return 'drop_to_consumer';
    }
    
    // For firearms, check if it's a "drop to FFL" item (like Glock)
    // Items that need to come to us first before going to FFL
    const dropToFflBrands = ['GLOCK', 'SMITH & WESSON', 'SIG SAUER', 'S&W', 'SIG']; // Configurable list
    const manufacturer = (item.manufacturer || '').toUpperCase();
    
    console.log('Checking fulfillment type for:', item.productName, 'Manufacturer:', manufacturer);
    
    if (dropToFflBrands.some(brand => manufacturer.includes(brand))) {
      console.log('Matched drop_to_ffl for:', manufacturer);
      return 'drop_to_ffl';
    }
    
    console.log('Using no_drop_to_ffl for:', manufacturer);
    return 'no_drop_to_ffl';
  };

  // Helper function to get delivery time for a fulfillment type
  const getDeliveryTime = (fulfillmentType: string) => {
    if (!deliveryTimeSettings) return '3-5 business days';
    
    const setting = deliveryTimeSettings.find((s: any) => s.fulfillmentType === fulfillmentType);

    return setting?.estimatedDays || '3-5 business days';
  };

  // Helper function to get delivery description
  const getDeliveryDescription = (fulfillmentType: string) => {
    if (!deliveryTimeSettings) return '';
    
    const setting = deliveryTimeSettings.find((s: any) => s.fulfillmentType === fulfillmentType);
    return setting?.description || '';
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">Add items to your cart before proceeding to checkout.</p>
          <Button onClick={() => setLocation("/")} size="lg">
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  const canProceed = !hasFirearms() || (hasFirearms() && !requiresFflSelection());
  const fflItems = items.filter(item => item.requiresFFL);
  const directShipItems = items.filter(item => !item.requiresFFL);

  return (
    <div className="min-h-screen bg-gray-50 pt-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="space-y-6">
          
          {/* Order Summary Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Order Summary</h1>
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/')}
              className="text-amber-600 hover:text-amber-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Shopping
            </Button>
          </div>

          {/* FFL Selection */}
          {hasFirearms() && (
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Federal Firearms License (FFL) Selection
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Your order contains firearms that must be shipped to a licensed FFL dealer.
                </p>
              </CardHeader>
              <CardContent>
                <FflSelector 
                  selectedFflId={selectedFfl}
                  onFflSelected={setSelectedFfl}
                  userZip={(user?.shippingAddress as any)?.zip || ''}
                />
              </CardContent>
            </Card>
          )}

          {/* Combined Order Summary */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Your Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* FFL Items Section */}
              {fflItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">Items shipping to your FFL dealer</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          Estimated delivery varies by manufacturer
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pl-7">
                    {fflItems.map((item) => {
                      const fulfillmentType = getFulfillmentType(item);
                      const deliveryTime = getDeliveryTime(fulfillmentType);
                      const description = getDeliveryDescription(fulfillmentType);
                      
                      return (
                        <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "/api/admin/fallback-image";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {item.productName}
                          </h4>
                          <p className="text-xs text-gray-600">{item.manufacturer}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              FFL Required
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Clock className="w-3 h-3" />
                              <span>{deliveryTime}</span>
                            </div>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 1;
                                  if (newQty !== item.quantity) {
                                    updateQuantity(item.id, newQty);
                                  }
                                }}
                                className="h-8 w-16 text-center"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {formatPrice(item.price * item.quantity)}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="text-xs text-red-600 hover:text-red-700 h-auto p-0"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Direct Ship Items Section */}
              {directShipItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">These items ship directly to you</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          Estimated delivery: {getDeliveryTime('drop_to_consumer')}
                          <span className="text-gray-500"> • {getDeliveryDescription('drop_to_consumer')}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pl-7">
                    {directShipItems.map((item) => (
                      <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "/api/admin/fallback-image";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {item.productName}
                          </h4>
                          <p className="text-xs text-gray-600">{item.manufacturer}</p>
                          <p className="text-xs text-green-600 mt-1">Ships directly to your address</p>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 1;
                                  if (newQty !== item.quantity) {
                                    updateQuantity(item.id, newQty);
                                  }
                                }}
                                className="h-8 w-16 text-center"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {formatPrice(item.price * item.quantity)}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="text-xs text-red-600 hover:text-red-700 h-auto p-0"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Order Total */}
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Total</span>
                <span>{formatPrice(getTotalPrice())}</span>
              </div>

              {/* Continue to Payment Button */}
              <div className="pt-4">
                <Button 
                  onClick={() => setLocation('/shipping')} 
                  size="lg" 
                  className="w-full"
                  disabled={hasFirearms() && !selectedFfl}
                >
                  Continue to Shipping & Payment
                </Button>
                {hasFirearms() && !selectedFfl && (
                  <p className="text-sm text-red-600 mt-2 text-center">
                    Please select an FFL dealer to continue
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <SubscriptionEnforcement>
      <CheckoutPageContent />
    </SubscriptionEnforcement>
  );
}