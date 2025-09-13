import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, ShoppingBag, Shield } from "lucide-react";
import { OrderStatusProgress } from "@/components/OrderStatusProgress";

const formatPrice = (price: number | string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numPrice.toFixed(2)}`;
};

interface OrderSummaryResponse {
  orderId: string;
  baseNumber: string;
  displayNumber: string;
  totals: {
    items: number;
    shipping: number;
    tax: number;
    grand: number;
  };
  shipments: Array<{
    suffix?: 'A' | 'B' | 'C' | 'D';
    outcome: string;
    lines: Array<{
      sku: string;
      qty: number;
    }>;
    ffl?: {
      id: string;
    };
  }>;
  createdAt: string;
  customer: {
    email: string | null;
    customerId: string | null;
  };
}

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();
  const [legacyOrderData, setLegacyOrderData] = useState<any>(null);
  const searchString = useSearch();
  
  // Extract orderId from URL parameters
  const urlParams = new URLSearchParams(searchString);
  const orderId = urlParams.get('orderId');

  // Fetch order summary from new API if orderId is present
  const { 
    data: orderSummary, 
    isLoading, 
    error 
  } = useQuery<OrderSummaryResponse>({
    queryKey: ['/api/orders', orderId!, 'summary'],
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // If no orderId, try to get legacy data from session storage
    if (!orderId) {
      const storedOrderData = sessionStorage.getItem('lastOrderData');
      if (storedOrderData) {
        setLegacyOrderData(JSON.parse(storedOrderData));
        // Clear the data after retrieving it
        sessionStorage.removeItem('lastOrderData');
      } else {
        // If no order data at all, redirect to home
        setTimeout(() => setLocation('/'), 3000);
      }
    }
  }, [orderId, setLocation]);

  // Handle loading states
  const isLoadingOrderData = orderId && isLoading;
  const hasNewOrderData = orderId && orderSummary && !error;
  const hasLegacyOrderData = !orderId && legacyOrderData;
  const hasNoOrderData = !isLoadingOrderData && !hasNewOrderData && !hasLegacyOrderData;

  if (isLoadingOrderData) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-8">
            <CheckCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-4">We couldn't find your order details. Please check your order ID or contact support.</p>
            <Button onClick={() => setLocation('/')} className="bg-green-600 hover:bg-green-700">
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasNoOrderData) {
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

  // Use new API data if available, otherwise fall back to legacy data
  const orderData = hasNewOrderData ? transformToLegacyFormat(orderSummary) : legacyOrderData;

  // Transform new API response to legacy format for compatibility
  function transformToLegacyFormat(summary: OrderSummaryResponse): any {
    return {
      orderNumber: summary.displayNumber,
      tgfOrderNumber: summary.displayNumber,
      orderId: summary.orderId,
      transactionId: summary.orderId, // Use orderId as transaction ID for display
      amount: summary.totals.grand * 100, // Convert to cents for legacy format
      orderStatus: 'Processing',
      items: summary.shipments.flatMap(shipment => 
        shipment.lines.map(line => ({
          description: `${line.sku} (${shipment.outcome})`,
          name: line.sku,
          quantity: line.qty,
          price: 0, // Pricing not available in summary format
          requiresFFL: shipment.outcome.includes('FFL')
        }))
      ),
      totals: summary.totals,
      shipments: summary.shipments,
      createdAt: summary.createdAt,
      hasFirearms: summary.shipments.some(s => s.outcome.includes('FFL'))
    };
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
                Thank you for your purchase. Your payment has been processed successfully.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 inline-block">
                <p className="text-sm text-green-800 font-medium">
                  Transaction ID: <span className="font-mono">{orderData.transactionId}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Information */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Order Numbers and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">TGF Order Number</label>
                  <p className="text-lg font-bold text-gray-900">{orderData.orderNumber || orderData.tgfOrderNumber}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Status</label>
                  <p className="text-lg font-semibold text-blue-600">{orderData.orderStatus || 'Processing'}</p>
                </div>
                {orderData.estimatedShipDate && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estimated Ship Date</label>
                    <p className="text-sm font-medium text-gray-900">{orderData.estimatedShipDate}</p>
                  </div>
                )}
                {orderData.fulfillmentType && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fulfillment Type</label>
                    <p className="text-sm font-medium text-gray-900">{orderData.fulfillmentType}</p>
                  </div>
                )}
              </div>

              {/* Compliance Status for Firearms */}
              {orderData.holdType && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-medium text-amber-800 mb-2">Compliance Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-amber-600 uppercase tracking-wide">Hold Type</label>
                      <p className="text-sm font-medium text-amber-800">{orderData.holdType}</p>
                    </div>
                    {orderData.holdStartedAt && (
                      <div>
                        <label className="text-xs font-medium text-amber-600 uppercase tracking-wide">Hold Started</label>
                        <p className="text-sm text-amber-700">{orderData.holdStartedAt}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-3">
                  {orderData.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start space-x-3 pb-3 border-b border-gray-200 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {item.description || item.name || `Item ${index + 1}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity || 1}
                        </p>
                        {item.requiresFFL && (
                          <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full mt-1">
                            FFL Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 flex-shrink-0">
                        {formatPrice((item.price || 0) * (item.quantity || 1))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
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

          {/* Order Status Progress */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusProgress
                orderStatus={orderData.orderStatus || 'Processing'}
                pipelineStage={orderData.pipelineStage || 'Qualification'}
                holdType={orderData.holdType}
                holdStartedAt={orderData.holdStartedAt}
                holdClearedAt={orderData.holdClearedAt}
                estimatedShipDate={orderData.estimatedShipDate}
                carrier={orderData.carrier}
                trackingNumber={orderData.trackingNumber}
              />
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

          {/* Firearms Processing Notice */}
          {orderData.hasFirearms && (
            <Card className="mb-8 border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Shield className="w-5 h-5" />
                  Firearms Processing Notice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-amber-800">
                  <p className="font-medium">
                    ✅ Payment has been charged to your card immediately
                  </p>
                  <p>
                    🏪 Your order contains firearms that require FFL verification before processing with our distributor (RSR)
                  </p>
                  <p>
                    📋 Our team will verify your FFL dealer information and then release your order for fulfillment
                  </p>
                  <p>
                    📧 You'll receive email updates as your order progresses through verification and shipping
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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