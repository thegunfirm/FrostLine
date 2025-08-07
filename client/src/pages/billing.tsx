import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, AlertTriangle, Shield, Package, Crown, Zap, Star } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { SubscriptionEnforcement } from "@/components/auth/subscription-enforcement";

const billingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(5, "ZIP code must be at least 5 digits"),
  sameAsShipping: z.boolean().default(false),
  legalNameConfirmation: z.boolean().refine(val => val === true, {
    message: "You must confirm that the billing name matches your legal name"
  }),
});

type BillingFormData = z.infer<typeof billingSchema>;

const formatPrice = (price: number | string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numPrice.toFixed(2)}`;
};

function BillingPageContent() {
  const { items, getTotalPrice, hasFirearms } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradeOffer, setShowUpgradeOffer] = useState(false);

  const form = useForm<BillingFormData>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      address: '',
      city: '',
      state: '',
      zip: '',
      sameAsShipping: false,
      legalNameConfirmation: false,
    },
  });

  const sameAsShipping = form.watch('sameAsShipping');

  const onSubmit = async (data: BillingFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Form errors:', form.formState.errors);
    
    setIsProcessing(true);
    try {
      // Save billing information
      console.log('Billing data:', data);
      // Move to payment page
      console.log('Navigating to payment page...');
      setLocation('/payment');
    } catch (error) {
      console.error('Error saving billing info:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Upgrade Benefits Component for Billing
  const UpgradeBenefits = ({ user }: { user: any }) => {
    const { getTotalPrice } = useCart();
    const [, setLocation] = useLocation();
    
    if (!user) return null;

    const currentTier = user.membershipTier || 'bronze';
    const totalPrice = getTotalPrice();
    
    const bronzeDiscount = 0;
    const goldDiscount = 0.05;
    const platinumDiscount = 0.15;
    
    const currentSavings = currentTier === 'platinum' ? totalPrice * platinumDiscount :
                          currentTier === 'gold' ? totalPrice * goldDiscount : 0;
    
    const potentialSavings = totalPrice * platinumDiscount;
    const additionalSavings = potentialSavings - currentSavings;

    if (isNaN(totalPrice) || isNaN(currentSavings) || isNaN(potentialSavings) || isNaN(additionalSavings)) {
      return null;
    }

    const handleUpgrade = () => {
      sessionStorage.setItem('checkout_return_url', '/billing');
      setLocation('/membership');
    };

    if (currentTier === 'platinum') {
      return (
        <Alert className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 mb-6">
          <Star className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="flex items-center justify-between">
              <span>
                <strong>Platinum Member Benefits:</strong> You're saving <span className="font-bold text-red-600">{formatPrice(currentSavings)}</span> on this order!
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
      <Alert className="bg-gradient-to-r from-red-50 to-orange-50 border-red-300 mb-6 border-2">
        <Crown className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-red-700">⚠️ Almost There! Don't Lose These Savings!</span><br />
              You can still save <span className="font-bold text-red-600 text-lg">{formatPrice(additionalSavings)}</span> on this order. 
              {currentTier === 'bronze' && <span> Upgrade now for <span className="font-bold text-red-600 text-lg">{formatPrice(potentialSavings)}</span> total savings!</span>}
            </div>
            <Button 
              onClick={handleUpgrade}
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white ml-4 whitespace-nowrap shadow-lg border-2 border-red-400 animate-bounce hover:animate-none"
            >
              <Zap className="w-4 h-4 mr-1" />
              Save Now!
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  const handleUpgrade = () => {
    // Redirect to FAP upgrade
    window.open('https://www.freeamericanpeople.com/upgrade', '_blank');
  };

  const handleUpgradeOffer = (upgrade: boolean) => {
    if (upgrade) {
      // Redirect to upgrade page with return URL
      handleUpgrade();
    } else {
      // Continue to payment
      setLocation('/payment');
    }
    setShowUpgradeOffer(false);
  };

  // Calculate potential savings
  const totalPrice = getTotalPrice();
  const currentTier = user?.subscriptionTier || 'basic';
  
  let currentSavings = 0;
  let potentialSavings = 0;
  let additionalSavings = 0;
  
  if (currentTier === 'standard') {
    currentSavings = totalPrice * 0.10; // 10% off
    potentialSavings = totalPrice * 0.15; // 15% off
    additionalSavings = potentialSavings - currentSavings;
  } else if (currentTier === 'basic') {
    potentialSavings = totalPrice * 0.15; // 15% off with platinum
  }

  const savings = {
    standard: currentTier === 'basic' ? totalPrice * 0.10 : null,
    premium: potentialSavings
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Billing Page Upgrade Alert */}
          <div className="lg:col-span-3 mb-6">
            <UpgradeBenefits user={user} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/shipping')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Shipping
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Billing Information</h1>
                <p className="text-sm text-gray-600">Enter your payment details</p>
              </div>
            </div>

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
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="text-sm font-medium text-green-600">Shipping</span>
              </div>
              <div className="w-12 h-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="text-sm font-medium text-blue-600">Billing</span>
              </div>
              <div className="w-12 h-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <span className="text-sm text-gray-500">Payment</span>
              </div>
            </div>

            {/* Legal Name Warning */}
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>IMPORTANT:</strong> The name on your billing information must exactly match the legal name on your credit card. 
                Any mismatch will result in payment failure and order cancellation. Use your full legal name as it appears on your ID and credit card.
              </AlertDescription>
            </Alert>

            {/* Upgrade Offer Modal */}
            {showUpgradeOffer && (
              <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <Crown className="w-5 h-5" />
                    Save More Before You Pay!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-2">You could save money on this order by upgrading your membership:</p>
                    
                    {savings.standard && (
                      <div className="bg-white p-3 rounded-lg border border-amber-200 mb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Upgrade to Standard</p>
                            <p className="text-sm text-gray-600">Save 10% on this order</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">-{formatPrice(savings.standard)}</p>
                            <p className="text-xs text-gray-500">on this order</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {savings.premium && (
                      <div className="bg-white p-3 rounded-lg border border-amber-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Upgrade to Premium</p>
                            <p className="text-sm text-gray-600">
                              Save {user?.subscriptionTier === 'basic' ? '15%' : '5% more'} on this order
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">-{formatPrice(savings.premium)}</p>
                            <p className="text-xs text-gray-500">on this order</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={() => handleUpgradeOffer(true)}
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Upgrade & Save
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleUpgradeOffer(false)}
                      className="flex-1"
                    >
                      Continue Without Upgrade
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Billing Form */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Billing Address
                </CardTitle>
                <p className="text-sm text-gray-600">
                  This address must match your credit card billing address exactly.
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    
                    <FormField
                      control={form.control}
                      name="sameAsShipping"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Same as shipping address
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {!sameAsShipping && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Legal First Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="As shown on your credit card" />
                                </FormControl>
                                <FormDescription className="text-xs text-red-600">
                                  Must match your credit card exactly
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Legal Last Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="As shown on your credit card" />
                                </FormControl>
                                <FormDescription className="text-xs text-red-600">
                                  Must match your credit card exactly
                                </FormDescription>
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
                              <FormLabel>Billing Address *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Street address as shown on your credit card statement" />
                              </FormControl>
                              <FormDescription className="text-xs text-red-600">
                                Must match your credit card billing address
                              </FormDescription>
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
                                <FormLabel>City *</FormLabel>
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
                                <FormLabel>State *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select state" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {/* Add all states */}
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
                                <FormLabel>ZIP Code *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    {/* Legal Name Confirmation */}
                    <div className="border-t pt-4">
                      <FormField
                        control={form.control}
                        name="legalNameConfirmation"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium">
                                I confirm that the billing name provided above exactly matches my legal name 
                                as it appears on my credit card and government-issued ID. *
                              </FormLabel>
                              <FormDescription className="text-xs text-red-600">
                                Required - Sales will be rejected if names do not match exactly
                              </FormDescription>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        type="button" 
                        size="lg" 
                        disabled={isProcessing}
                        className="min-w-[200px]"
                        onClick={() => {
                          console.log('Button clicked - navigating to payment');
                          setLocation('/payment');
                        }}
                      >
                        {isProcessing ? 'Saving...' : 'Continue to Payment'}
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
                
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 truncate">{item.productName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-600">Qty: {item.quantity}</p>
                          {item.requiresFFL && (
                            <Badge variant="outline" className="text-xs">FFL</Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-900 font-medium ml-2">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

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
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tax</span>
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

export default function BillingPage() {
  return (
    <SubscriptionEnforcement>
      <BillingPageContent />
    </SubscriptionEnforcement>
  );
}