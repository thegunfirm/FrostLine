import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Crown, Users2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TierLabelSetting {
  id: number;
  settingKey: string;
  isEnabled: boolean;
  description: string;
  lastModifiedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function TierLabels() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Fetch tier label settings
  const { data: labelSettings, isLoading } = useQuery({
    queryKey: ['/api/cms/tier-label-settings'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/cms/tier-label-settings");
      return response as TierLabelSetting[];
    }
  });

  // Update tier label setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async (data: { settingKey: string; isEnabled: boolean }) => {
      return await apiRequest("PUT", `/api/cms/tier-label-settings/${data.settingKey}`, {
        isEnabled: data.isEnabled
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms/tier-label-settings'] });
      toast({
        title: "Setting updated",
        description: `${variables.settingKey} has been ${variables.isEnabled ? 'enabled' : 'disabled'}.`
      });
      setIsUpdating(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update tier label setting",
        variant: "destructive"
      });
      setIsUpdating(null);
    }
  });

  const handleToggleSetting = async (settingKey: string, currentValue: boolean) => {
    setIsUpdating(settingKey);
    updateSettingMutation.mutate({
      settingKey,
      isEnabled: !currentValue
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const platinumFounderSetting = labelSettings?.find(s => s.settingKey === 'platinum_annual_to_founder');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-8 w-8 text-yellow-600" />
        <h1 className="text-3xl font-bold">Tier Label Management</h1>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Control how subscription tiers are labeled in Zoho CRM and throughout the system. 
          Changes take effect immediately for new registrations.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Platinum Founder vs Platinum Annually Control */}
        <Card className="border-yellow-200">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50">
            <CardTitle className="flex items-center gap-3">
              <Crown className="h-6 w-6 text-yellow-600" />
              Platinum Annual Labeling
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="platinum-founder" className="text-lg font-semibold">
                    Label Platinum Annual as "Platinum Founder"
                  </Label>
                  <p className="text-sm text-gray-600">
                    When enabled, customers who pay annually for Platinum will be labeled as "Platinum Founder" 
                    in Zoho CRM and throughout the system. Disable this to switch to "Platinum Annually" labeling.
                  </p>
                </div>
                <Switch
                  id="platinum-founder"
                  checked={platinumFounderSetting?.isEnabled ?? true}
                  disabled={isUpdating === 'platinum_annual_to_founder'}
                  onCheckedChange={() => 
                    handleToggleSetting('platinum_annual_to_founder', platinumFounderSetting?.isEnabled ?? true)
                  }
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Current Status:</h4>
                <p className="text-blue-800">
                  {platinumFounderSetting?.isEnabled ?? true 
                    ? "✓ New Platinum Annual customers will be labeled as 'Platinum Founder'" 
                    : "✓ New Platinum Annual customers will be labeled as 'Platinum Annually'"
                  }
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">Business Rule:</h4>
                <p className="text-sm text-gray-600">
                  The first several thousand Platinum annual subscribers should be labeled as "Platinum Founder" 
                  to distinguish early adopters. Once you're ready to transition to standard pricing, 
                  disable this setting to label new subscribers as "Platinum Annually".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Other tier settings can be added here */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Users2 className="h-6 w-6 text-blue-600" />
              Other Tier Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-gray-600">
                All other tier labels (Gold Monthly, Gold Annually, Bronze Monthly, Bronze Annually) 
                follow standard naming conventions and don't require special controls.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50 p-3 rounded border border-amber-200">
                  <h5 className="font-semibold text-amber-800">Gold Tier</h5>
                  <p className="text-sm text-amber-700">Gold Monthly, Gold Annually</p>
                </div>
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <h5 className="font-semibold text-orange-800">Bronze Tier</h5>
                  <p className="text-sm text-orange-700">Bronze Monthly, Bronze Annually</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}