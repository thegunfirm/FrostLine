import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Mail, User, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SimulationResult {
  success: boolean;
  message: string;
  verificationToken?: string;
  user?: {
    email: string;
    emailVerified: boolean;
    subscriptionTier: string;
  };
}

export default function EmailVerificationSimulator() {
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("Bronze");
  const [simulationSteps, setSimulationSteps] = useState<string[]>([]);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; tier: string }) => {
      const result = await apiRequest("POST", "/api/auth/register", {
        email: data.email,
        password: "TestPassword123!",
        firstName: data.email.split('@')[0].split('.')[0] || "Test",
        lastName: data.email.split('@')[0].split('.')[1] || "User", 
        subscriptionTier: data.tier
      });
      return result.json();
    },
    onSuccess: (data) => {
      setSimulationSteps(prev => [
        ...prev,
        `✅ Registration successful for ${email}`,
        `🎫 Verification token created: ${data.verificationToken?.substring(0, 20)}...`
      ]);
      setVerificationToken(data.verificationToken);
    },
    onError: (error: any) => {
      setSimulationSteps(prev => [
        ...prev,
        `❌ Registration failed: ${error.message}`
      ]);
    }
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch(`/verify-email?token=${token}`, {
        method: 'GET',
        redirect: 'manual'
      });
      return { 
        status: response.status, 
        location: response.headers.get('location'),
        redirected: response.type === 'opaqueredirect'
      };
    },
    onSuccess: (data) => {
      setSimulationSteps(prev => [
        ...prev,
        `✅ Email verification completed! (Status: ${data.status})`,
        `📍 Redirected to: ${data.location || 'login page'}`
      ]);
    },
    onError: (error: any) => {
      setSimulationSteps(prev => [
        ...prev,
        `❌ Email verification failed: ${error.message}`
      ]);
    }
  });

  const loginTestMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/auth/login", {
        email: email,
        password: "TestPassword123!"
      });
      return result.json();
    },
    onSuccess: (data) => {
      setSimulationSteps(prev => [
        ...prev,
        `✅ Login successful! User is verified: ${data.user?.emailVerified}`,
        `👤 User tier: ${data.user?.subscriptionTier}`
      ]);
    },
    onError: (error: any) => {
      setSimulationSteps(prev => [
        ...prev,
        `❌ Login test failed: ${error.message}`
      ]);
    }
  });

  const handleRunSimulation = async () => {
    if (!email.includes('@')) {
      setSimulationSteps(['❌ Please enter a valid email address']);
      return;
    }

    setSimulationSteps([
      `🧪 Starting email verification simulation for: ${email}`,
      `📧 Selected tier: ${tier}`,
      '=' .repeat(50)
    ]);

    // Step 1: Register user
    registerMutation.mutate({ email, tier });
  };

  const handleVerifyEmail = () => {
    if (verificationToken) {
      setSimulationSteps(prev => [
        ...prev,
        '🔗 Simulating email link click...'
      ]);
      verifyEmailMutation.mutate(verificationToken);
    }
  };

  const handleTestLogin = () => {
    setSimulationSteps(prev => [
      ...prev,
      '🔐 Testing login with verified account...'
    ]);
    loginTestMutation.mutate();
  };

  const handleClearResults = () => {
    setSimulationSteps([]);
    setVerificationToken(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Email Verification Simulator</h1>
        <p className="mt-2 text-gray-600">Test the email verification process without checking your inbox</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Simulation Settings
            </CardTitle>
            <CardDescription>
              Enter test email and subscription tier to simulate the verification process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test Email Address</label>
              <Input
                type="email"
                placeholder="test.user@thegunfirm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subscription Tier</label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bronze">Bronze (Free)</SelectItem>
                  <SelectItem value="Gold Monthly">Gold Monthly ($5/mo)</SelectItem>
                  <SelectItem value="Gold Annually">Gold Annually ($50/yr)</SelectItem>
                  <SelectItem value="Platinum Monthly">Platinum Monthly ($10/mo)</SelectItem>
                  <SelectItem value="Platinum Founder">Platinum Founder ($50/yr)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-4">
              <Button 
                onClick={handleRunSimulation}
                disabled={registerMutation.isPending}
                className="w-full"
              >
                {registerMutation.isPending ? 'Registering...' : '1. Start Simulation'}
              </Button>

              <Button
                onClick={handleVerifyEmail}
                disabled={!verificationToken || verifyEmailMutation.isPending}
                variant="outline"
                className="w-full"
              >
                {verifyEmailMutation.isPending ? 'Verifying...' : '2. Simulate Email Click'}
              </Button>

              <Button
                onClick={handleTestLogin}
                disabled={loginTestMutation.isPending}
                variant="outline"
                className="w-full"
              >
                {loginTestMutation.isPending ? 'Testing...' : '3. Test Login'}
              </Button>

              <Button
                onClick={handleClearResults}
                variant="ghost"
                className="w-full"
              >
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Simulation Results
            </CardTitle>
            <CardDescription>
              Real-time results of the email verification simulation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              {simulationSteps.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Enter an email address and click "Start Simulation" to begin
                </p>
              ) : (
                <div className="space-y-2 font-mono text-sm">
                  {simulationSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      {step.startsWith('✅') && <Badge variant="secondary" className="text-green-600">Success</Badge>}
                      {step.startsWith('❌') && <Badge variant="destructive">Error</Badge>}
                      {step.startsWith('🧪') && <Badge variant="outline">Info</Badge>}
                      <span className={`${step.startsWith('=') ? 'text-gray-400' : ''}`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {verificationToken && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Verification Token Generated:</strong>
                  <br />
                  <code className="text-xs break-all">{verificationToken}</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            How This Simulation Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">1. Registration</h4>
              <p className="text-gray-600">
                Creates a pending user account and generates a verification token (normally sent via email)
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. Email Verification</h4>
              <p className="text-gray-600">
                Simulates clicking the email link by using the token directly, marking the account as verified
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3. Login Test</h4>
              <p className="text-gray-600">
                Confirms the account is fully functional by attempting to log in with the verified account
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}