import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, TestTube, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TestUser {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  subscriptionTier: string;
}

export default function CreateTestUsers() {
  const [testUsers, setTestUsers] = useState<TestUser[]>([
    {
      email: 'bronze.test@example.com',
      firstName: 'Bronze',
      lastName: 'Tester',
      password: 'testpassword123',
      subscriptionTier: 'Bronze'
    },
    {
      email: 'gold.test@example.com', 
      firstName: 'Gold',
      lastName: 'Tester',
      password: 'testpassword123',
      subscriptionTier: 'Bronze' // Start with Bronze, will upgrade
    },
    {
      email: 'platinum.test@example.com',
      firstName: 'Platinum',
      lastName: 'Tester', 
      password: 'testpassword123',
      subscriptionTier: 'Bronze' // Start with Bronze, will upgrade
    }
  ]);

  const [createdUsers, setCreatedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  // Create test user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: TestUser) => {
      const response = await apiRequest("POST", "/api/auth/create-test-user", userData);
      return response.json();
    },
    onSuccess: (data: any, variables: TestUser) => {
      if (data.success) {
        setCreatedUsers(prev => [...prev, variables.email]);
        toast({
          title: "Test User Created",
          description: `${variables.firstName} ${variables.lastName} has been created in Zoho CRM`,
        });
      } else {
        toast({
          title: "Creation Failed",
          description: data.error || "Failed to create test user",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create test user",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (user: TestUser) => {
    createUserMutation.mutate(user);
  };

  const handleCreateAllUsers = () => {
    testUsers.forEach(user => {
      if (!createdUsers.includes(user.email)) {
        setTimeout(() => {
          createUserMutation.mutate(user);
        }, testUsers.indexOf(user) * 1000); // Stagger requests
      }
    });
  };

  const updateUserData = (index: number, field: keyof TestUser, value: string) => {
    setTestUsers(prev => prev.map((user, i) => 
      i === index ? { ...user, [field]: value } : user
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <UserPlus className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Create Test Users</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Create test users in Zoho CRM for testing the FAP membership tier progression system.
            All users will start with Bronze tier and can be upgraded through the tier test page.
          </p>
        </div>

        {/* Quick Create All Button */}
        <div className="mb-6 text-center">
          <Button
            onClick={handleCreateAllUsers}
            disabled={createUserMutation.isPending}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createUserMutation.isPending ? 'Creating Users...' : 'Create All Test Users'}
          </Button>
        </div>

        {/* Test Users Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testUsers.map((user, index) => (
            <Card key={user.email} className={`${
              createdUsers.includes(user.email) ? 'ring-2 ring-green-500 bg-green-50' : ''
            }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TestTube className="w-5 h-5" />
                    Test User {index + 1}
                  </CardTitle>
                  {createdUsers.includes(user.email) ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Created
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor={`email-${index}`}>Email</Label>
                  <Input
                    id={`email-${index}`}
                    value={user.email}
                    onChange={(e) => updateUserData(index, 'email', e.target.value)}
                    disabled={createdUsers.includes(user.email)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`firstName-${index}`}>First Name</Label>
                    <Input
                      id={`firstName-${index}`}
                      value={user.firstName}
                      onChange={(e) => updateUserData(index, 'firstName', e.target.value)}
                      disabled={createdUsers.includes(user.email)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`lastName-${index}`}>Last Name</Label>
                    <Input
                      id={`lastName-${index}`}
                      value={user.lastName}
                      onChange={(e) => updateUserData(index, 'lastName', e.target.value)}
                      disabled={createdUsers.includes(user.email)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`password-${index}`}>Password</Label>
                  <Input
                    id={`password-${index}`}
                    type="password"
                    value={user.password}
                    onChange={(e) => updateUserData(index, 'password', e.target.value)}
                    disabled={createdUsers.includes(user.email)}
                  />
                </div>

                <div>
                  <Label>Starting Tier</Label>
                  <Badge className="ml-2 bg-orange-100 text-orange-800">
                    {user.subscriptionTier}
                  </Badge>
                </div>

                {!createdUsers.includes(user.email) && (
                  <Button
                    onClick={() => handleCreateUser(user)}
                    disabled={createUserMutation.isPending}
                    className="w-full"
                  >
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                )}

                {createdUsers.includes(user.email) && (
                  <div className="text-center">
                    <p className="text-sm text-green-600 font-medium">✓ User created in Zoho CRM</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Login with these credentials to test tier progression
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <Alert className="mt-8">
          <TestTube className="h-4 w-4" />
          <AlertDescription>
            <strong>Next Steps:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Create the test users above in Zoho CRM</li>
              <li>Go to <a href="/fap-tier-test" className="text-blue-600 underline">/fap-tier-test</a> to test tier progression</li>
              <li>Login with each test user and try upgrading their tiers</li>
              <li>Use Authorize.Net sandbox credit card: <code className="bg-gray-100 px-1 rounded">4111111111111111</code></li>
              <li>Verify tier changes appear in the top-right corner next to user name</li>
              <li>Check Zoho CRM to confirm tier updates are synced</li>
            </ol>
            <p className="mt-2 text-sm text-gray-600">
              All test users start with Bronze (free) tier. They can upgrade to Gold ($5/month) then Platinum ($10/month).
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}