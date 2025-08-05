import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function RegistrationSuccess() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    // Get email from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // If no email in URL, redirect to home
      setLocation("/");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl font-oswald font-bold text-gun-black">
            Registration Successful!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-lg text-gray-700 mb-4">
              Welcome to TheGunFirm.com! Your account has been created successfully.
            </p>
            {email && (
              <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded-md">
                Registration email: <span className="font-medium">{email}</span>
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <Mail className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Verify Your Email Address
                </h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  We've sent a verification email to your inbox. Please check your email and click the verification link to activate your account.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-yellow-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">
                  Don't See the Email?
                </h3>
                <ul className="text-yellow-800 text-sm space-y-1">
                  <li>• Check your spam or junk folder</li>
                  <li>• Make sure you entered the correct email address</li>
                  <li>• The email may take a few minutes to arrive</li>
                  <li>• Add noreply@thegunfirm.com to your contacts</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              What happens after verification?
            </h3>
            <ul className="text-gray-700 text-sm space-y-2">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Access to Bronze member pricing on all items</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Ability to upgrade to Gold/Platinum for better savings</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Secure checkout and order tracking</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>FFL transfer assistance and dealer locator</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button asChild className="flex-1">
              <Link href="/">
                Continue Shopping
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/login">
                Sign In (After Verification)
              </Link>
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact our support team at{" "}
              <a href="mailto:support@thegunfirm.com" className="text-gun-gold hover:underline">
                support@thegunfirm.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}