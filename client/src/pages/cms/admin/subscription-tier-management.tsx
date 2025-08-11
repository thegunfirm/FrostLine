import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Save, Edit, Crown, Star, Users, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SubscriptionTier {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  benefits: string[];
  isActive: boolean;
}

interface TierUpdate {
  originalName: string;
  newName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  benefits: string[];
  isActive: boolean;
}

export default function SubscriptionTierManagement() {
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [tierUpdates, setTierUpdates] = useState<Record<string, TierUpdate>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current subscription tiers
  const { data: subscriptionTiers, isLoading: tiersLoading } = useQuery({
    queryKey: ["/api/fap/subscription-tiers"],
    retry: false,
  });

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async (tierUpdate: TierUpdate) => {
      return apiRequest("PUT", "/api/cms/subscription-tiers", tierUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fap/subscription-tiers"] });
      setEditingTier(null);
      setTierUpdates({});
      toast({
        title: "Tier Updated",
        description: "Subscription tier has been updated and synchronized with Zoho",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update subscription tier",
        variant: "destructive",
      });
    },
  });

  // Sync all tiers with Zoho
  const syncZohoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/cms/sync-zoho-tiers");
    },
    onSuccess: () => {
      toast({
        title: "Zoho Sync Complete",
        description: "All subscription tiers have been synchronized with Zoho CRM",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with Zoho",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (tierName: string, tier: SubscriptionTier) => {
    setEditingTier(tierName);
    setTierUpdates({
      ...tierUpdates,
      [tierName]: {
        originalName: tierName,
        newName: tier.name,
        monthlyPrice: tier.monthlyPrice,
        yearlyPrice: tier.yearlyPrice,
        benefits: [...tier.benefits],
        isActive: tier.isActive || true,
      }
    });
  };

  const handleUpdateField = (tierName: string, field: string, value: any) => {
    setTierUpdates({
      ...tierUpdates,
      [tierName]: {
        ...tierUpdates[tierName],
        [field]: value
      }
    });
  };

  const handleSaveTier = (tierName: string) => {
    const update = tierUpdates[tierName];
    if (update) {
      updateTierMutation.mutate(update);
    }
  };

  const handleCancelEdit = (tierName: string) => {
    setEditingTier(null);
    const newUpdates = { ...tierUpdates };
    delete newUpdates[tierName];
    setTierUpdates(newUpdates);
  };

  const getTierIcon = (tierName: string) => {
    if (tierName.toLowerCase().includes('platinum')) return <Crown className="h-5 w-5 text-purple-600" />;
    if (tierName.toLowerCase().includes('gold')) return <Star className="h-5 w-5 text-yellow-600" />;
    return <Users className="h-5 w-5 text-gray-600" />;
  };

  if (tiersLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Tier Management</h1>
          <p className="text-gray-600 mt-2">Manage FAP subscription tiers and sync with Zoho CRM</p>
        </div>
        <Button 
          onClick={() => syncZohoMutation.mutate()}
          disabled={syncZohoMutation.isPending}
        >
          {syncZohoMutation.isPending ? "Syncing..." : "Sync All to Zoho"}
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Changes to tier names will update existing customer records in Zoho CRM. 
          Bronze tier is free and requires no payment processing.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {subscriptionTiers && Object.values(subscriptionTiers as Record<string, SubscriptionTier>).map((tier: SubscriptionTier) => {
          const isEditing = editingTier === tier.name;
          const currentUpdate = tierUpdates[tier.name];
          
          return (
            <Card key={tier.name} className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center space-x-3">
                  {getTierIcon(tier.name)}
                  <div>
                    {isEditing ? (
                      <Input
                        value={currentUpdate?.newName || tier.name}
                        onChange={(e) => handleUpdateField(tier.name, 'newName', e.target.value)}
                        className="text-xl font-bold"
                      />
                    ) : (
                      <CardTitle className="flex items-center gap-2">
                        {tier.name}
                        {tier.name === 'Bronze' && <Badge variant="secondary">Free</Badge>}
                        {tier.name.includes('Founder') && <Badge variant="destructive">Limited Time</Badge>}
                      </CardTitle>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {isEditing ? (
                    <>
                      <Button 
                        onClick={() => handleSaveTier(tier.name)}
                        disabled={updateTierMutation.isPending}
                        size="sm"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleCancelEdit(tier.name)}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => handleStartEdit(tier.name, tier)}
                      size="sm"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monthly Price ($)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={currentUpdate?.monthlyPrice || tier.monthlyPrice}
                        onChange={(e) => handleUpdateField(tier.name, 'monthlyPrice', parseFloat(e.target.value) || 0)}
                      />
                    ) : (
                      <p className="text-2xl font-bold text-green-600">
                        {tier.monthlyPrice === 0 ? 'Free' : `$${tier.monthlyPrice.toFixed(2)}`}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Yearly Price ($)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={currentUpdate?.yearlyPrice || tier.yearlyPrice}
                        onChange={(e) => handleUpdateField(tier.name, 'yearlyPrice', parseFloat(e.target.value) || 0)}
                      />
                    ) : (
                      <p className="text-2xl font-bold text-green-600">
                        {tier.yearlyPrice === 0 ? 'N/A' : `$${tier.yearlyPrice.toFixed(2)}`}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Benefits</Label>
                  {isEditing ? (
                    <Textarea
                      value={currentUpdate?.benefits?.join('\n') || tier.benefits.join('\n')}
                      onChange={(e) => handleUpdateField(tier.name, 'benefits', e.target.value.split('\n').filter(b => b.trim()))}
                      placeholder="Enter benefits (one per line)"
                      className="min-h-[100px]"
                    />
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {tier.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}