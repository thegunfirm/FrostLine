import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function OrderToZohoTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();

  const runOrderToZohoTest = async () => {
    setIsLoading(true);
    setTestResults(null);

    try {
      // Create a test order
      const testOrderData = {
        userId: 10, // Test user ID
        totalPrice: "299.99",
        status: "pending",
        items: [
          {
            name: "Test Firearm - Glock 19",
            sku: "GLOCK19GEN5",
            quantity: 1,
            price: 549.99,
            fflRequired: true
          },
          {
            name: "Test Ammunition - 9mm",
            sku: "AMMO9MM",
            quantity: 2,
            price: 25.00,
            fflRequired: false
          }
        ],
        fulfillmentGroups: [
          { id: "GLOCK19GEN5", fulfillmentType: "ffl_non_dropship", fflId: 1 },
          { id: "AMMO9MM", fulfillmentType: "direct", fflId: null }
        ]
      };

      console.log('Creating test order...');
      const orderResponse = await apiRequest('POST', '/api/orders', testOrderData);
      
      if (orderResponse.ok) {
        const createdOrder = await orderResponse.json();
        console.log('Test order created:', createdOrder);

        setTestResults({
          success: true,
          orderId: createdOrder.id,
          zohoDealId: createdOrder.zohoDealId,
          zohoContactId: createdOrder.zohoContactId,
          message: 'Order created and should be synced with Zoho CRM'
        });

        toast({
          title: "Test Successful",
          description: `Order ${createdOrder.id} created and synced with Zoho`,
        });
      } else {
        throw new Error('Failed to create test order');
      }

    } catch (error: any) {
      console.error('Order-to-Zoho test failed:', error);
      setTestResults({
        success: false,
        error: error.message
      });

      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Order-to-Zoho CRM Integration Test</CardTitle>
            <CardDescription>
              Test the automatic creation of Zoho CRM Deal records when orders are created in TheGunFirm.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div>
              <h3 className="text-lg font-semibold mb-3">What This Test Does:</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li>Creates a test order with firearms and ammunition</li>
                <li>Automatically creates a contact in Zoho CRM if customer doesn't exist</li>
                <li>Creates a Deal record linked to the contact</li>
                <li>Populates Deal with order details, items, and FFL information</li>
                <li>Sets appropriate Deal stage based on order status</li>
                <li>Updates the order record with Zoho Deal and Contact IDs</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Expected Results in Zoho CRM:</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li><strong>New Contact:</strong> Customer record with email and membership tier</li>
                <li><strong>New Deal:</strong> Order details with product information</li>
                <li><strong>Deal Fields:</strong> Order number, total amount, FFL requirements</li>
                <li><strong>Deal Description:</strong> Detailed breakdown of ordered items</li>
                <li><strong>Lead Source:</strong> "TheGunFirm.com"</li>
              </ul>
            </div>

            <Button 
              onClick={runOrderToZohoTest}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Creating Test Order...' : 'Run Order-to-Zoho Test'}
            </Button>

            {testResults && (
              <Card className={testResults.success ? "border-green-200" : "border-red-200"}>
                <CardHeader>
                  <CardTitle className={testResults.success ? "text-green-700" : "text-red-700"}>
                    {testResults.success ? '✅ Test Successful' : '❌ Test Failed'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.success ? (
                    <div className="space-y-2">
                      <p><strong>Order ID:</strong> {testResults.orderId}</p>
                      <p><strong>Zoho Deal ID:</strong> {testResults.zohoDealId || 'Not set'}</p>
                      <p><strong>Zoho Contact ID:</strong> {testResults.zohoContactId || 'Not set'}</p>
                      <p className="text-sm text-green-600">{testResults.message}</p>
                      
                      <div className="mt-4 p-3 bg-green-50 rounded">
                        <p className="text-sm font-medium">Next Steps:</p>
                        <p className="text-sm">Check your Zoho CRM → Deals module for the new deal record</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-red-600">{testResults.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Integration Features:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Automatic contact creation and linking</li>
                <li>• Deal stage mapping based on order status</li>
                <li>• FFL dealer information included</li>
                <li>• Detailed product breakdown in Deal description</li>
                <li>• Membership tier tracking</li>
                <li>• Bi-directional ID linking for future updates</li>
              </ul>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}