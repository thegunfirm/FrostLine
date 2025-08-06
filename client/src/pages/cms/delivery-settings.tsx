import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, Truck, Shield, Package, Save } from "lucide-react";

interface DeliveryTimeSetting {
  id: number;
  fulfillmentType: string;
  estimatedDays: string;
  description: string | null;
  isActive: boolean;
  updatedAt: string;
}

const fulfillmentTypeLabels = {
  'drop_to_ffl': {
    label: 'Drop to FFL',
    icon: Shield,
    description: 'Items that come to us first before shipping to FFL dealer',
    example: 'Glock, Smith & Wesson, Sig Sauer firearms'
  },
  'no_drop_to_ffl': {
    label: 'Direct to FFL',
    icon: Truck,
    description: 'Items that ship directly from distributor to FFL dealer',
    example: 'Most other firearms and accessories'
  },
  'drop_to_consumer': {
    label: 'Direct to Consumer',
    icon: Package,
    description: 'Items that ship directly to customer',
    example: 'Accessories, ammunition, parts'
  }
};

export default function DeliverySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingSettings, setEditingSettings] = useState<Record<number, DeliveryTimeSetting>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/admin/delivery-time-settings'],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DeliveryTimeSetting> }) => {
      return apiRequest("PUT", `/api/admin/delivery-time-settings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-time-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-time-settings'] });
      toast({
        title: "Settings Updated",
        description: "Delivery time settings have been updated successfully.",
      });
      setEditingSettings({});
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update delivery time settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (setting: DeliveryTimeSetting) => {
    setEditingSettings(prev => ({
      ...prev,
      [setting.id]: { ...setting }
    }));
  };

  const handleSave = (id: number) => {
    const editedSetting = editingSettings[id];
    if (!editedSetting) return;

    updateMutation.mutate({
      id,
      data: {
        estimatedDays: editedSetting.estimatedDays,
        description: editedSetting.description,
        isActive: editedSetting.isActive,
      }
    });
  };

  const handleCancel = (id: number) => {
    setEditingSettings(prev => {
      const newSettings = { ...prev };
      delete newSettings[id];
      return newSettings;
    });
  };

  const updateEditingSetting = (id: number, field: keyof DeliveryTimeSetting, value: any) => {
    setEditingSettings(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Delivery Time Settings</h1>
        <p className="text-gray-600">
          Configure estimated delivery times for different fulfillment types. These are displayed to customers during checkout.
        </p>
      </div>

      <div className="grid gap-6">
        {settings?.map((setting: DeliveryTimeSetting) => {
          const typeInfo = fulfillmentTypeLabels[setting.fulfillmentType as keyof typeof fulfillmentTypeLabels];
          const isEditing = editingSettings[setting.id];
          const IconComponent = typeInfo?.icon || Clock;

          return (
            <Card key={setting.id} className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconComponent className="w-5 h-5 text-amber-600" />
                    <div>
                      <span className="text-lg">{typeInfo?.label || setting.fulfillmentType}</span>
                      <p className="text-sm font-normal text-gray-600 mt-1">
                        {typeInfo?.description}
                      </p>
                      {typeInfo?.example && (
                        <p className="text-xs text-gray-500 mt-1">
                          Examples: {typeInfo.example}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(setting)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`days-${setting.id}`}>Estimated Delivery Time</Label>
                    {isEditing ? (
                      <Input
                        id={`days-${setting.id}`}
                        value={isEditing.estimatedDays}
                        onChange={(e) => updateEditingSetting(setting.id, 'estimatedDays', e.target.value)}
                        placeholder="e.g., 7-10 business days"
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded border">
                        {setting.estimatedDays}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`active-${setting.id}`}>Active</Label>
                    {isEditing ? (
                      <Switch
                        id={`active-${setting.id}`}
                        checked={isEditing.isActive}
                        onCheckedChange={(checked) => updateEditingSetting(setting.id, 'isActive', checked)}
                      />
                    ) : (
                      <Switch
                        id={`active-${setting.id}`}
                        checked={setting.isActive}
                        disabled
                      />
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`description-${setting.id}`}>Description (shown to customers)</Label>
                  {isEditing ? (
                    <Textarea
                      id={`description-${setting.id}`}
                      value={isEditing.description || ''}
                      onChange={(e) => updateEditingSetting(setting.id, 'description', e.target.value)}
                      placeholder="Brief description of this fulfillment type"
                      rows={2}
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border min-h-[60px]">
                      {setting.description || 'No description'}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => handleSave(setting.id)}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCancel(setting.id)}
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {!isEditing && (
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Last updated: {new Date(setting.updatedAt).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}