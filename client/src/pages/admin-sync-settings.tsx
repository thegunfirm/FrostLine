import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, Clock, Database } from "lucide-react";

export default function AdminSyncSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [frequency, setFrequency] = useState("2");
  const [enabled, setEnabled] = useState(true);

  // Fetch current RSR sync status
  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/admin/rsr/sync-status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch all system settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
  });

  // Update sync frequency mutation
  const updateFrequencyMutation = useMutation({
    mutationFn: async (data: { frequency: string; enabled: boolean }) => {
      const response = await apiRequest("POST", "/api/admin/settings/rsr-sync-frequency", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rsr/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Settings Updated",
        description: "RSR sync frequency has been updated successfully",
      });
    },
    onError: (error) => {
      console.error("Failed to update sync frequency:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update sync frequency. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateFrequency = () => {
    updateFrequencyMutation.mutate({ frequency, enabled });
  };

  // Get current settings from database
  const rsrFrequencySetting = settings?.find((s: any) => s.key === "rsr_sync_frequency");
  const rsrEnabledSetting = settings?.find((s: any) => s.key === "rsr_sync_enabled");

  const currentFrequency = rsrFrequencySetting?.value || "2";
  const currentEnabled = rsrEnabledSetting?.value === "true";

  if (statusLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">RSR Sync Settings</h1>
      </div>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Current Sync Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={syncStatus?.isScheduled ? "default" : "secondary"}>
                  {syncStatus?.isScheduled ? "Running" : "Stopped"}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Frequency</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{currentFrequency} hours</span>
              </div>
            </div>
          </div>
          
          {syncStatus?.lastSync && (
            <div>
              <Label className="text-sm font-medium">Last Sync</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(syncStatus.lastSync).toLocaleString()}
              </p>
            </div>
          )}
          
          {syncStatus?.nextSync && (
            <div>
              <Label className="text-sm font-medium">Next Sync</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(syncStatus.nextSync).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configure RSR Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="sync-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="sync-enabled">Enable RSR Auto-Sync</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Sync Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every 1 hour</SelectItem>
                <SelectItem value="2">Every 2 hours (Recommended)</SelectItem>
                <SelectItem value="4">Every 4 hours</SelectItem>
                <SelectItem value="6">Every 6 hours</SelectItem>
                <SelectItem value="8">Every 8 hours</SelectItem>
                <SelectItem value="12">Every 12 hours</SelectItem>
                <SelectItem value="24">Daily (24 hours)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              RSR recommends updating inventory every 2 hours for optimal performance.
            </p>
          </div>

          <Button 
            onClick={handleUpdateFrequency}
            disabled={updateFrequencyMutation.isPending}
            className="w-full"
          >
            {updateFrequencyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Sync Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>About RSR Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>2-hour frequency:</strong> Recommended by RSR for optimal inventory accuracy and cost efficiency.
            </p>
            <p>
              <strong>Incremental sync:</strong> Only updates products that have changed, typically 50-500 items per cycle.
            </p>
            <p>
              <strong>Total catalog:</strong> Monitoring 29,887 authentic RSR products for inventory and pricing changes.
            </p>
            <p>
              <strong>Cost optimization:</strong> 2-hour incremental updates use less resources than daily full syncs.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}