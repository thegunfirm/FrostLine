import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock } from "lucide-react";
import { useFapAuth } from "@/hooks/use-fap-auth";

interface SubscriptionEnforcementProps {
  children: React.ReactNode;
  requiredForCheckout?: boolean;
}

export function SubscriptionEnforcement({ children, requiredForCheckout = false }: SubscriptionEnforcementProps) {
  const { user, checkEnforcementSettings } = useFapAuth();
  const [, setLocation] = useLocation();
  const [enforcementSettings, setEnforcementSettings] = useState<{
    subscriptionEnforced: boolean;
    fflSources: { useAtf: boolean; useRsr: boolean };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEnforcementSettings = async () => {
      try {
        const settings = await checkEnforcementSettings();
        setEnforcementSettings(settings);
      } catch (error) {
        console.error("Failed to load enforcement settings:", error);
        // Default to enforced if we can't load settings
        setEnforcementSettings({
          subscriptionEnforced: true,
          fflSources: { useAtf: true, useRsr: true }
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEnforcementSettings();
  }, [checkEnforcementSettings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If enforcement is disabled, allow access
  if (!enforcementSettings?.subscriptionEnforced) {
    return <>{children}</>;
  }

  // If user is not logged in and trying to access checkout
  if (!user && requiredForCheckout) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              You must be logged in with a FreeAmericanPeople account to proceed to checkout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                TheGunFirm requires active membership through FreeAmericanPeople for checkout access
              </AlertDescription>
            </Alert>
            <div className="grid gap-2">
              <Button onClick={() => setLocation("/login?redirect=/checkout")}>
                Login to Continue
              </Button>
              <Button variant="outline" onClick={() => setLocation("/register")}>
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is logged in but hasn't paid for membership and trying to checkout
  if (user && !user.membershipPaid && requiredForCheckout) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <CardTitle>Membership Required</CardTitle>
            <CardDescription>
              You need an active membership to proceed to checkout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Current Status: {user.subscriptionTier} (Unpaid)
                <br />
                Please complete your membership payment to access checkout
              </AlertDescription>
            </Alert>
            <div className="grid gap-2">
              <Button onClick={() => setLocation("/membership")}>
                Complete Membership Payment
              </Button>
              <Button variant="outline" onClick={() => setLocation("/")}>
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User meets all requirements, show content
  return <>{children}</>;
}