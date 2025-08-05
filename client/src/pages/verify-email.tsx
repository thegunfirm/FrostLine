import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const [location] = useLocation();
  const [, params] = useRoute('/verify-email');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const verified = urlParams.get('verified');
    const email = urlParams.get('email');
    
    if (verified === 'true') {
      setStatus('success');
      setMessage(`Email verification successful! You can now sign in with ${email || 'your account'}.`);
    } else {
      setStatus('error');
      setMessage('Email verification failed. The link may be invalid or expired.');
    }
  }, [location]);

  const handleContinue = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-blue-600" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-600" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-600" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'loading' && (
            <div className="space-y-4">
              <Button 
                onClick={handleContinue} 
                className="w-full"
                variant={status === 'success' ? 'default' : 'outline'}
              >
                {status === 'success' ? 'Sign In Now' : 'Back to Login'}
              </Button>
              {status === 'error' && (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Need help? Contact support or try registering again.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}