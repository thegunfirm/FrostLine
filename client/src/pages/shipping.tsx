import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Truck, Clock, Package, Star, Zap } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { SubscriptionEnforcement } from "@/components/auth/subscription-enforcement";
import { AddressAutocomplete } from "@/components/forms/AddressAutocomplete";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

const shippingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(5, "ZIP code must be at least 5 digits"),
  phone: z.string().min(10, "Phone number is required"),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

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
    sessionStorage.setItem('checkout_return_url', '/shipping');
    setLocation('/membership');
  };

  if (currentTier === 'platinum') {
    return (
      <Alert className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 mb-6">
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
    <Alert className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 mb-6">
      <Star className="w-4 h-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold text-red-700">Don't Miss Out on Savings!</span><br />
            Save an additional <span className="font-bold text-red-600">{formatPrice(additionalSavings)}</span> on this order. 
            {currentTier === 'bronze' && <span> Upgrade now for {formatPrice(potentialSavings)} total savings!</span>}
          </div>
          <Button 
            onClick={handleUpgrade}
            size="sm" 
            className="bg-red-600 hover:bg-red-700 text-white ml-4 whitespace-nowrap animate-pulse hover:animate-none"
          >
            <Star className="w-4 h-4 mr-1" />
            Save Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function ShippingPageContent() {
  const { items, getTotalPrice, hasFirearms } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const { isLoaded: googleMapsLoaded, error: googleMapsError } = useGoogleMaps();

  // Filter non-FFL items that need shipping
  const nonFflItems = items.filter(item => !item.requiresFFL);

  const form = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      address: (user?.shippingAddress as any)?.street || '',
      city: (user?.shippingAddress as any)?.city || '',
      state: (user?.shippingAddress as any)?.state || '',
      zip: (user?.shippingAddress as any)?.zip || '',
      phone: user?.phone || '',
    },
  });

  // Handle address selection from Google Places
  const handleAddressSelect = (components: any) => {
    if (components.streetNumber && components.route) {
      form.setValue('address', `${components.streetNumber} ${components.route}`);
    }
    if (components.locality) {
      form.setValue('city', components.locality);
    }
    if (components.administrativeAreaLevel1) {
      form.setValue('state', components.administrativeAreaLevel1);
    }
    if (components.postalCode) {
      form.setValue('zip', components.postalCode);
    }
  };

  const onSubmit = async (data: ShippingFormData) => {
    setIsProcessing(true);
    try {
      // Save shipping information
      console.log('Shipping data:', data);
      // Move to billing page
      setLocation('/billing');
    } catch (error) {
      console.error('Error saving shipping info:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (nonFflItems.length === 0 && hasFirearms()) {
    // If only FFL items, skip to billing
    setLocation('/billing');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Go back to FFL selection if we have firearms, otherwise to order summary
                  if (hasFirearms()) {
                    setLocation('/ffl-selection');
                  } else {
                    setLocation('/order-summary');
                  }
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {hasFirearms() ? 'Back to FFL Selection' : 'Back to Order Summary'}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Shipping Information</h1>
                <p className="text-sm text-gray-600">Where should we ship your non-firearm items?</p>
              </div>
            </div>
            
            {/* Upgrade Benefits */}
            <UpgradeBenefits user={user} />

            {/* Step Indicator */}
            <div className="flex items-center justify-center space-x-4 py-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="text-sm font-medium text-green-600">FFL Selection</span>
              </div>
              <div className="w-12 h-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm font-medium text-blue-600">Shipping</span>
              </div>
              <div className="w-12 h-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-sm text-gray-500">Billing</span>
              </div>
              <div className="w-12 h-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <span className="text-sm text-gray-500">Payment</span>
              </div>
            </div>

            {/* Shipping Form */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            {googleMapsLoaded ? (
                              <AddressAutocomplete
                                label="Street Address"
                                placeholder="Start typing your address..."
                                value={field.value}
                                onChange={field.onChange}
                                onAddressSelect={handleAddressSelect}
                                error={form.formState.errors.address?.message}
                                required
                              />
                            ) : googleMapsError ? (
                              <div>
                                <FormLabel>Street Address</FormLabel>
                                <Input {...field} placeholder="Street Address" />
                                <p className="text-sm text-amber-600 mt-1">
                                  Address suggestions unavailable, please enter manually
                                </p>
                              </div>
                            ) : (
                              <div>
                                <FormLabel>Street Address</FormLabel>
                                <Input {...field} placeholder="Loading address verification..." disabled />
                                <p className="text-sm text-gray-500 mt-1">
                                  Loading Google address verification...
                                </p>
                              </div>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {/* Add state options */}
                                <SelectItem value="AL">Alabama</SelectItem>
                                <SelectItem value="AK">Alaska</SelectItem>
                                <SelectItem value="AZ">Arizona</SelectItem>
                                <SelectItem value="AR">Arkansas</SelectItem>
                                <SelectItem value="CA">California</SelectItem>
                                <SelectItem value="CO">Colorado</SelectItem>
                                <SelectItem value="CT">Connecticut</SelectItem>
                                <SelectItem value="DE">Delaware</SelectItem>
                                <SelectItem value="FL">Florida</SelectItem>
                                <SelectItem value="GA">Georgia</SelectItem>
                                <SelectItem value="HI">Hawaii</SelectItem>
                                <SelectItem value="ID">Idaho</SelectItem>
                                <SelectItem value="IL">Illinois</SelectItem>
                                <SelectItem value="IN">Indiana</SelectItem>
                                <SelectItem value="IA">Iowa</SelectItem>
                                <SelectItem value="KS">Kansas</SelectItem>
                                <SelectItem value="KY">Kentucky</SelectItem>
                                <SelectItem value="LA">Louisiana</SelectItem>
                                <SelectItem value="ME">Maine</SelectItem>
                                <SelectItem value="MD">Maryland</SelectItem>
                                <SelectItem value="MA">Massachusetts</SelectItem>
                                <SelectItem value="MI">Michigan</SelectItem>
                                <SelectItem value="MN">Minnesota</SelectItem>
                                <SelectItem value="MS">Mississippi</SelectItem>
                                <SelectItem value="MO">Missouri</SelectItem>
                                <SelectItem value="MT">Montana</SelectItem>
                                <SelectItem value="NE">Nebraska</SelectItem>
                                <SelectItem value="NV">Nevada</SelectItem>
                                <SelectItem value="NH">New Hampshire</SelectItem>
                                <SelectItem value="NJ">New Jersey</SelectItem>
                                <SelectItem value="NM">New Mexico</SelectItem>
                                <SelectItem value="NY">New York</SelectItem>
                                <SelectItem value="NC">North Carolina</SelectItem>
                                <SelectItem value="ND">North Dakota</SelectItem>
                                <SelectItem value="OH">Ohio</SelectItem>
                                <SelectItem value="OK">Oklahoma</SelectItem>
                                <SelectItem value="OR">Oregon</SelectItem>
                                <SelectItem value="PA">Pennsylvania</SelectItem>
                                <SelectItem value="RI">Rhode Island</SelectItem>
                                <SelectItem value="SC">South Carolina</SelectItem>
                                <SelectItem value="SD">South Dakota</SelectItem>
                                <SelectItem value="TN">Tennessee</SelectItem>
                                <SelectItem value="TX">Texas</SelectItem>
                                <SelectItem value="UT">Utah</SelectItem>
                                <SelectItem value="VT">Vermont</SelectItem>
                                <SelectItem value="VA">Virginia</SelectItem>
                                <SelectItem value="WA">Washington</SelectItem>
                                <SelectItem value="WV">West Virginia</SelectItem>
                                <SelectItem value="WI">Wisconsin</SelectItem>
                                <SelectItem value="WY">Wyoming</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(555) 123-4567" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        size="lg" 
                        disabled={isProcessing}
                        className="min-w-[200px]"
                      >
                        {isProcessing ? 'Saving...' : 'Continue to Billing'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-sm sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Non-FFL Items */}
                {nonFflItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-blue-600" />
                      <h3 className="font-medium text-gray-900">Items shipping to you</h3>
                    </div>
                    <div className="space-y-2 pl-6">
                      {nonFflItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-start text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 truncate">{item.productName}</p>
                            <p className="text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <span className="text-gray-900 font-medium ml-2">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FFL Items Note */}
                {hasFirearms() && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      Firearms will be shipped directly to your selected FFL dealer.
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatPrice(getTotalPrice())}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">Calculated at next step</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
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