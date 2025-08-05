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
// Removed MembershipTierSelector import - tier selection now happens on membership page
import { DeliveryGroups } from "@/components/checkout/delivery-groups";
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
  // Removed requiresMembershipTier state - tier selection now handled on membership page
  const [isProcessing, setIsProcessing] = useState(false);

  // No redirect blocking - allow all users to proceed to checkout

  // Fetch fulfillment settings
  const { data: fulfillmentSettings } = useQuery({
    queryKey: ['/api/fulfillment/settings'],
    enabled: !!user,
  });

  // Note: Authentication is handled by SubscriptionEnforcement wrapper

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

  // This section has been removed - tier selection is now handled on the membership page

  const canProceed = !hasFirearms() || (hasFirearms() && !requiresFflSelection());

  return (
    <div className="min-h-screen bg-gray-50 pt-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Forms */}
          <div className="lg:col-span-2 space-y-6">
            
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

            {/* Delivery Groups */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DeliveryGroups 
                  items={items}
                  fulfillmentSettings={Array.isArray(fulfillmentSettings) ? fulfillmentSettings : []}
                  selectedFfl={selectedFfl}
                />
              </CardContent>
            </Card>

            {/* Payment Section */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentSection 
                  user={user!}
                  totalAmount={getTotalPrice()}
                  canProceed={canProceed}
                  isProcessing={isProcessing}
                  onProcessing={setIsProcessing}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Order Summary
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setLocation('/')}
                    className="text-amber-600 hover:text-amber-700"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Shopping
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Items List */}
                <div className="space-y-3">
                  {items.map((item) => (
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
                        {item.requiresFFL && (
                          <Badge variant="outline" className="text-xs mt-1">
                            FFL Required
                          </Badge>
                        )}
                        
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

                <Separator />

                {/* Pricing Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-green-600">Calculated at delivery</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-green-600">Calculated at delivery</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                </div>

                {/* Member Savings Display */}
                {user?.subscriptionTier === 'Bronze' || !user?.subscriptionTier ? (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Star className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-blue-800">
                            Save More with Membership
                          </span>
                          <br />
                          <span className="text-sm text-blue-600">
                            Gold members save up to 15%, Platinum saves up to 25%
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLocation('/membership?redirect=/checkout')}
                          className="ml-4"
                        >
                          Upgrade Now
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <span className="font-medium text-green-600">
                        {user.subscriptionTier} Member Savings Applied
                      </span>
                      <br />
                      <span className="text-sm text-gray-600">
                        You're already seeing your discounted prices!
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                {/* FFL Warning */}
                {hasFirearms() && requiresFflSelection() && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Please select an FFL dealer above to complete your order.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <SubscriptionEnforcement requiredForCheckout={true}>
      <CheckoutPageContent />
    </SubscriptionEnforcement>
  );
}