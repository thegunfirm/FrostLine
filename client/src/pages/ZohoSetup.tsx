import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface ZohoStatus {
  authenticated: boolean;
  user?: string;
  message: string;
  authUrl?: string;
  clientId?: string;
  error?: string;
}

export default function ZohoSetup() {
  const [status, setStatus] = useState<ZohoStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/zoho/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        authenticated: false,
        message: 'Failed to check status',
        error: 'Network error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const startAuth = () => {
    window.location.href = '/api/zoho/auth';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Checking Zoho status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Zoho CRM Setup</h1>
        <p className="text-muted-foreground">
          Configure OAuth authentication for tech@thegunfirm.com
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.authenticated ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600" />
            )}
            Authentication Status
          </CardTitle>
          <CardDescription>
            Current OAuth configuration for Zoho CRM integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            <Badge variant={status?.authenticated ? "default" : "destructive"}>
              {status?.authenticated ? "Connected" : "Not Connected"}
            </Badge>
          </div>
          
          {status?.user && (
            <div className="flex items-center justify-between">
              <span className="font-medium">User:</span>
              <span className="text-sm">{status.user}</span>
            </div>
          )}
          
          {status?.clientId && (
            <div className="flex items-center justify-between">
              <span className="font-medium">Client ID:</span>
              <span className="text-sm font-mono">{status.clientId}</span>
            </div>
          )}
          
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm">{status?.message}</p>
            {status?.error && (
              <p className="text-sm text-destructive mt-1">Error: {status.error}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>OAuth Configuration</CardTitle>
          <CardDescription>
            Application settings for "Webservices App TGF"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="font-medium">Client ID:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded">
                1000.NKOFKR9SBI8FPVMZKTYXN02UIRPB3Z
              </code>
            </div>
            <div>
              <span className="font-medium">Redirect URI:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded">
                https://thegunfirm.com/api/zoho/callback
              </code>
            </div>
            <div>
              <span className="font-medium">JavaScript Domain:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded">
                thegunfirm.com
              </code>
            </div>
            <div>
              <span className="font-medium">Authorized User:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded">
                tech@thegunfirm.com
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {!status?.authenticated ? (
          <Button onClick={startAuth} size="lg" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Authorize tech@thegunfirm.com
          </Button>
        ) : (
          <Button onClick={checkStatus} variant="outline" size="lg" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
        )}
        
        <div className="text-center">
          <Button variant="ghost" onClick={checkStatus} size="sm">
            <RefreshCw className="w-3 h-3 mr-1" />
            Check Status
          </Button>
        </div>
      </div>

      {!status?.authenticated && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2">Setup Instructions:</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Click "Authorize tech@thegunfirm.com" above</li>
              <li>Sign in with your tech@thegunfirm.com credentials</li>
              <li>Authorize the "Webservices App TGF" application</li>
              <li>Copy the tokens from the success page</li>
              <li>Add them to your Replit secrets</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}