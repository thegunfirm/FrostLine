import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  RefreshCw, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  File,
  Loader2
} from 'lucide-react';

interface ZohoStatus {
  configured?: boolean;
  hasClientId?: boolean;
  hasClientSecret?: boolean;
  redirectUri?: string;
  authUrl?: string;
  timestamp?: string;
  note?: string;
  error?: string;
  // Properties from the actual server response
  status?: string;
  hasToken?: boolean;
  tokenLength?: number;
  automaticRefresh?: boolean;
  message?: string;
}

export default function ZohoConnection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTimestamp, setUploadTimestamp] = useState<Date | null>(null);

  // Fetch Zoho connection status
  const { data: status, isLoading, refetch } = useQuery<ZohoStatus>({
    queryKey: ['/api/zoho/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Upload token file mutation
  const uploadTokensMutation = useMutation({
    mutationFn: async (tokenData: any) => {
      const response = await apiRequest('POST', '/api/zoho/upload-tokens', tokenData);
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.success) {
        toast({
          title: "Connection Restored",
          description: data.message,
        });
        
        // Force immediate cache invalidation and refetch
        queryClient.invalidateQueries({ queryKey: ['/api/zoho/status'] });
        
        // Wait a moment for server state to settle, then refetch
        setTimeout(async () => {
          await refetch();
        }, 500);
      } else {
        const errorMessage = data.helpText ? 
          `${data.error}. ${data.helpText}` : 
          data.error || "Upload failed";
          
        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload token file",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Refresh token mutation
  const refreshTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/zoho/refresh-token');
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.success) {
        toast({
          title: "Tokens Refreshed",
          description: "Zoho connection has been refreshed successfully",
        });
        
        // Force immediate cache invalidation and refetch
        queryClient.invalidateQueries({ queryKey: ['/api/zoho/status'] });
        
        // Wait a moment for server state to settle, then refetch
        setTimeout(async () => {
          await refetch();
        }, 500);
      } else {
        toast({
          title: "Refresh Failed",
          description: data.error || "Failed to refresh tokens",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Refresh Error",
        description: error.message || "Failed to refresh tokens",
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      toast({
        title: "Invalid File",
        description: "Please upload a JSON file containing Zoho authorization data",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileContent = await file.text();
      const tokenData = JSON.parse(fileContent);

      // Validate required fields
      if (!tokenData.client_id || !tokenData.client_secret || !tokenData.code) {
        throw new Error('Missing required fields: client_id, client_secret, and code are required');
      }

      uploadTokensMutation.mutate(tokenData);
    } catch (error: any) {
      setIsUploading(false);
      toast({
        title: "File Processing Error",
        description: error.message || "Failed to process uploaded file",
        variant: "destructive",
      });
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fix connection detection logic based on actual server response
  const isConnected = status?.status === "working" && status?.hasToken;
  const hasTokens = status?.hasToken;
  
  // Debug logging to see what we're getting
  console.log('Status check:', { status, isConnected, hasTokens });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <h1 className="text-2xl font-bold">Zoho CRM Connection</h1>
        <Badge 
          variant={isConnected ? "default" : "destructive"}
          className={`text-sm ${isConnected ? 'text-green-700 border-green-300 bg-green-50' : 'text-red-700 border-red-300 bg-red-50'}`}
        >
          {isConnected ? (
            <>
              <CheckCircle className="mr-1 h-3 w-3 text-green-600" />
              <span className="text-green-700 font-medium">Connected and working</span>
            </>
          ) : (
            <>
              <AlertCircle className="mr-1 h-3 w-3 text-red-600" />
              <span className="text-red-700 font-medium">Disconnected</span>
            </>
          )}
        </Badge>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Connection Status
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Check Now
              </Button>
              
              {hasTokens && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshTokenMutation.mutate()}
                  disabled={refreshTokenMutation.isPending}
                >
                  {refreshTokenMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh Tokens
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Monitor your Zoho CRM integration status and manage authentication tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                    {isConnected ? "✓ Connected and working" : "✗ Not connected"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Checked</Label>
                  <p className="text-sm text-muted-foreground">
                    {status?.timestamp ? new Date(status.timestamp).toLocaleString() : "Never"}
                  </p>
                </div>
              </div>

              {status?.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Connection Error:</strong> {status.error}
                  </AlertDescription>
                </Alert>
              )}

              {!isConnected && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Authorization Required:</strong> Click "Authorize Zoho Access" below to grant CRM integration permissions.
                  </AlertDescription>
                </Alert>
              )}

              {status?.note && (
                <Alert>
                  <AlertDescription>
                    {status.note}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Management Card */}
      <Card>
        <CardHeader>
          <CardTitle>Token Management</CardTitle>
          <CardDescription>
            Upload authorization files or refresh existing tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Direct OAuth Authorization */}
          <div className="space-y-2">
            <Label>Direct Authorization</Label>
            <Button
              onClick={() => window.open('/api/zoho/auth/initiate', '_blank')}
              className="w-full"
              variant="default"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Authorize Zoho Access
            </Button>
            <p className="text-xs text-muted-foreground">
              Opens Zoho OAuth in new window with correct permissions. Complete authorization then return here.
            </p>
          </div>

          {/* File Upload Section */}
          <div className="space-y-2">
            <Label>Upload Authorization File (Alternative)</Label>
            <div className="flex items-center space-x-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? "Uploading..." : "Browse"}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700">Important: Authorization codes expire in 5-10 minutes!</p>
                  <p>You must upload the JSON file immediately after generating the authorization code.</p>
                </div>
              </div>
              <p>Upload a JSON file with the following format:</p>
              <pre className="bg-muted p-2 rounded text-xs font-mono">
{`{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret", 
  "code": "authorization_code",
  "grant_type": "authorization_code"
}`}
              </pre>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {hasTokens && (
              <Button
                onClick={() => refreshTokenMutation.mutate()}
                disabled={refreshTokenMutation.isPending}
                variant="outline"
              >
                {refreshTokenMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh Tokens
              </Button>
            )}
            
            {!isConnected && status?.authUrl && (
              <Button asChild>
                <a href={status.authUrl} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Authorize Zoho
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Setup Guide Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
            Quick Setup Guide - Act Fast!
          </CardTitle>
          <CardDescription className="text-orange-600 font-medium">
            Authorization codes expire in exactly 10 minutes. Follow these steps immediately:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <p className="font-medium">Generate Authorization Code</p>
                <p className="text-sm text-muted-foreground">Visit your Zoho app settings and generate a new authorization code</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <p className="font-medium">Download JSON Immediately</p>
                <p className="text-sm text-muted-foreground">Save the file with client_id, client_secret, and code fields</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <p className="font-medium">Upload Within 10 Minutes</p>
                <p className="text-sm text-muted-foreground">Use the upload button above - don't wait!</p>
              </div>
            </div>
          </div>
          
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Time Critical:</strong> If upload fails with "Authorization code expired", click the button below for a fresh code.
            </AlertDescription>
          </Alert>
          
          {!isConnected && (
            <div className="pt-4 border-t">
              <Button 
                asChild 
                size="lg" 
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <a 
                  href="https://api-console.zoho.com/client/1000.EYQE8LR8LWDKQ6YD5CKPC9D0885RUN" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Generate Fresh Authorization Code Now
                </a>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Opens Zoho API console in new tab - generate code and return here immediately
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <File className="h-5 w-5 mr-2" />
            JSON File Format
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>To restore the Zoho connection, upload a JSON file with the following format:</p>
            <pre className="bg-muted p-3 rounded text-xs">
{`{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret", 
  "code": "authorization_code",
  "grant_type": "authorization_code"
}`}
            </pre>
            <div className="space-y-1">
              <p><strong>Where to get this data:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Get the authorization code from Zoho OAuth flow</li>
                <li>Use your registered Zoho app's client ID and secret</li>
                <li>Set grant_type to "authorization_code"</li>
              </ul>
            </div>
            <Alert>
              <AlertDescription>
                Once uploaded, the system will automatically exchange the authorization code for access tokens and restore the connection.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}