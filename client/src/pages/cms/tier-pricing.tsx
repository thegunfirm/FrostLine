import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings, DollarSign, Users, Crown } from "lucide-react";

interface TierSettings {
  id: string;
  tier: "Bronze" | "Gold" | "Platinum";
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  isPopular: boolean;
  isFounderPricing: boolean;
  founderLimit: number;
  founderCountRemaining: number;
}

export default function TierPricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTier, setEditingTier] = useState<string | null>(null);

  // Fetch tier settings
  const { data: tierSettings, isLoading } = useQuery({
    queryKey: ['/api/cms/tier-settings'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/cms/tier-settings");
      return response;
    }
  });

  // Update tier settings mutation
  const updateTierMutation = useMutation({
    mutationFn: async (data: { tierId: string; settings: Partial<TierSettings> }) => {
      return await apiRequest("PUT", `/api/cms/tier-settings/${data.tierId}`, data.settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms/tier-settings'] });
      toast({
        title: "Tier settings updated",
        description: "Pricing and features have been saved successfully."
      });
      setEditingTier(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update tier settings",
        variant: "destructive"
      });
    }
  });

  const handleSave = (tierId: string, formData: FormData) => {
    const features = formData.get('features') as string;
    const settings = {
      monthlyPrice: parseFloat(formData.get('monthlyPrice') as string),
      annualPrice: parseFloat(formData.get('annualPrice') as string),
      features: features.split('\n').filter(f => f.trim()),
      isPopular: formData.get('isPopular') === 'on',
      isFounderPricing: formData.get('isFounderPricing') === 'on',
      founderLimit: parseInt(formData.get('founderLimit') as string) || 1000
    };

    updateTierMutation.mutate({ tierId, settings });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Tier Pricing Management</h1>
      </div>

      <div className="grid gap-6">
        {tierSettings?.map((tier: TierSettings) => (
          <Card key={tier.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    tier.tier === "Bronze" ? "bg-amber-100 text-amber-600" :
                    tier.tier === "Gold" ? "bg-yellow-100 text-yellow-600" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {tier.tier === "Platinum" ? <Crown className="w-5 h-5" /> : 
                     tier.tier === "Gold" ? <DollarSign className="w-5 h-5" /> : 
                     <Users className="w-5 h-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{tier.tier} Tier</CardTitle>
                    {tier.isPopular && (
                      <span className="text-sm text-blue-600 font-medium">Most Popular</span>
                    )}
                  </div>
                </div>
                <Button
                  variant={editingTier === tier.id ? "secondary" : "outline"}
                  onClick={() => setEditingTier(editingTier === tier.id ? null : tier.id)}
                >
                  {editingTier === tier.id ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {editingTier === tier.id ? (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSave(tier.id, new FormData(e.currentTarget));
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`monthly-${tier.id}`}>Monthly Price ($)</Label>
                      <Input
                        id={`monthly-${tier.id}`}
                        name="monthlyPrice"
                        type="number"
                        step="0.01"
                        defaultValue={tier.monthlyPrice}
                        disabled={tier.tier === "Bronze"}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`annual-${tier.id}`}>Annual Price ($)</Label>
                      <Input
                        id={`annual-${tier.id}`}
                        name="annualPrice"
                        type="number"
                        step="0.01"
                        defaultValue={tier.annualPrice}
                        disabled={tier.tier === "Bronze"}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`features-${tier.id}`}>Features (one per line)</Label>
                    <Textarea
                      id={`features-${tier.id}`}
                      name="features"
                      rows={6}
                      defaultValue={tier.features.join('\n')}
                    />
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`popular-${tier.id}`}
                        name="isPopular"
                        defaultChecked={tier.isPopular}
                      />
                      <Label htmlFor={`popular-${tier.id}`}>Mark as Popular</Label>
                    </div>

                    {tier.tier === "Platinum" && (
                      <>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`founder-${tier.id}`}
                            name="isFounderPricing"
                            defaultChecked={tier.isFounderPricing}
                          />
                          <Label htmlFor={`founder-${tier.id}`}>Founder Pricing</Label>
                        </div>
                        <div>
                          <Label htmlFor={`founder-limit-${tier.id}`}>Founder Limit</Label>
                          <Input
                            id={`founder-limit-${tier.id}`}
                            name="founderLimit"
                            type="number"
                            defaultValue={tier.founderLimit}
                            className="w-24"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={updateTierMutation.isPending}>
                      {updateTierMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingTier(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>Monthly Price:</strong> ${tier.monthlyPrice}
                    </div>
                    <div>
                      <strong>Annual Price:</strong> ${tier.annualPrice}
                    </div>
                  </div>

                  <div>
                    <strong>Features:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="text-sm">{feature}</li>
                      ))}
                    </ul>
                  </div>

                  {tier.tier === "Platinum" && tier.isFounderPricing && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <strong>Founder Pricing Active</strong>
                      <p className="text-sm text-gray-600">
                        {tier.founderCountRemaining} of {tier.founderLimit} founder spots remaining
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}