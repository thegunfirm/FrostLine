import { useState } from "react";
import { AuthorizeNetForm } from "@/components/payment/authorize-net-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, CreditCard, Users } from "lucide-react";

export default function PaymentTest() {
  const [membershipResults, setMembershipResults] = useState<any>(null);
  const [productResults, setProductResults] = useState<any>(null);
  const [testingMembership, setTestingMembership] = useState(false);
  const [testingProduct, setTestingProduct] = useState(false);

  const handleMembershipSuccess = (result: any) => {
    setMembershipResults({ ...result, success: true });
    setTestingMembership(false);
  };

  const handleMembershipError = (error: any) => {
    setMembershipResults({ ...error, success: false });
    setTestingMembership(false);
  };

  const handleProductSuccess = (result: any) => {
    setProductResults({ ...result, success: true });
    setTestingProduct(false);
  };

  const handleProductError = (error: any) => {
    setProductResults({ ...error, success: false });
    setTestingProduct(false);
  };

  const resetTests = () => {
    setMembershipResults(null);
    setProductResults(null);
    setTestingMembership(false);
    setTestingProduct(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Authorize.Net Payment Testing</h1>
          <p className="text-gray-600 mt-2">
            Test dual payment integration for FAP (memberships) and TGF (products)
          </p>
        </div>
        
        <Button onClick={resetTests} variant="outline">
          Reset Tests
        </Button>
      </div>

      {/* Test Results Summary */}
      {(membershipResults || productResults) && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {membershipResults && (
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                {membershipResults.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">FAP Membership</Badge>
                    <Badge className={membershipResults.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {membershipResults.success ? "SUCCESS" : "FAILED"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {membershipResults.success 
                      ? `Transaction ID: ${membershipResults.transactionId}`
                      : `Error: ${membershipResults.message}`
                    }
                  </p>
                </div>
              </div>
            )}

            {productResults && (
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                {productResults.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-800">TGF Products</Badge>
                    <Badge className={productResults.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {productResults.success ? "SUCCESS" : "FAILED"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {productResults.success 
                      ? `Transaction ID: ${productResults.transactionId}`
                      : `Error: ${productResults.message}`
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="membership" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="membership" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            FAP Membership
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            TGF Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="membership" className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>FAP (FreeAmericanPeople.com)</strong> - Testing membership subscription payments.
              This uses the FAP Authorize.Net account credentials.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => setTestingMembership(true)}>
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-lg">Bronze Membership</h3>
                <p className="text-3xl font-bold text-amber-600 my-2">$29.99</p>
                <p className="text-sm text-gray-600">Basic member benefits</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow border-amber-200 bg-amber-50" 
                  onClick={() => setTestingMembership(true)}>
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-lg">Gold Membership</h3>
                <p className="text-3xl font-bold text-amber-600 my-2">$49.99</p>
                <p className="text-sm text-gray-600">Enhanced pricing & benefits</p>
                <Badge className="mt-2 bg-amber-100 text-amber-800">Popular</Badge>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow border-purple-200 bg-purple-50" 
                  onClick={() => setTestingMembership(true)}>
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-lg">Platinum Membership</h3>
                <p className="text-3xl font-bold text-purple-600 my-2">$99.99</p>
                <p className="text-sm text-gray-600">Maximum savings & perks</p>
                <Badge className="mt-2 bg-purple-100 text-purple-800">Premium</Badge>
              </CardContent>
            </Card>
          </div>

          {testingMembership && (
            <AuthorizeNetForm
              paymentType="fap"
              amount={49.99}
              membershipTier="Gold"
              onPaymentSuccess={handleMembershipSuccess}
              onPaymentError={handleMembershipError}
              isProcessing={testingMembership}
            />
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>TGF (TheGunFirm.com)</strong> - Testing product purchase payments.
              This uses the TGF Authorize.Net account credentials.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => setTestingProduct(true)}>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg">Sample Firearm Purchase</h3>
                <p className="text-2xl font-bold text-green-600 my-2">$599.99</p>
                <p className="text-sm text-gray-600">Test firearm requiring FFL transfer</p>
                <Badge className="mt-2 bg-red-100 text-red-800">Requires FFL</Badge>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => setTestingProduct(true)}>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg">Accessories Bundle</h3>
                <p className="text-2xl font-bold text-green-600 my-2">$199.99</p>
                <p className="text-sm text-gray-600">Holsters, magazines, and gear</p>
                <Badge className="mt-2 bg-green-100 text-green-800">Direct Ship</Badge>
              </CardContent>
            </Card>
          </div>

          {testingProduct && (
            <AuthorizeNetForm
              paymentType="tgf"
              amount={599.99}
              orderDetails={{
                orderId: 'TEST-' + Date.now(),
                items: ['Sample Firearm', 'FFL Transfer Required']
              }}
              onPaymentSuccess={handleProductSuccess}
              onPaymentError={handleProductError}
              isProcessing={testingProduct}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Test Card Information */}
      <Card>
        <CardHeader>
          <CardTitle>Authorize.Net Test Card Numbers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <strong>Visa (Success):</strong><br />
              4111111111111111
            </div>
            <div>
              <strong>Mastercard:</strong><br />
              5424000000000015
            </div>
            <div>
              <strong>American Express:</strong><br />
              378282246310005
            </div>
            <div>
              <strong>Discover:</strong><br />
              6011111111111117
            </div>
          </div>
          <Alert>
            <AlertDescription>
              Use any future expiration date and any 3-4 digit CVV. 
              Card number 4000000000000002 will simulate a declined transaction.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}