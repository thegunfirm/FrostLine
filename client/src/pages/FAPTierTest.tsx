import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Crown, Star, Users, AlertCircle, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";

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

export default function FAPTierTest() {
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      if (data.success) {
        toast({
          title: "🎉 Tier Upgrade Successful!",
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
        title: "Error",
        description: error.message || "Failed to process subscription",
        variant: "destructive",
      });
    },
  });

  const handleSubscriptionUpgrade = (tier: SubscriptionTier, billingCycle: 'monthly' | 'yearly') => {
    setProcessingTier(tier.name);
    subscriptionMutation.mutate({ tier, billingCycle });
  };

  const getTierIcon = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'bronze':
        return <Users className="w-5 h-5" />;
      case 'gold':
        return <Star className="w-5 h-5" />;
      case 'platinum':
        return <Crown className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const getTierColor = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'bronze':
        return 'bg-orange-100 text-orange-800';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800';
      case 'platinum':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <p className="text-gray-600">Please log in to test FAP membership tiers.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TestTube className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">FAP Tier Progression Testing</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Test the membership tier progression system using Authorize.Net sandbox. 
            Start with Bronze (free), then upgrade to Gold, then Platinum.
          </p>
        </div>

        {/* Current Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Current Membership Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">User</label>
                <p className="text-gray-900">{user.firstName} {user.lastName}</p>
                <p className="text-gray-600 text-sm">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Current Tier</label>
                <div className="flex items-center gap-2">
                  <Badge className={getTierColor(user.membershipTier || 'Bronze')}>
                    {getTierIcon(user.membershipTier || 'Bronze')}
                    <span className="ml-1">{user.membershipTier || 'Bronze'}</span>
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Tiers */}
        <div className="grid md:grid-cols-3 gap-6">
          {tiersLoading ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-gray-500">Loading subscription tiers...</p>
            </div>
          ) : (
            subscriptionTiers?.map((tier: SubscriptionTier) => (
              <Card key={tier.name} className={`${
                user.membershipTier === tier.name ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getTierIcon(tier.name)}
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    {user.membershipTier === tier.name && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        Current
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold">
                      ${tier.monthlyPrice === 0 ? 'Free' : `${tier.monthlyPrice}/mo`}
                    </p>
                    {tier.yearlyPrice > 0 && (
                      <p className="text-sm text-gray-600">
                        or ${tier.yearlyPrice}/year
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Benefits:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {tier.benefits?.map((benefit: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {user.membershipTier !== tier.name && (
                    <div className="space-y-2">
                      {tier.monthlyPrice > 0 && (
                        <Button
                          onClick={() => handleSubscriptionUpgrade(tier, 'monthly')}
                          disabled={processingTier === tier.name}
                          className="w-full"
                          variant={tier.name === 'Gold' ? 'default' : tier.name === 'Platinum' ? 'destructive' : 'outline'}
                        >
                          {processingTier === tier.name ? 'Processing...' : `Upgrade to ${tier.name} (Monthly)`}
                        </Button>
                      )}
                      {tier.yearlyPrice > 0 && (
                        <Button
                          onClick={() => handleSubscriptionUpgrade(tier, 'yearly')}
                          disabled={processingTier === tier.name}
                          className="w-full"
                          variant="outline"
                        >
                          {processingTier === tier.name ? 'Processing...' : `Upgrade to ${tier.name} (Yearly)`}
                        </Button>
                      )}
                      {tier.monthlyPrice === 0 && (
                        <Button
                          onClick={() => handleSubscriptionUpgrade(tier, 'monthly')}
                          disabled={processingTier === tier.name}
                          className="w-full"
                          variant="outline"
                        >
                          {processingTier === tier.name ? 'Processing...' : `Select ${tier.name}`}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Testing Instructions */}
        <Alert className="mt-8">
          <TestTube className="h-4 w-4" />
          <AlertDescription>
            <strong>Testing Instructions:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Start with Bronze (free tier) - no payment required</li>
              <li>Upgrade to Gold using sandbox credit card: 4111111111111111</li>
              <li>Upgrade to Platinum using the same test card</li>
              <li>Check that your tier displays in the top-right corner of the site</li>
              <li>Verify tier changes are reflected in Zoho CRM</li>
            </ol>
            <p className="mt-2 text-sm text-gray-600">
              All payments use Authorize.Net sandbox mode - no real charges will be made.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}