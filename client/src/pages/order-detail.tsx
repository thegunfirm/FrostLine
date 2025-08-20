import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { DetailedOrderSummary } from "@/components/DetailedOrderSummary";

export default function OrderDetailPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/order/:orderNumber");
  const orderNumber = params?.orderNumber;

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ['/api/orders/unified', orderNumber],
    enabled: !!orderNumber,
    retry: 1,
  });

  const handleBackToOrders = () => {
    setLocation('/account/orders');
  };

  if (!orderNumber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Order</h2>
            <p className="text-gray-600 mb-6">No order number was provided.</p>
            <Button onClick={() => setLocation('/account/orders')}>
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin mr-3" />
                  <span className="text-lg">Loading order details from Zoho CRM...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Button 
                variant="ghost" 
                onClick={handleBackToOrders}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Button>
            </div>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-800 mb-2">Order Not Found</h2>
                <p className="text-red-700 mb-6">
                  We couldn't find an order with number "{orderNumber}". 
                  The order may not exist or may not have been synchronized to our system yet.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={handleBackToOrders} variant="outline">
                    View All Orders
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={handleBackToOrders}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-600 mt-2">
              Complete information for order {orderNumber}
            </p>
          </div>

          {/* Detailed Order Summary */}
          <DetailedOrderSummary orderData={orderData} />

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button onClick={handleBackToOrders} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
            {orderData.trackingNumber && (
              <Button 
                onClick={() => {
                  // Open tracking in new window - this would need to be customized based on carrier
                  window.open(`https://www.ups.com/track?tracknum=${orderData.trackingNumber}`, '_blank');
                }}
                variant="outline"
              >
                Track Shipment
              </Button>
            )}
            <Button 
              onClick={() => window.print()}
              variant="outline"
            >
              Print Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}