import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Crown, Star, Users, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SubscriptionTier {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  benefits: string[];
}

interface MembershipStatus {
  userId: string;
  email: string;
  currentTier: string;
  tierInfo: SubscriptionTier | null;
  isActive: boolean;
  canAccessCheckout: boolean;
}

export default function FAPMembership() {
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get available subscription tiers
  const { data: subscriptionTiers, isLoading: tiersLoading } = useQuery({
    queryKey: ["/api/fap/subscription-tiers"],
    retry: false,
  });

  // Get user's current membership status
  const { data: membershipStatus, isLoading: statusLoading } = useQuery<MembershipStatus>({
    queryKey: ["/api/fap/membership-status"],
    retry: false,
  });

  // Process subscription payment
  const subscriptionMutation = useMutation({
    mutationFn: async ({ tier, billingCycle }: { tier: SubscriptionTier; billingCycle: 'monthly' | 'yearly' }) => {
      const amount = billingCycle === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
      
      const response = await apiRequest("POST", "/api/fap/process-subscription", {
        subscriptionTier: tier.name,
        billingCycle,
        amount
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setProcessingTier(null);
      queryClient.invalidateQueries({ queryKey: ["/api/fap/membership-status"] });
      
      if (data.success) {
        toast({
          title: "Payment Successful!",
          description: `Your ${data.subscriptionTier} membership is now active. Transaction ID: ${data.transactionId}`,
        });
      } else {
        toast({
          title: "Payment Failed",
          description: data.error || "Payment processing failed",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setProcessingTier(null);
      toast({
        title: "Payment Error",
        description: error.message || "Payment processing failed",
        variant: "destructive",
      });
    },
  });

  const getTierIcon = (tierName: string) => {
    if (tierName.includes('Platinum')) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (tierName.includes('Gold')) return <Star className="h-5 w-5 text-yellow-400" />;
    return <Users className="h-5 w-5 text-gray-500" />;
  };

  const getTierColor = (tierName: string) => {
    if (tierName.includes('Platinum')) return 'bg-gradient-to-r from-purple-600 to-purple-700';
    if (tierName.includes('Gold')) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    return 'bg-gradient-to-r from-gray-500 to-gray-600';
  };

  const handleSubscription = (tier: SubscriptionTier, billingCycle: 'monthly' | 'yearly') => {
    setProcessingTier(tier.name);
    subscriptionMutation.mutate({ tier, billingCycle });
  };

  if (tiersLoading || statusLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">FAP Membership Plans</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Join Free American People and unlock exclusive benefits for TheGunFirm.com
        </p>
      </div>

      {/* Current Status */}
      {membershipStatus && (
        <div className="mb-8">
          <Alert className={membershipStatus.canAccessCheckout ? "border-green-500" : "border-orange-500"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {membershipStatus.canAccessCheckout ? (
                <span className="text-green-600">
                  ✅ Active {membershipStatus.currentTier} membership - You can access TheGunFirm checkout
                </span>
              ) : (
                <span className="text-orange-600">
                  ⚠️ No active membership - FAP membership required to access TheGunFirm checkout
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptionTiers && Object.values(subscriptionTiers as Record<string, SubscriptionTier>)?.map((tier: SubscriptionTier) => {
          const isCurrentTier = membershipStatus?.currentTier === tier.name;
          const isFounder = tier.name === 'Platinum Founder';
          const isBronze = tier.name === 'Bronze';
          const isMonthlyOnly = tier.yearlyPrice === 0;
          const isYearlyOnly = tier.monthlyPrice === 0 && tier.yearlyPrice > 0;
          
          return (
            <Card key={tier.name} className={`relative ${isCurrentTier ? 'ring-2 ring-green-500' : ''}`}>
              <CardHeader className={`text-white ${getTierColor(tier.name)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTierIcon(tier.name)}
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                  </div>
                  {isCurrentTier && <Badge className="bg-white text-green-600">CURRENT</Badge>}
                  {isFounder && <Badge className="bg-red-500 text-white">LIMITED TIME</Badge>}
                  {isBronze && <Badge className="bg-green-500 text-white">FREE</Badge>}
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                {/* Pricing */}
                <div className="mb-4">
                  {isBronze ? (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">FREE</div>
                      <div className="text-sm text-gray-500">No payment required</div>
                    </div>
                  ) : isFounder ? (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">${tier.yearlyPrice}</div>
                      <div className="text-sm text-gray-500">One-time lifetime payment</div>
                    </div>
                  ) : isMonthlyOnly ? (
                    <div className="text-center">
                      <div className="text-2xl font-bold">${tier.monthlyPrice}/month</div>
                      <div className="text-sm text-gray-500">Monthly billing</div>
                    </div>
                  ) : isYearlyOnly ? (
                    <div className="text-center">
                      <div className="text-2xl font-bold">${tier.yearlyPrice}/year</div>
                      <div className="text-sm text-gray-500">Annual billing</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold">${tier.monthlyPrice}/mo</div>
                      <div className="text-sm text-gray-500">
                        or ${tier.yearlyPrice}/year (Save ${(tier.monthlyPrice * 12 - tier.yearlyPrice).toFixed(0)})
                      </div>
                    </div>
                  )}
                </div>

                {/* Benefits */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">Benefits:</h4>
                  <ul className="space-y-2">
                    {tier.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {isCurrentTier ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : isBronze ? (
                    <Button
                      onClick={() => handleSubscription(tier, 'monthly')}
                      disabled={processingTier === tier.name || subscriptionMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {processingTier === tier.name ? 'Activating...' : 'Join Free Bronze'}
                    </Button>
                  ) : isFounder ? (
                    <Button
                      onClick={() => handleSubscription(tier, 'yearly')}
                      disabled={processingTier === tier.name || subscriptionMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {processingTier === tier.name ? 'Processing...' : `Get Lifetime Access - $${tier.yearlyPrice}`}
                    </Button>
                  ) : isMonthlyOnly ? (
                    <Button
                      onClick={() => handleSubscription(tier, 'monthly')}
                      disabled={processingTier === tier.name || subscriptionMutation.isPending}
                      className="w-full"
                    >
                      {processingTier === tier.name ? 'Processing...' : `Subscribe Monthly - $${tier.monthlyPrice}`}
                    </Button>
                  ) : isYearlyOnly ? (
                    <Button
                      onClick={() => handleSubscription(tier, 'yearly')}
                      disabled={processingTier === tier.name || subscriptionMutation.isPending}
                      className="w-full"
                    >
                      {processingTier === tier.name ? 'Processing...' : `Subscribe Yearly - $${tier.yearlyPrice}`}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleSubscription(tier, 'monthly')}
                        disabled={processingTier === tier.name || subscriptionMutation.isPending}
                        className="w-full"
                        variant="outline"
                      >
                        {processingTier === tier.name ? 'Processing...' : `Subscribe Monthly - $${tier.monthlyPrice}`}
                      </Button>
                      <Button
                        onClick={() => handleSubscription(tier, 'yearly')}
                        disabled={processingTier === tier.name || subscriptionMutation.isPending}
                        className="w-full"
                      >
                        {processingTier === tier.name ? 'Processing...' : `Subscribe Yearly - $${tier.yearlyPrice}`}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Integration Info */}
      <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-xl font-bold mb-4">About FAP Integration</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold mb-2">🔐 Authentication System</h4>
            <p className="text-gray-600 dark:text-gray-300">
              Your account is managed through Zoho CRM as the primary customer database. 
              All user data, subscription tiers, and payment history are securely stored in Zoho.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">💳 Payment Processing</h4>
            <p className="text-gray-600 dark:text-gray-300">
              Payments are processed through Authorize.Net sandbox for testing. 
              Successful payments automatically update your membership tier in Zoho CRM.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🛒 TheGunFirm Access</h4>
            <p className="text-gray-600 dark:text-gray-300">
              Active FAP membership is required to access TheGunFirm.com checkout. 
              Your membership tier determines available discounts and benefits.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🏪 Dual Platform System</h4>
            <p className="text-gray-600 dark:text-gray-300">
              FAP handles membership management while TheGunFirm focuses on e-commerce. 
              Seamless integration ensures a unified user experience across platforms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}