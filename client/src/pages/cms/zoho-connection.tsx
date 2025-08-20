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
  ExternalLink,
  File,
  Loader2
} from 'lucide-react';

interface ZohoStatus {
  configured: boolean;
  hasClientId?: boolean;
  hasClientSecret?: boolean;
  redirectUri?: string;
  authUrl?: string;
  timestamp?: string;
  note?: string;
  error?: string;
}

export default function ZohoConnection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Connection Restored",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/zoho/status'] });
        refetch();
      } else {
        toast({
          title: "Upload Failed",
          description: data.error,
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
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Tokens Refreshed",
          description: "Zoho connection has been refreshed successfully",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/zoho/status'] });
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

  const isConnected = status?.configured && !status?.error;
  const hasTokens = status?.configured;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <h1 className="text-2xl font-bold">Zoho CRM Connection</h1>
        <Badge 
          variant={isConnected ? "default" : "destructive"}
          className="text-sm"
        >
          {isConnected ? (
            <>
              <CheckCircle className="mr-1 h-3 w-3" />
              Connected
            </>
          ) : (
            <>
              <AlertCircle className="mr-1 h-3 w-3" />
              Disconnected
            </>
          )}
        </Badge>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Connection Status
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
              Refresh
            </Button>
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
                  <p className="text-sm text-muted-foreground">
                    {isConnected ? "Connected and working" : "Not connected"}
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
          {/* File Upload Section */}
          <div className="space-y-2">
            <Label>Upload Authorization File</Label>
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
            <div className="text-sm text-muted-foreground space-y-1">
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

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <File className="h-5 w-5 mr-2" />
            File Upload Instructions
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