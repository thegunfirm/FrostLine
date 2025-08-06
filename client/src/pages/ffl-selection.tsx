import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { SubscriptionEnforcement } from "@/components/auth/subscription-enforcement";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, ArrowLeft, ArrowRight, Star, Shield, AlertTriangle } from "lucide-react";
import { FflSelector } from "@/components/checkout/ffl-selector";

// Upgrade Benefits Component
function UpgradeBenefits({ user }: { user: any }) {
  const { getTotalPrice } = useCart();
  const [, setLocation] = useLocation();
  
  if (!user) return null;

  const currentTier = user.membershipTier || 'bronze';
  const totalPrice = getTotalPrice();
  
  // Calculate savings based on tier
  const bronzeDiscount = 0;
  const goldDiscount = 0.05; // 5%
  const platinumDiscount = 0.15; // 15%
  
  const currentSavings = currentTier === 'platinum' ? totalPrice * platinumDiscount :
                        currentTier === 'gold' ? totalPrice * goldDiscount : 0;
  
  const potentialSavings = totalPrice * platinumDiscount;
  const additionalSavings = potentialSavings - currentSavings;

  // Safety check for NaN values
  if (isNaN(totalPrice) || isNaN(currentSavings) || isNaN(potentialSavings) || isNaN(additionalSavings)) {
    return null;
  }

  const handleUpgrade = () => {
    // Store current location to return after upgrade
    sessionStorage.setItem('checkout_return_url', '/ffl-selection');
    setLocation('/membership');
  };

  if (currentTier === 'platinum') {
    return (
      <Alert className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
        <Star className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="flex items-center justify-between">
            <span>
              <strong>Platinum Member Benefits:</strong> You're saving ${currentSavings.toFixed(2)} on this order with your 15% discount!
            </span>
            <div className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-xs font-medium">
              Premium Member
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <Star className="w-4 h-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="flex items-center justify-between">
          <div>
            {currentTier === 'gold' ? (
              <>
                <strong>Gold Member:</strong> You're saving ${currentSavings.toFixed(2)} on this order. 
                Upgrade to Platinum and save an additional ${additionalSavings.toFixed(2)}!
              </>
            ) : (
              <>
                <strong>Upgrade to Platinum:</strong> Save ${potentialSavings.toFixed(2)} on this order with 15% off everything!
              </>
            )}
          </div>
          <Button 
            onClick={handleUpgrade}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Upgrade Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function FflSelectionPageContent() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedFfl, setSelectedFfl] = useState<number | null>(() => {
    // Initialize from sessionStorage if available
    const stored = sessionStorage.getItem('selected_ffl_id');
    return stored ? parseInt(stored) : null;
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFflSelected = (fflId: number | null) => {
    setSelectedFfl(fflId);
    // Store selected FFL in session storage for checkout process
    if (fflId) {
      sessionStorage.setItem('selected_ffl_id', fflId.toString());
    } else {
      sessionStorage.removeItem('selected_ffl_id');
    }
  };

  const handleContinueToShipping = async () => {
    if (!selectedFfl) return;
    
    setIsProcessing(true);
    
    try {
      // Store FFL selection and proceed to shipping
      sessionStorage.setItem('selected_ffl_id', selectedFfl.toString());
      setLocation('/shipping');
    } catch (error) {
      console.error('Error proceeding to shipping:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/order-summary')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Order Summary
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">FFL Dealer Selection</h1>
        <p className="text-gray-600 mt-2">This order requires an FFL dealer. Enter a ZIP code or the name of the FFL you wish to use.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FFL Selection */}
        <div className="lg:col-span-2">
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>FFL Transfer Required:</strong> Your order contains firearms that must be shipped to a Federal Firearms Licensed (FFL) dealer. 
              You will pick up your items at the selected dealer and complete the background check process.
            </AlertDescription>
          </Alert>

          <FflSelector
            selectedFflId={selectedFfl}
            onFflSelected={handleFflSelected}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upgrade Benefits */}
          <UpgradeBenefits user={user} />
          
          {/* Continue Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleContinueToShipping}
                disabled={!selectedFfl || isProcessing}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                size="lg"
              >
                {isProcessing ? (
                  'Processing...'
                ) : selectedFfl ? (
                  <>
                    Continue to Shipping <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  'Select FFL to Continue'
                )}
              </Button>
              
              {selectedFfl && (
                <p className="text-sm text-green-600 mt-2 text-center">
                  FFL dealer selected - ready to proceed
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* FFL Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                About FFL Dealers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>On File:</strong> RSR partner dealers with established accounts</span>
              </div>
              <div className="flex items-start gap-2">
                <Building className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span><strong>Not On File:</strong> ATF licensed dealers requiring verification</span>
              </div>
              <div className="flex items-start gap-2">
                <Star className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span><strong>Preferred:</strong> Staff-recommended dealers with excellent service</span>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> You'll complete the background check and pick up your items at the selected FFL dealer. 
                  Transfer fees vary by dealer (typically $15-50).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function FflSelection() {
  return (
    <SubscriptionEnforcement>
      <FflSelectionPageContent />
    </SubscriptionEnforcement>
  );
}