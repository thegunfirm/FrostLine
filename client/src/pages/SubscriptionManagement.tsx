import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Edit, Save, X } from "lucide-react";

interface SubscriptionTier {
  id: number;
  tier: string;
  displayName: string;
  monthlyPrice: string;
  annualPrice: string;
  discountPercent: string;
  features: string[];
  isPopular: boolean;
  isFounderPricing: boolean;
  isTemporary: boolean;
  isActive: boolean;
  sortOrder: number;
  description?: string;
}

export default function SubscriptionManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['/api/cms/subscription-tiers'],
    retry: false
  });

  const updateTierMutation = useMutation({
    mutationFn: async (tier: SubscriptionTier) => {
      await apiRequest('PUT', `/api/cms/subscription-tiers/${tier.id}`, tier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms/subscription-tiers'] });
      setEditingTier(null);
      toast({
        title: "Success",
        description: "Subscription tier updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription tier",
        variant: "destructive"
      });
    }
  });

  const createTierMutation = useMutation({
    mutationFn: async (tier: Omit<SubscriptionTier, 'id'>) => {
      await apiRequest('POST', '/api/cms/subscription-tiers', tier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms/subscription-tiers'] });
      setIsCreatingNew(false);
      toast({
        title: "Success",
        description: "New subscription tier created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to create subscription tier",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Tier Management</h1>
          <p className="text-muted-foreground">
            Configure subscription pricing and features for FAP membership tiers
          </p>
        </div>
        <Button onClick={() => setIsCreatingNew(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Tier
        </Button>
      </div>

      <div className="grid gap-6">
        {tiers?.map((tier: SubscriptionTier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            isEditing={editingTier?.id === tier.id}
            onEdit={() => setEditingTier(tier)}
            onSave={(updatedTier) => updateTierMutation.mutate(updatedTier)}
            onCancel={() => setEditingTier(null)}
            isSaving={updateTierMutation.isPending}
          />
        ))}

        {isCreatingNew && (
          <NewTierCard
            onSave={(newTier) => createTierMutation.mutate(newTier)}
            onCancel={() => setIsCreatingNew(false)}
            isSaving={createTierMutation.isPending}
          />
        )}
      </div>

      {/* Test All Tiers Button */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Testing & Verification</CardTitle>
          <CardDescription>
            Test subscription tier pricing and create verification accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TestTierButton />
          <div className="text-sm text-blue-700">
            This will create test accounts for each active tier and provide Zoho CRM verification details
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TierCard({ 
  tier, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  isSaving 
}: {
  tier: SubscriptionTier;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (tier: SubscriptionTier) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [editedTier, setEditedTier] = useState(tier);

  if (isEditing) {
    return (
      <Card className="border-orange-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-orange-800">Editing: {tier.displayName}</CardTitle>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => onSave(editedTier)}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={editedTier.displayName}
                onChange={(e) => setEditedTier({...editedTier, displayName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="monthlyPrice">Monthly Price ($)</Label>
              <Input
                id="monthlyPrice"
                type="number"
                step="0.01"
                value={editedTier.monthlyPrice}
                onChange={(e) => setEditedTier({...editedTier, monthlyPrice: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="annualPrice">Annual Price ($)</Label>
              <Input
                id="annualPrice"
                type="number"
                step="0.01"
                value={editedTier.annualPrice}
                onChange={(e) => setEditedTier({...editedTier, annualPrice: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="discountPercent">Product Discount (%)</Label>
            <Input
              id="discountPercent"
              type="number"
              step="0.01"
              value={editedTier.discountPercent}
              onChange={(e) => setEditedTier({...editedTier, discountPercent: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="features">Features (one per line)</Label>
            <Textarea
              id="features"
              rows={4}
              value={editedTier.features.join('\n')}
              onChange={(e) => setEditedTier({...editedTier, features: e.target.value.split('\n').filter(f => f.trim())})}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={editedTier.isActive}
                onCheckedChange={(checked) => setEditedTier({...editedTier, isActive: checked})}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isPopular"
                checked={editedTier.isPopular}
                onCheckedChange={(checked) => setEditedTier({...editedTier, isPopular: checked})}
              />
              <Label htmlFor="isPopular">Popular Choice</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isTemporary"
                checked={editedTier.isTemporary}
                onCheckedChange={(checked) => setEditedTier({...editedTier, isTemporary: checked})}
              />
              <Label htmlFor="isTemporary">Temporary Tier</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${tier.isActive ? '' : 'opacity-60'} ${tier.isPopular ? 'border-gold ring-1 ring-gold' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CardTitle>{tier.displayName}</CardTitle>
            <div className="flex gap-2">
              {tier.isPopular && <Badge variant="secondary" className="bg-gold text-black">Popular</Badge>}
              {tier.isTemporary && <Badge variant="outline" className="border-orange-500 text-orange-600">Temporary</Badge>}
              {!tier.isActive && <Badge variant="secondary" className="bg-gray-500">Inactive</Badge>}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
        <CardDescription>
          {tier.description || `${tier.tier} membership tier configuration`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Monthly Price</h4>
            <p className="text-2xl font-bold text-green-600">${tier.monthlyPrice}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Annual Price</h4>
            <p className="text-2xl font-bold text-green-600">${tier.annualPrice}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Product Discount</h4>
            <p className="text-2xl font-bold text-blue-600">{tier.discountPercent}%</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Features</h4>
            <p className="text-sm">{tier.features.length} features configured</p>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="font-semibold text-sm text-muted-foreground mb-2">Features:</h4>
          <ul className="text-sm space-y-1">
            {tier.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1 h-1 bg-current rounded-full"></span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function NewTierCard({ 
  onSave, 
  onCancel, 
  isSaving 
}: {
  onSave: (tier: Omit<SubscriptionTier, 'id'>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [newTier, setNewTier] = useState({
    tier: '',
    displayName: '',
    monthlyPrice: '0.00',
    annualPrice: '0.00',
    discountPercent: '0.00',
    features: [''],
    isPopular: false,
    isFounderPricing: false,
    isTemporary: false,
    isActive: true,
    sortOrder: 0,
    description: ''
  });

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-green-800">Create New Subscription Tier</CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => onSave(newTier)}
              disabled={isSaving || !newTier.tier || !newTier.displayName}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Create
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="newTier">Tier Code</Label>
            <Input
              id="newTier"
              value={newTier.tier}
              onChange={(e) => setNewTier({...newTier, tier: e.target.value})}
              placeholder="e.g., Platinum Founder"
            />
          </div>
          <div>
            <Label htmlFor="newDisplayName">Display Name</Label>
            <Input
              id="newDisplayName"
              value={newTier.displayName}
              onChange={(e) => setNewTier({...newTier, displayName: e.target.value})}
              placeholder="e.g., Platinum Founder"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="newMonthlyPrice">Monthly Price ($)</Label>
            <Input
              id="newMonthlyPrice"
              type="number"
              step="0.01"
              value={newTier.monthlyPrice}
              onChange={(e) => setNewTier({...newTier, monthlyPrice: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="newAnnualPrice">Annual Price ($)</Label>
            <Input
              id="newAnnualPrice"
              type="number"
              step="0.01"
              value={newTier.annualPrice}
              onChange={(e) => setNewTier({...newTier, annualPrice: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="newDiscountPercent">Product Discount (%)</Label>
            <Input
              id="newDiscountPercent"
              type="number"
              step="0.01"
              value={newTier.discountPercent}
              onChange={(e) => setNewTier({...newTier, discountPercent: e.target.value})}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="newFeatures">Features (one per line)</Label>
          <Textarea
            id="newFeatures"
            rows={4}
            value={newTier.features.join('\n')}
            onChange={(e) => setNewTier({...newTier, features: e.target.value.split('\n').filter(f => f.trim())})}
            placeholder="Enter features, one per line..."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TestTierButton() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const testAllTiers = async () => {
    setIsTesting(true);
    try {
      const response = await apiRequest('POST', '/api/cms/test-subscription-tiers');
      setTestResults(response);
      toast({
        title: "Test Complete",
        description: `Created ${response.length} test accounts for verification`
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test subscription tiers",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={testAllTiers} disabled={isTesting}>
        {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Test All Active Tiers
      </Button>

      {testResults.length > 0 && (
        <div className="mt-4 p-4 bg-white rounded-lg border">
          <h4 className="font-semibold mb-3">Test Results - Verify in Zoho CRM</h4>
          <div className="space-y-2 text-sm">
            {testResults.map((result, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <strong>{result.tier}:</strong> {result.email}
                </div>
                <Badge variant="outline">{result.transactionId}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}