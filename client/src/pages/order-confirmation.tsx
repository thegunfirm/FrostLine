import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, ShoppingBag } from "lucide-react";

const formatPrice = (price: number | string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numPrice.toFixed(2)}`;
};

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    // Get order data from session storage (set during payment success)
    const storedOrderData = sessionStorage.getItem('lastOrderData');
    if (storedOrderData) {
      setOrderData(JSON.parse(storedOrderData));
      // Clear the data after retrieving it
      sessionStorage.removeItem('lastOrderData');
    } else {
      // If no order data, redirect to home
      setTimeout(() => setLocation('/'), 3000);
    }
  }, [setLocation]);

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-8">
            <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Order Details...</h2>
            <p className="text-gray-600">Please wait while we retrieve your order information.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Success Header */}
          <Card className="mb-8">
            <CardContent className="pt-8 text-center">
              <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
              <p className="text-lg text-gray-600 mb-4">
                Thank you for your purchase. Your order has been successfully processed.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 inline-block">
                <p className="text-sm text-green-800 font-medium">
                  Transaction ID: <span className="font-mono">{orderData.transactionId}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderData.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-start space-x-3 pb-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {item.description || `Item ${index + 1}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      Qty: {item.quantity || 1}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 flex-shrink-0">
                    {formatPrice((item.price || 0) * (item.quantity || 1))}
                  </p>
                </div>
              ))}
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total Paid</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatPrice(orderData.amount / 100)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• You will receive an email confirmation shortly</p>
                <p>• Your order will be processed within 1-2 business days</p>
                <p>• For firearms purchases, items will be shipped to your selected FFL dealer</p>
                <p>• You'll receive tracking information once your order ships</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => setLocation('/')}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Home className="w-4 h-4 mr-2" />
              Continue Shopping
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation('/account/orders')}
              className="flex-1"
            >
              View Order History
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}