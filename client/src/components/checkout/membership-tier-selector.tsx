import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Crown, Medal } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface MembershipTierSelectorProps {
  onTierSelected: () => void;
  totalCartValue: number;
}

export function MembershipTierSelector({ onTierSelected, totalCartValue }: MembershipTierSelectorProps) {
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const tiers = [
    {
      name: 'Bronze',
      price: 0,
      icon: Medal,
      color: 'from-amber-400 to-amber-600',
      benefits: [
        'Free membership - no monthly fee',
        'Access to all products',
        'Standard customer support',
        'Basic pricing tier'
      ],
      savings: 0,
      popular: false
    },
    {
      name: 'Gold',
      price: 19.99,
      icon: Star,
      color: 'from-yellow-400 to-yellow-600',
      benefits: [
        'Better pricing on most items',
        'Priority customer support',
        'Early access to deals',
        'Monthly member specials'
      ],
      savings: totalCartValue * 0.08, // 8% average savings
      popular: true
    },
    {
      name: 'Platinum',
      price: 39.99,
      icon: Crown,
      color: 'from-gray-400 to-gray-600',
      benefits: [
        'Best pricing - near wholesale',
        'VIP customer support',
        'Exclusive product access',
        'Free shipping on all orders',
        'Special member events'
      ],
      savings: totalCartValue * 0.15, // 15% average savings
      popular: false
    }
  ];

  const handleTierSelection = async (tierName: string) => {
    if (!user) return;
    
    setIsProcessing(true);
    
    try {
      if (tierName === 'Bronze') {
        // Bronze is free - just update user tier
        await apiRequest('PUT', `/api/users/${user.id}/tier`, {
          subscriptionTier: tierName,
          membershipPaid: true
        });
        onTierSelected();
      } else {
        // Gold/Platinum require payment - redirect to FAP payment
        setSelectedTier(tierName);
        
        // In a real implementation, this would redirect to FAP payment system
        // For now, we'll simulate the payment process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await apiRequest('PUT', `/api/users/${user.id}/tier`, {
          subscriptionTier: tierName,
          membershipPaid: true
        });
        
        onTierSelected();
      }
    } catch (error) {
      console.error('Failed to select tier:', error);
      alert('Failed to process membership selection. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Membership Level
        </h2>
        <p className="text-gray-600">
          Unlock better pricing and exclusive benefits with a membership tier.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          const monthlyBreakeven = tier.savings > 0 ? tier.price / tier.savings : null;
          
          return (
            <Card 
              key={tier.name}
              className={`relative transition-all hover:shadow-lg ${
                tier.popular ? 'ring-2 ring-amber-500 scale-105' : ''
              } ${selectedTier === tier.name ? 'ring-2 ring-blue-500' : ''}`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${tier.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                
                <CardTitle className="text-xl font-bold">{tier.name}</CardTitle>
                
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">
                    {tier.price === 0 ? 'Free' : `$${tier.price}`}
                    {tier.price > 0 && <span className="text-sm font-normal text-gray-600">/month</span>}
                  </div>
                  
                  {tier.savings > 0 && (
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-green-600">
                        Save {formatPrice(tier.savings)} on this order!
                      </p>
                      {monthlyBreakeven && monthlyBreakeven < 1 && (
                        <p className="text-xs text-gray-600">
                          Pays for itself with this purchase
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {tier.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  disabled={isProcessing}
                  onClick={() => handleTierSelection(tier.name)}
                >
                  {isProcessing && selectedTier === tier.name ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    <>
                      {tier.price === 0 ? 'Continue with Bronze' : `Subscribe for ${formatPrice(tier.price)}/month`}
                    </>
                  )}
                </Button>
                
                {tier.price > 0 && (
                  <p className="text-xs text-gray-500 text-center">
                    Cancel anytime. First month starts after purchase.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">About Your Membership</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Membership is managed through FreeAmericanPeople.com</li>
          <li>• Higher tiers unlock progressively better pricing on all TheGunFirm products</li>
          <li>• Membership pricing is applied automatically at checkout</li>
          <li>• Gold and Platinum members get exclusive access to limited-time deals</li>
          <li>• Membership benefits apply across all affiliated platforms</li>
        </ul>
      </div>
    </div>
  );
}