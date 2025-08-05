import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Database, Cloud, Clock, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

interface RSRFTPConfig {
  host: string;
  username: string;
  port: number;
  secure: boolean;
  syncSchedule: string;
  autoProcessFiles: boolean;
  downloadImages: boolean;
  downloadHighRes: boolean;
  enabled: boolean;
}

interface RSRSyncStatus {
  lastSync: Date | null;
  nextSync: Date | null;
  isRunning: boolean;
  filesDownloaded: number;
  filesProcessed: number;
  errors: string[];
  lastError: string | null;
  totalProducts: number;
  inventoryUpdates: number;
}

export default function AdminRSRFTP() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [config, setConfig] = useState<Partial<RSRFTPConfig>>({
    host: '',
    username: '63824',
    syncSchedule: '2hours',
    autoProcessFiles: true,
    downloadImages: false,
    downloadHighRes: false,
    enabled: false
  });

  // Fetch RSR FTP status
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['rsr-ftp-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/rsr-ftp/status');
      return response.json();
    },
    enabled: user?.role === 'admin',
    refetchInterval: 10000 // Refetch every 10 seconds
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/rsr-ftp/test');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: data.message,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: "Failed to test RSR FTP connection",
        variant: "destructive",
      });
    }
  });

  // Sync trigger mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/rsr-ftp/sync');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync Started",
        description: "RSR FTP sync has been triggered successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Failed to start RSR FTP sync",
        variant: "destructive",
      });
    }
  });

  // Config update mutation
  const configMutation = useMutation({
    mutationFn: async (newConfig: Partial<RSRFTPConfig>) => {
      const response = await apiRequest('POST', '/api/admin/rsr-ftp/config', newConfig);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "RSR FTP configuration has been saved",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update RSR FTP configuration",
        variant: "destructive",
      });
    }
  });

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center">Access denied. Admin privileges required.</div>;
  }

  const status: RSRSyncStatus = statusData?.status;
  const currentConfig: RSRFTPConfig = statusData?.config;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RSR FTP Management</h1>
          <p className="text-muted-foreground">Configure and monitor RSR Group file-based data feeds</p>
        </div>
        <Badge variant={currentConfig?.enabled ? "default" : "secondary"}>
          {currentConfig?.enabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            {status?.isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.isRunning ? "Running" : "Idle"}
            </div>
            <p className="text-xs text-muted-foreground">
              Last sync: {status?.lastSync ? new Date(status.lastSync).toLocaleString() : "Never"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Processed</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.filesProcessed || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status?.filesDownloaded || 0} downloaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Updates</CardTitle>
            <Cloud className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.inventoryUpdates || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status?.totalProducts || 0} total products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Test connection and trigger manual sync</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending || isLoading}
              variant="outline"
            >
              {testConnectionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>

            <Button 
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || status?.isRunning || !currentConfig?.enabled}
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                "Trigger Sync"
              )}
            </Button>
          </div>

          {status?.errors && status.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600">Recent Errors:</h4>
              {status.errors.slice(-3).map((error, index) => (
                <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>RSR FTP Configuration</CardTitle>
          <CardDescription>Configure connection and sync settings for RSR Group</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host">FTP Host</Label>
              <Input
                id="host"
                value={config.host || currentConfig?.host || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                placeholder="ftp.rsrgroup.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={config.username || currentConfig?.username || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Your RSR account number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={config.password || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Your RSR password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Sync Schedule</Label>
              <Select
                value={config.syncSchedule || currentConfig?.syncSchedule}
                onValueChange={(value) => setConfig(prev => ({ ...prev, syncSchedule: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Only</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="2hours">Every 2 Hours (Recommended)</SelectItem>
                  <SelectItem value="4hours">Every 4 Hours</SelectItem>
                  <SelectItem value="6hours">Every 6 Hours</SelectItem>
                  <SelectItem value="12hours">Every 12 Hours</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={config.enabled ?? currentConfig?.enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor="enabled">Enable RSR FTP Sync</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="autoProcess"
                checked={config.autoProcessFiles ?? currentConfig?.autoProcessFiles}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoProcessFiles: checked }))}
              />
              <Label htmlFor="autoProcess">Auto-process downloaded files</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="downloadImages"
                checked={config.downloadImages ?? currentConfig?.downloadImages}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, downloadImages: checked }))}
              />
              <Label htmlFor="downloadImages">Download product images</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="downloadHighRes"
                checked={config.downloadHighRes ?? currentConfig?.downloadHighRes}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, downloadHighRes: checked }))}
              />
              <Label htmlFor="downloadHighRes">Download high-resolution images</Label>
            </div>
          </div>

          <Button 
            onClick={() => configMutation.mutate(config)}
            disabled={configMutation.isPending}
            className="w-full"
          >
            {configMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Next Sync Info */}
      {status?.nextSync && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Next Scheduled Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">
              {new Date(status.nextSync).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              Schedule: {currentConfig?.syncSchedule?.replace(/(\d+)hours?/, 'Every $1 hours')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}