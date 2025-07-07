import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, CheckCircle, XCircle, Upload, Settings, Zap } from 'lucide-react';

interface ZohoStatus {
  connected: boolean;
  lastSync?: Date;
  productsInZoho?: number;
  error?: string;
}

interface SyncResult {
  total: number;
  synced: number;
  failed: number;
}

export default function AdminZohoIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  // Get Zoho integration status
  const { data: status, isLoading: statusLoading } = useQuery<ZohoStatus>({
    queryKey: ['/api/zoho/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Sync all products mutation
  const syncAllMutation = useMutation({
    mutationFn: async (batchSize: number = 50) => {
      return apiRequest('POST', '/api/zoho/sync-all', { batchSize });
    },
    onSuccess: (result: SyncResult) => {
      toast({
        title: "Zoho Sync Complete",
        description: `Synced ${result.synced} of ${result.total} products. ${result.failed} failed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/zoho/status'] });
      setSyncProgress(null);
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync products to Zoho",
        variant: "destructive",
      });
      setSyncProgress(null);
    },
  });

  // Setup webhook mutation
  const setupWebhookMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/zoho/setup-webhook'),
    onSuccess: () => {
      toast({
        title: "Webhook Created",
        description: "Zoho webhook has been set up for real-time inventory updates",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Webhook Setup Failed",
        description: error.message || "Failed to create Zoho webhook",
        variant: "destructive",
      });
    },
  });

  const handleSyncAll = () => {
    syncAllMutation.mutate(50);
  };

  const handleSetupWebhook = () => {
    setupWebhookMutation.mutate();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Zoho Integration</h1>
        <p className="text-muted-foreground">
          Sync RSR product data with Zoho CRM/Inventory for seamless business management
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <CardDescription>
              Current Zoho integration status and connectivity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking connection...</span>
              </div>
            ) : status ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {status.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <Badge variant={status.connected ? "default" : "destructive"}>
                    {status.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>

                {status.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{status.error}</p>
                  </div>
                )}

                {status.connected && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Products in Zoho:</span>
                      <span className="font-medium">{status.productsInZoho?.toLocaleString() || 0}</span>
                    </div>
                    {status.lastSync && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Sync:</span>
                        <span className="font-medium">
                          {new Date(status.lastSync).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">Unable to load status</div>
            )}
          </CardContent>
        </Card>

        {/* Sync Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Data Synchronization
            </CardTitle>
            <CardDescription>
              Sync RSR products to Zoho Inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Syncing products...</span>
                  <span>{syncProgress.current} / {syncProgress.total}</span>
                </div>
                <Progress value={(syncProgress.current / syncProgress.total) * 100} />
              </div>
            )}

            <Button
              onClick={handleSyncAll}
              disabled={syncAllMutation.isPending || !status?.connected}
              className="w-full"
            >
              {syncAllMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Products...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Sync All Products to Zoho
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              This will sync all RSR products to your Zoho Inventory system with proper
              categorization and pricing tiers.
            </div>
          </CardContent>
        </Card>

        {/* Webhook Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Real-time Updates
            </CardTitle>
            <CardDescription>
              Set up webhooks for automatic inventory synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleSetupWebhook}
              disabled={setupWebhookMutation.isPending || !status?.connected}
              variant="outline"
              className="w-full"
            >
              {setupWebhookMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up webhook...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Setup Zoho Webhook
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              Creates a webhook in Zoho to automatically sync inventory changes back to 
              your e-commerce platform in real-time.
            </div>
          </CardContent>
        </Card>

        {/* Integration Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Guide</CardTitle>
            <CardDescription>
              Required environment variables for Zoho integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Required Environment Variables:</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• ZOHO_CLIENT_ID</div>
                <div>• ZOHO_CLIENT_SECRET</div>
                <div>• ZOHO_REFRESH_TOKEN</div>
                <div>• ZOHO_REDIRECT_URI</div>
                <div>• ZOHO_API_DOMAIN (optional)</div>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="text-sm font-medium mb-2">Setup Steps:</div>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Create Zoho app in Developer Console</li>
                <li>2. Generate client credentials</li>
                <li>3. Obtain refresh token via OAuth</li>
                <li>4. Add environment variables</li>
                <li>5. Test connection and sync products</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}