import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

type VerificationState = 'verifying' | 'success' | 'error' | 'invalid';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [verificationState, setVerificationState] = useState<VerificationState>('verifying');
  const [message, setMessage] = useState<string>('');
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      setVerificationState('invalid');
      setMessage('No verification token provided');
      return;
    }
    
    verifyEmail(token);
  }, []);
  
  const verifyEmail = async (token: string) => {
    try {
      const response = await apiRequest('GET', `/api/auth/verify-email?token=${token}`);
      const data = await response.json();
      
      if (data.success) {
        setVerificationState('success');
        setMessage(data.message || 'Email verified successfully!');
      } else {
        setVerificationState('error');
        setMessage(data.message || 'Email verification failed');
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      setVerificationState('error');
      setMessage(error.message || 'Email verification failed. Please try again.');
    }
  };
  
  const handleContinue = () => {
    setLocation('/login');
  };
  
  const renderContent = () => {
    switch (verificationState) {
      case 'verifying':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
              <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-300 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Verifying Your Email
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Please wait while we verify your email address...
            </CardDescription>
          </div>
        );
        
      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-300" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Email Verified!
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mb-6">
              Your account is now active and ready to use
            </CardDescription>
            
            <Alert className="mb-6" variant="default">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                  Welcome to The Gun Firm!
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  You can now sign in to access tier-based pricing, secure checkout, and order tracking.
                </p>
              </div>
              
              <Button onClick={handleContinue} className="w-full">
                Sign In to Your Account
              </Button>
            </div>
          </div>
        );
        
      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-300" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Verification Failed
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn't verify your email address
            </CardDescription>
            
            <Alert className="mb-6" variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                  What can you do?
                </p>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                  <li>• Check if the verification link has expired</li>
                  <li>• Try registering again with a valid email</li>
                  <li>• Contact support if problems persist</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <Button onClick={() => setLocation('/register')} variant="outline" className="flex-1">
                  Register Again
                </Button>
                <Button onClick={() => setLocation('/login')} className="flex-1">
                  Back to Login
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 'invalid':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Mail className="h-8 w-8 text-gray-600 dark:text-gray-300" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Invalid Link
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mb-6">
              This verification link is not valid
            </CardDescription>
            
            <Alert className="mb-6" variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Please check your email for a valid verification link, or register again if needed.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <Button onClick={() => setLocation('/register')} variant="outline" className="flex-1">
                  Register
                </Button>
                <Button onClick={() => setLocation('/login')} className="flex-1">
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          {renderContent()}
        </CardHeader>
      </Card>
    </div>
  );
}