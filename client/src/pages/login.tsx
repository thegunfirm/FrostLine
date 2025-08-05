import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const { mergeGuestCart } = useCart();

  // Get redirect parameter from URL
  const getRedirectUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') || '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = await login(email, password);
      
      // Merge guest cart with user cart after successful login (login function handles this internally)
      // The mergeGuestCart is already called in the login function
      
      // Navigate to the intended destination (checkout if redirected from cart)
      const redirectUrl = getRedirectUrl();
      setLocation(redirectUrl);
      
      // Show success message if redirecting to checkout
      if (redirectUrl === '/checkout') {
        toast({
          title: "Login Successful",
          description: "Proceeding to checkout with your saved cart.",
          variant: "default",
        });
      }
    } catch (error: any) {
      // Extract clean error message, removing HTTP status codes and JSON formatting
      let errorMessage = error.message || "Login failed. Please try again.";
      
      // If the error message contains JSON, extract just the message field
      if (errorMessage.includes('{"message"') || errorMessage.includes('{"error"')) {
        try {
          // Remove the "401: " prefix if present
          const jsonPart = errorMessage.replace(/^\d+:\s*/, '');
          const errorData = JSON.parse(jsonPart);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, try to extract message with regex
          const messageMatch = errorMessage.match(/"message":"([^"]+)"/);
          if (messageMatch) {
            errorMessage = messageMatch[1];
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-oswald font-bold text-gun-black">
            Sign In
          </CardTitle>
          <CardDescription>
            {getRedirectUrl() === '/checkout' 
              ? 'Sign in to complete your purchase' 
              : 'Use your FreeAmericanPeople account to access TheGunFirm'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-white border-2 border-red-500 rounded-md">
              <p className="text-sm text-gun-black font-medium">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gun-gold hover:bg-gun-gold-bright text-gun-black font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-3">
            <div className="text-sm">
              <Link href="/forgot-password" className="text-gun-gold hover:text-gun-gold-bright font-medium">
                Forgot your password?
              </Link>
            </div>
            <div className="text-sm">
              <span className="text-gun-gray-light">Don't have an account? </span>
              <Link href="/register" className="text-gun-gold hover:text-gun-gold-bright font-medium">
                Sign up
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
