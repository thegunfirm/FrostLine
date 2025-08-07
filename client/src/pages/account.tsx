import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Settings, CreditCard, Package } from "lucide-react";
import { useLocation } from "wouter";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h1>
          <p className="text-gray-600 mb-6">Please log in to view your account.</p>
          <Button onClick={() => setLocation("/login")}>
            Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your account details and membership status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{user.firstName} {user.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Membership Tier</label>
                <div className="flex items-center gap-2">
                  <Badge variant={user.subscriptionTier === 'Platinum' ? 'default' : 
                                user.subscriptionTier === 'Gold' ? 'secondary' : 'outline'}>
                    {user.subscriptionTier}
                  </Badge>
                  {user.membershipPaid && (
                    <Badge variant="outline" className="text-green-600">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Total Savings</label>
                <p className="text-lg font-semibold text-green-600">${user.lifetimeSavings}</p>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Account Actions
              </CardTitle>
              <CardDescription>
                Manage your account and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setLocation("/account/orders")}
              >
                <Package className="w-4 h-4 mr-2" />
                View My Orders
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setLocation("/membership")}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Membership Settings
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setLocation("/cart")}
              >
                <Package className="w-4 h-4 mr-2" />
                View Cart
              </Button>
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}