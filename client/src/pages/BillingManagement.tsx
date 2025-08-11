import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertTriangle, CheckCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

export default function BillingManagement() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [membershipStatus, setMembershipStatus] = useState<string>('loading');
  const [isUpdatingBilling, setIsUpdatingBilling] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    // Check for billing update success message
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    if (urlParams.get('billing') === 'updated') {
      setShowSuccessMessage(true);
    }
  }, [location]);

  useEffect(() => {
    // Fetch current membership status
    fetchMembershipStatus();
  }, []);

  const fetchMembershipStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/fap/membership-status');
      const data = await response.json();
      setMembershipStatus(data.status || 'Unknown');
    } catch (error) {
      console.error('Error fetching membership status:', error);
      setMembershipStatus('Error');
    }
  };

  const handleUpdateBilling = async () => {
    try {
      setIsUpdatingBilling(true);
      // This will redirect to Authorize.Net hosted billing page
      window.location.href = '/billing/update';
    } catch (error) {
      console.error('Error initiating billing update:', error);
      setIsUpdatingBilling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'past due':
        return (
          <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Past Due
          </Badge>
        );
      case 'suspended':
      case 'canceled':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to manage your billing information</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/fap-membership">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Membership
                </Link>
              </Button>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Billing Management
            </h1>
            <div></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {showSuccessMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-400">
              Your payment method has been updated successfully. Your membership is now active.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Status */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Current Membership Status
                </CardTitle>
                <CardDescription>
                  Your FAP membership and billing information
                </CardDescription>
              </div>
              {getStatusBadge(membershipStatus)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Member Details
                </h4>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium">Name:</span> {user.firstName} {user.lastName}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  <p><span className="font-medium">Tier:</span> {user.subscriptionTier || 'Not Set'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Billing Status
                </h4>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium">Status:</span> {membershipStatus}</p>
                  <p><span className="font-medium">Last Update:</span> {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Issues Alert */}
        {(membershipStatus === 'Past Due' || membershipStatus === 'Suspended') && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-400">
              <strong>Action Required:</strong> There's an issue with your payment method. 
              Please update your billing information to restore full access to your membership benefits.
            </AlertDescription>
          </Alert>
        )}

        {/* Billing Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Payment Method</CardTitle>
            <CardDescription>
              Update your payment information securely through our payment processor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex-shrink-0">
                <ExternalLink className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Secure Payment Management
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You'll be redirected to our secure payment processor (Authorize.Net) to update your 
                  payment method. We don't store your card details for your security.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleUpdateBilling}
                disabled={isUpdatingBilling}
                className="flex-1"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {isUpdatingBilling ? 'Redirecting...' : 'Update Payment Method'}
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>• Updates are processed immediately</p>
              <p>• You'll be returned to this page after updating</p>
              <p>• Your membership will be reactivated automatically</p>
            </div>
          </CardContent>
        </Card>

        {/* Support Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              Contact our support team for billing assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p><span className="font-medium">Email:</span> support@thegunfirm.com</p>
              <p><span className="font-medium">Response Time:</span> Within 24 hours</p>
              <p className="text-xs">
                Include your membership email address when contacting support for faster assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}