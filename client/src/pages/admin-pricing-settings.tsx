import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PricingRule {
  id: number;
  name: string;
  bronzeMarkupType: string;
  bronzeMarkupValue: string;
  bronzeThreshold: string;
  bronzeFlatMarkup: string;
  goldMarkupType: string;
  goldMarkupValue: string;
  goldThreshold: string;
  goldFlatMarkup: string;
  platinumMarkupType: string;
  platinumMarkupValue: string;
  platinumThreshold: string;
  platinumFlatMarkup: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPricingSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: "Custom Pricing Rules",
    bronzeMarkupType: "percentage",
    bronzeMarkupValue: "10.00",
    bronzeThreshold: "200.00",
    bronzeFlatMarkup: "20.00",
    goldMarkupType: "percentage",
    goldMarkupValue: "5.00",
    goldThreshold: "200.00",
    goldFlatMarkup: "15.00",
    platinumMarkupType: "percentage",
    platinumMarkupValue: "2.00",
    platinumThreshold: "200.00",
    platinumFlatMarkup: "10.00"
  });

  const [missingMapDiscount, setMissingMapDiscount] = useState("5.0");

  // Fetch active pricing rules
  const { data: activeRule, isLoading } = useQuery({
    queryKey: ["/api/admin/pricing-rules/active"],
    refetchInterval: 30000,
  });

  // Fetch missing MAP discount setting
  const { data: missingMapSetting } = useQuery({
    queryKey: ["/api/admin/system-settings/missing_map_discount_percent"],
    refetchInterval: 30000,
  });

  // Update form data when active rule is loaded
  useEffect(() => {
    if (activeRule) {
      setFormData({
        name: activeRule.name || "Custom Pricing Rules",
        bronzeMarkupType: activeRule.bronzeMarkupType || "percentage",
        bronzeMarkupValue: activeRule.bronzeMarkupValue || "10.00",
        bronzeThreshold: activeRule.bronzeThreshold || "200.00",
        bronzeFlatMarkup: activeRule.bronzeFlatMarkup || "20.00",
        goldMarkupType: activeRule.goldMarkupType || "percentage",
        goldMarkupValue: activeRule.goldMarkupValue || "5.00",
        goldThreshold: activeRule.goldThreshold || "200.00",
        goldFlatMarkup: activeRule.goldFlatMarkup || "15.00",
        platinumMarkupType: activeRule.platinumMarkupType || "percentage",
        platinumMarkupValue: activeRule.platinumMarkupValue || "2.00",
        platinumThreshold: activeRule.platinumThreshold || "200.00",
        platinumFlatMarkup: activeRule.platinumFlatMarkup || "10.00"
      });
    }
  }, [activeRule]);

  // Update missing MAP discount when setting is loaded
  useEffect(() => {
    if (missingMapSetting?.value) {
      setMissingMapDiscount(missingMapSetting.value);
    }
  }, [missingMapSetting]);

  // Save pricing rules mutation
  const savePricingRules = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (activeRule?.id) {
        return apiRequest("PUT", `/api/admin/pricing-rules/${activeRule.id}`, data);
      } else {
        return apiRequest("POST", "/api/admin/pricing-rules", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Pricing Rules Updated",
        description: "Your pricing configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-rules/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save pricing rules.",
        variant: "destructive",
      });
    },
  });

  // Save missing MAP discount setting mutation
  const saveMissingMapDiscount = useMutation({
    mutationFn: async (value: string) => {
      return apiRequest("PUT", "/api/admin/system-settings/missing_map_discount_percent", { value });
    },
    onSuccess: () => {
      toast({
        title: "Missing MAP Discount Updated",
        description: "The discount percentage has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-settings/missing_map_discount_percent"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save missing MAP discount setting.",
        variant: "destructive",
      });
    },
  });

  // Recalculate pricing mutation
  const recalculatePricing = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/pricing-rules/recalculate", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Pricing Recalculated",
        description: `Successfully updated pricing for ${data.updatedCount} products.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Recalculation Failed",
        description: error.message || "Failed to recalculate product pricing.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    savePricingRules.mutate(formData);
  };

  const handleSaveMissingMapDiscount = () => {
    saveMissingMapDiscount.mutate(missingMapDiscount);
  };

  const handleRecalculate = () => {
    recalculatePricing.mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pricing Management</h1>
          <p className="text-muted-foreground">Configure tier-based pricing markup rules</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleRecalculate}
            disabled={recalculatePricing.isPending}
            variant="outline"
          >
            {recalculatePricing.isPending ? "Recalculating..." : "Recalculate All Pricing"}
          </Button>
          <Button 
            onClick={handleSave}
            disabled={savePricingRules.isPending}
          >
            {savePricingRules.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bronze Tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-600">Bronze Tier Pricing</CardTitle>
            <CardDescription>Public pricing for non-members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bronzeMarkupType">Markup Type</Label>
              <Select value={formData.bronzeMarkupType} onValueChange={(value) => handleInputChange("bronzeMarkupType", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Based</SelectItem>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bronzeThreshold">Price Threshold ($)</Label>
              <Input
                id="bronzeThreshold"
                type="number"
                step="0.01"
                value={formData.bronzeThreshold}
                onChange={(e) => handleInputChange("bronzeThreshold", e.target.value)}
                placeholder="200.00"
              />
            </div>

            <div>
              <Label htmlFor="bronzeMarkupValue">Under Threshold (% markup)</Label>
              <Input
                id="bronzeMarkupValue"
                type="number"
                step="0.01"
                value={formData.bronzeMarkupValue}
                onChange={(e) => handleInputChange("bronzeMarkupValue", e.target.value)}
                placeholder="10.00"
              />
            </div>

            <div>
              <Label htmlFor="bronzeFlatMarkup">Over Threshold ($ flat)</Label>
              <Input
                id="bronzeFlatMarkup"
                type="number"
                step="0.01"
                value={formData.bronzeFlatMarkup}
                onChange={(e) => handleInputChange("bronzeFlatMarkup", e.target.value)}
                placeholder="20.00"
              />
            </div>

            <div className="text-sm text-muted-foreground bg-amber-50 p-3 rounded">
              <strong>Current Rule:</strong> Under ${formData.bronzeThreshold}: +{formData.bronzeMarkupValue}% markup<br />
              Over ${formData.bronzeThreshold}: +${formData.bronzeFlatMarkup} flat
            </div>
          </CardContent>
        </Card>

        {/* Gold Tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-600">Gold Tier Pricing</CardTitle>
            <CardDescription>Member pricing (requires MAP availability)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="goldMarkupType">Markup Type</Label>
              <Select value={formData.goldMarkupType} onValueChange={(value) => handleInputChange("goldMarkupType", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Based</SelectItem>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="goldThreshold">Price Threshold ($)</Label>
              <Input
                id="goldThreshold"
                type="number"
                step="0.01"
                value={formData.goldThreshold}
                onChange={(e) => handleInputChange("goldThreshold", e.target.value)}
                placeholder="200.00"
              />
            </div>

            <div>
              <Label htmlFor="goldMarkupValue">Under Threshold (% markup)</Label>
              <Input
                id="goldMarkupValue"
                type="number"
                step="0.01"
                value={formData.goldMarkupValue}
                onChange={(e) => handleInputChange("goldMarkupValue", e.target.value)}
                placeholder="5.00"
              />
            </div>

            <div>
              <Label htmlFor="goldFlatMarkup">Over Threshold ($ flat)</Label>
              <Input
                id="goldFlatMarkup"
                type="number"
                step="0.01"
                value={formData.goldFlatMarkup}
                onChange={(e) => handleInputChange("goldFlatMarkup", e.target.value)}
                placeholder="15.00"
              />
            </div>

            <div className="text-sm text-muted-foreground bg-yellow-50 p-3 rounded">
              <strong>Current Rule:</strong> Under ${formData.goldThreshold}: +{formData.goldMarkupValue}% markup<br />
              Over ${formData.goldThreshold}: +${formData.goldFlatMarkup} flat<br />
              <em>Hidden if no MAP price available</em>
            </div>
          </CardContent>
        </Card>

        {/* Platinum Tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-600">Platinum Tier Pricing</CardTitle>
            <CardDescription>Dealer pricing (hidden from public)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platinumMarkupType">Markup Type</Label>
              <Select value={formData.platinumMarkupType} onValueChange={(value) => handleInputChange("platinumMarkupType", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Based</SelectItem>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="platinumThreshold">Price Threshold ($)</Label>
              <Input
                id="platinumThreshold"
                type="number"
                step="0.01"
                value={formData.platinumThreshold}
                onChange={(e) => handleInputChange("platinumThreshold", e.target.value)}
                placeholder="200.00"
              />
            </div>

            <div>
              <Label htmlFor="platinumMarkupValue">Under Threshold (% markup)</Label>
              <Input
                id="platinumMarkupValue"
                type="number"
                step="0.01"
                value={formData.platinumMarkupValue}
                onChange={(e) => handleInputChange("platinumMarkupValue", e.target.value)}
                placeholder="2.00"
              />
            </div>

            <div>
              <Label htmlFor="platinumFlatMarkup">Over Threshold ($ flat)</Label>
              <Input
                id="platinumFlatMarkup"
                type="number"
                step="0.01"
                value={formData.platinumFlatMarkup}
                onChange={(e) => handleInputChange("platinumFlatMarkup", e.target.value)}
                placeholder="10.00"
              />
            </div>

            <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
              <strong>Current Rule:</strong> Under ${formData.platinumThreshold}: +{formData.platinumMarkupValue}% markup<br />
              Over ${formData.platinumThreshold}: +${formData.platinumFlatMarkup} flat<br />
              <em>Never shown to public users</em>
            </div>
          </CardContent>
        </Card>
      </div>



      <Card>
        <CardHeader>
          <CardTitle>Pricing Configuration</CardTitle>
          <CardDescription>Current markup rules and examples</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Missing MAP Discount Configuration */}
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">Missing MAP Discount Configuration</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Applied to products where RSR provides identical MSRP and MAP values (currently affects 3,086 products)
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="missingMapDiscount">Gold Tier Discount (%)</Label>
                  <Input
                    id="missingMapDiscount"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={missingMapDiscount}
                    onChange={(e) => setMissingMapDiscount(e.target.value)}
                    placeholder="5.0"
                    className="max-w-32"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Percentage discount when MSRP = MAP
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveMissingMapDiscount}
                    disabled={saveMissingMapDiscount.isPending}
                    size="sm"
                    variant="outline"
                  >
                    {saveMissingMapDiscount.isPending ? "Saving..." : "Save Discount Setting"}
                  </Button>
                </div>
              </div>

              <div>
                <h5 className="font-medium mb-3">Discount Example</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Original MSRP/MAP:</span>
                    <span className="font-mono">$100.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gold Price ({missingMapDiscount}% off):</span>
                    <span className="font-mono text-green-600">
                      ${(100 * (1 - parseFloat(missingMapDiscount || "0") / 100)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Member Savings:</span>
                    <span>${(100 * parseFloat(missingMapDiscount || "0") / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Examples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Example Pricing ($100 wholesale)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Bronze:</span>
                  <span className="font-mono">${(100 * (1 + parseFloat(formData.bronzeMarkupValue) / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gold:</span>
                  <span className="font-mono">${(100 * (1 + parseFloat(formData.goldMarkupValue) / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platinum:</span>
                  <span className="font-mono">${(100 * (1 + parseFloat(formData.platinumMarkupValue) / 100)).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Example Pricing ($500 wholesale)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Bronze:</span>
                  <span className="font-mono">${(500 + parseFloat(formData.bronzeFlatMarkup)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gold:</span>
                  <span className="font-mono">${(500 + parseFloat(formData.goldFlatMarkup)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platinum:</span>
                  <span className="font-mono">${(500 + parseFloat(formData.platinumFlatMarkup)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}