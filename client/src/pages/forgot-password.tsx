import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/forgot-password", { email });
      setIsEmailSent(true);
      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-oswald font-bold text-gun-black">
              Check Your Email
            </CardTitle>
            <CardDescription>
              We've sent password reset instructions to {email}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Click the link in your email to reset your password. The link will expire in 1 hour.
            </p>
            
            <div className="space-y-2">
              <Button
                onClick={() => {
                  setIsEmailSent(false);
                  setEmail("");
                }}
                variant="outline"
                className="w-full"
              >
                Try Different Email
              </Button>
              
              <Link href="/login">
                <Button className="w-full bg-gun-gold hover:bg-gun-gold-bright text-gun-black font-medium">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-oswald font-bold text-gun-black">
            Reset Password
          </CardTitle>
          <CardDescription>
            Enter your email address and we'll send you instructions to reset your password
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gun-gold hover:bg-gun-gold-bright text-gun-black font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Instructions"}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-gun-gray-light">Remember your password? </span>
            <Link href="/login" className="text-gun-gold hover:text-gun-gold-bright font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}