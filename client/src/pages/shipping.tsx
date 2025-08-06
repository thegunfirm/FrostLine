import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { SubscriptionEnforcement } from "@/components/auth/subscription-enforcement";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, MapPin, CreditCard, ArrowLeft, AlertTriangle, User } from "lucide-react";
import { PaymentSection } from "@/components/checkout/payment-section";

const formatPrice = (price: number | string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numPrice.toFixed(2)}`;
};

function ShippingPageContent() {
  const { items, getTotalPrice } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Shipping form state
  const [shippingData, setShippingData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    driverLicenseNumber: '',
    driverLicenseState: '',
  });
  
  // Billing same as shipping
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingData, setBillingData] = useState({
    firstName: '',
    lastName: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
  });

  if (items.length === 0) {
    setLocation('/');
    return null;
  }

  const hasFirearms = items.some(item => item.requiresFFL);

  return (
    <div className="min-h-screen bg-gray-50 pt-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Shipping & Payment</h1>
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/checkout')}
              className="text-amber-600 hover:text-amber-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Order Summary
            </Button>
          </div>

          {/* Driver's License Requirement for Firearms */}
          {hasFirearms && (
            <Alert className="border-amber-200 bg-amber-50">
              <User className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Driver's License Required:</strong> Federal law requires that your shipping information matches your government-issued ID for firearm purchases. 
                Please ensure your name and address exactly match your driver's license.
              </AlertDescription>
            </Alert>
          )}

          {/* Return Shipping Warning */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Important Billing Notice:</strong> If your billing address differs from your shipping address, you are responsible for return shipping costs on any returned items. 
              We recommend using the same address for both shipping and billing to avoid additional charges.
            </AlertDescription>
          </Alert>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Shipping Information */}
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={shippingData.firstName}
                        onChange={(e) => setShippingData(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={shippingData.lastName}
                        onChange={(e) => setShippingData(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={shippingData.email}
                        onChange={(e) => setShippingData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={shippingData.phone}
                        onChange={(e) => setShippingData(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      value={shippingData.address}
                      onChange={(e) => setShippingData(prev => ({ ...prev, address: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address2">Apartment, Suite, etc.</Label>
                    <Input
                      id="address2"
                      value={shippingData.address2}
                      onChange={(e) => setShippingData(prev => ({ ...prev, address2: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={shippingData.city}
                        onChange={(e) => setShippingData(prev => ({ ...prev, city: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={shippingData.state}
                        onChange={(e) => setShippingData(prev => ({ ...prev, state: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code *</Label>
                      <Input
                        id="zip"
                        value={shippingData.zip}
                        onChange={(e) => setShippingData(prev => ({ ...prev, zip: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Driver's License Information (required for firearms) */}
                  {hasFirearms && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Driver's License Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="driverLicenseNumber">Driver's License Number *</Label>
                            <Input
                              id="driverLicenseNumber"
                              value={shippingData.driverLicenseNumber}
                              onChange={(e) => setShippingData(prev => ({ ...prev, driverLicenseNumber: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="driverLicenseState">Driver's License State *</Label>
                            <Input
                              id="driverLicenseState"
                              value={shippingData.driverLicenseState}
                              onChange={(e) => setShippingData(prev => ({ ...prev, driverLicenseState: e.target.value }))}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
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
                    canProceed={true}
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
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Items Count and Total */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                      <span>Subtotal: {formatPrice(getTotalPrice())}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {hasFirearms && "Firearms shipping to FFL dealer"}
                      {hasFirearms && items.some(item => !item.requiresFFL) && " • "}
                      {items.some(item => !item.requiresFFL) && "Other items ship direct"}
                    </div>
                  </div>

                  {/* Quick Items List */}
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-2 text-sm">
                        <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
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
                          <p className="text-gray-900 truncate">{item.productName}</p>
                          <p className="text-gray-600">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Total */}
                  <div className="flex justify-between items-center text-lg font-medium">
                    <span>Total</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShippingPage() {
  return (
    <SubscriptionEnforcement>
      <ShippingPageContent />
    </SubscriptionEnforcement>
  );
}