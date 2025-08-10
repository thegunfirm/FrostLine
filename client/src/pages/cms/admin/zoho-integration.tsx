import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, ExternalLink, RefreshCw, Users, ShoppingCart } from "lucide-react";

interface ZohoConnectionStatus {
  isConnected: boolean;
  accountName?: string;
  expiresAt?: string;
  scopes?: string[];
  lastSync?: string;
}

export default function ZohoIntegration() {
  const [connectionStatus, setConnectionStatus] = useState<ZohoConnectionStatus>({ isConnected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("GET", "/api/zoho/status");
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error) {
      console.error("Failed to check Zoho connection status:", error);
      setConnectionStatus({ isConnected: false });
    } finally {
      setIsLoading(false);
    }
  };

  const initiateOAuthFlow = async () => {
    try {
      const response = await apiRequest("GET", "/api/zoho/auth/url");
      const data = await response.json();
      
      if (data.authUrl) {
        // Open OAuth URL in new window
        window.open(data.authUrl, 'zoho-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');
        
        // Poll for completion
        const checkInterval = setInterval(async () => {
          try {
            await checkConnectionStatus();
            if (connectionStatus.isConnected) {
              clearInterval(checkInterval);
              toast({
                title: "Zoho Connected",
                description: "Successfully connected to Zoho CRM",
              });
            }
          } catch (error) {
            // Continue polling
          }
        }, 2000);
        
        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(checkInterval), 300000);
      }
    } catch (error) {
      console.error("Failed to initiate OAuth flow:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to start Zoho authentication",
        variant: "destructive",
      });
    }
  };

  const disconnectZoho = async () => {
    try {
      await apiRequest("POST", "/api/zoho/disconnect");
      setConnectionStatus({ isConnected: false });
      toast({
        title: "Zoho Disconnected",
        description: "Successfully disconnected from Zoho CRM",
      });
    } catch (error) {
      console.error("Failed to disconnect from Zoho:", error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect from Zoho CRM",
        variant: "destructive",
      });
    }
  };

  const syncCustomers = async () => {
    try {
      setIsSyncing(true);
      const response = await apiRequest("POST", "/api/zoho/sync/customers");
      const data = await response.json();
      
      toast({
        title: "Customer Sync Complete",
        description: `Synced ${data.synced || 0} customers to Zoho CRM`,
      });
    } catch (error) {
      console.error("Failed to sync customers:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync customers to Zoho CRM",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const testConnection = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("GET", "/api/zoho/test");
      const data = await response.json();
      
      toast({
        title: "Connection Test",
        description: data.success ? "Zoho connection is working properly" : "Zoho connection test failed",
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Failed to test connection:", error);
      toast({
        title: "Test Failed",
        description: "Failed to test Zoho connection",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zoho CRM Integration</h1>
          <p className="text-muted-foreground">Loading connection status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Zoho CRM Integration</h1>
        <p className="text-muted-foreground">
          Manage customer relationships, order tracking, and FFL vendor management through Zoho CRM
        </p>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connectionStatus.isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            Connection Status
          </CardTitle>
          <CardDescription>
            Current status of your Zoho CRM integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={connectionStatus.isConnected ? "default" : "secondary"}>
                {connectionStatus.isConnected ? "Connected" : "Disconnected"}
              </Badge>
              {connectionStatus.accountName && (
                <p className="text-sm text-muted-foreground mt-1">
                  Account: {connectionStatus.accountName}
                </p>
              )}
              {connectionStatus.expiresAt && (
                <p className="text-sm text-muted-foreground">
                  Token expires: {new Date(connectionStatus.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="space-x-2">
              {connectionStatus.isConnected ? (
                <>
                  <Button variant="outline" onClick={testConnection} disabled={isLoading}>
                    Test Connection
                  </Button>
                  <Button variant="destructive" onClick={disconnectZoho}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={initiateOAuthFlow}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect to Zoho
                </Button>
              )}
            </div>
          </div>

          {connectionStatus.scopes && connectionStatus.scopes.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Authorized Scopes:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {connectionStatus.scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="text-xs">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Actions */}
      {connectionStatus.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Data Synchronization
            </CardTitle>
            <CardDescription>
              Sync data between TheGunFirm and Zoho CRM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium">Customer Sync</h3>
                    <p className="text-sm text-muted-foreground">
                      Sync customer data to Zoho contacts
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={syncCustomers}
                  disabled={isSyncing}
                >
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  <div>
                    <h3 className="font-medium">Order Recording</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatic order recording enabled
                    </p>
                  </div>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
            </div>

            {connectionStatus.lastSync && (
              <p className="text-sm text-muted-foreground">
                Last sync: {new Date(connectionStatus.lastSync).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Instructions */}
      {!connectionStatus.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              Follow these steps to connect your Zoho CRM account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Create Zoho App</h4>
                  <p className="text-sm text-muted-foreground">
                    Visit the Zoho Developer Console and create a new app with CRM API access
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Configure OAuth</h4>
                  <p className="text-sm text-muted-foreground">
                    Set your redirect URI and obtain your Client ID and Client Secret
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Add Credentials</h4>
                  <p className="text-sm text-muted-foreground">
                    Add your Zoho app credentials to your environment variables
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <h4 className="font-medium">Connect</h4>
                  <p className="text-sm text-muted-foreground">
                    Click "Connect to Zoho" above to start the OAuth flow
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Required Environment Variables:</Label>
              <div className="bg-muted p-3 rounded-md font-mono text-sm space-y-1">
                <div>ZOHO_CLIENT_ID=your_client_id</div>
                <div>ZOHO_CLIENT_SECRET=your_client_secret</div>
                <div>ZOHO_REDIRECT_URI=your_redirect_uri</div>
                <div>ZOHO_SCOPE=ZohoCRM.modules.ALL</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}