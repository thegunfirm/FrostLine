import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, MapPin, CreditCard, Clock, CheckCircle, XCircle, Truck, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const formatPrice = (price: number | string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numPrice.toFixed(2)}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'shipped':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'delivered':
      return 'bg-green-200 text-green-900 border-green-400';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'returned':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'processing':
      return <Package className="w-4 h-4" />;
    case 'shipped':
      return <Truck className="w-4 h-4" />;
    case 'delivered':
      return <CheckCircle className="w-4 h-4" />;
    case 'cancelled':
    case 'returned':
      return <XCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

function OrderCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Order #{order.id}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Placed on {formatDate(order.orderDate)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
              {getStatusIcon(order.status)}
              {order.status}
            </Badge>
            <span className="text-lg font-semibold text-gray-900">
              {formatPrice(order.totalPrice)}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Order Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Items Count */}
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="text-sm">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Payment Method */}
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <span className="text-sm capitalize">
              {order.paymentMethod?.replace('_', ' ') || 'Credit Card'}
            </span>
          </div>

          {/* Transaction ID */}
          {order.authorizeNetTransactionId && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-mono">
                ID: {order.authorizeNetTransactionId}
              </span>
            </div>
          )}
        </div>

        {/* Savings Banner */}
        {order.savingsRealized && parseFloat(order.savingsRealized) > 0 && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <span className="font-semibold">You saved {formatPrice(order.savingsRealized)}</span> on this order with your membership!
            </AlertDescription>
          </Alert>
        )}

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Shipping Address:</p>
              <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
              <p>{order.shippingAddress.address}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
            </div>
          </div>
        )}

        {/* Tracking Number */}
        {order.trackingNumber && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Tracking: {order.trackingNumber}
              </span>
            </div>
          </div>
        )}

        <Separator />

        {/* Order Items Toggle */}
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Order Items ({items.length})</h4>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide Items' : 'Show Items'}
          </Button>
        </div>

        {/* Order Items List */}
        {expanded && items.length > 0 && (
          <div className="space-y-3 bg-gray-50 rounded p-4">
            {items.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {item.description || item.name || 'Product'}
                  </p>
                  <p className="text-xs text-gray-600">
                    Qty: {item.quantity} × {formatPrice(item.price || 0)}
                  </p>
                  {item.requiresFFL && (
                    <Badge variant="outline" className="text-xs mt-1">
                      FFL Required
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">
                    {formatPrice((item.quantity || 1) * (item.price || 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountOrdersContent() {
  const { user } = useAuth();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['/api/user/orders'],
    enabled: !!user
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-300 rounded w-1/3"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Failed to load your orders. Please try refreshing the page or contact support if the problem persists.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Orders</h1>
            <p className="text-gray-600">
              View and track all your orders from The Gun Firm.
            </p>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No orders yet
                </h3>
                <p className="text-gray-600 mb-6">
                  You haven't placed any orders yet. Start shopping to see your orders here.
                </p>
                <Button asChild>
                  <a href="/products">Browse Products</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-6">
                {orders.map((order: any) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountOrdersPage() {
  return <AccountOrdersContent />;
}