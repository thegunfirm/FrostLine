import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Users, Settings } from 'lucide-react';

interface SamlStatusResponse {
  configured: boolean;
  authenticated: boolean;
  authMethod?: string;
  user?: {
    email: string;
    roles: string[];
    loginTime: string;
  };
  endpoints: {
    login: string;
    acs: string;
    metadata: string;
    logout: string;
    status: string;
  };
}

export default function SamlLogin() {
  const [status, setStatus] = useState<SamlStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSamlStatus();
  }, []);

  const checkSamlStatus = async () => {
    try {
      const response = await fetch('/sso/saml/status');
      if (!response.ok) {
        throw new Error('Failed to check SAML status');
      }
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSamlLogin = () => {
    setLoginLoading(true);
    // Redirect to SAML login endpoint
    window.location.href = '/sso/saml/login';
  };

  const handleLogout = () => {
    window.location.href = '/sso/saml/logout';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Checking SAML status...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              SAML Not Configured
            </CardTitle>
            <CardDescription>
              SAML authentication is not properly configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Please contact your system administrator to configure SAML authentication with Zoho Directory.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status.authenticated && status.user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-600" />
              Authenticated
            </CardTitle>
            <CardDescription>
              You are successfully logged in via SAML
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Email
              </label>
              <p className="text-sm">{status.user.email}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Roles
              </label>
              <div className="flex flex-wrap gap-1 mt-1">
                {status.user.roles.map(role => (
                  <span 
                    key={role}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Login Time
              </label>
              <p className="text-sm">{new Date(status.user.loginTime).toLocaleString()}</p>
            </div>
            
            <div className="pt-4 space-y-2">
              <Button 
                onClick={() => window.location.href = '/cms'} 
                className="w-full"
              >
                Access CMS
              </Button>
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                className="w-full"
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center">
            <Users className="h-6 w-6 mr-2" />
            Staff Login
          </CardTitle>
          <CardDescription>
            Sign in with your Zoho Directory account to access the CMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This is a secure staff-only area. You will be redirected to Zoho Directory for authentication.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleSamlLogin}
              disabled={loginLoading}
              className="w-full"
              size="lg"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Sign in with Zoho Directory
                </>
              )}
            </Button>
            
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
              <p>• Multi-factor authentication required</p>
              <p>• Only assigned staff can access</p>
              <p>• Sessions expire after 24 hours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}