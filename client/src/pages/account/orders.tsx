import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Eye, ChevronRight, Clock, CheckCircle, Truck, AlertCircle, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/pricing-utils";

interface OrderItem {
  id: number;
  description: string;
  quantity: number;
  price: string;
  upc?: string;
  mpn?: string;
}

interface Order {
  id: number;
  rsrOrderNumber?: string;
  createdAt: string;
  status: string;
  totalPrice: string;
  items: OrderItem[];
  authorizeNetTransactionId?: string;
  fflRecipientId?: number;
}

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'processing':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'shipped':
      return <Truck className="w-4 h-4 text-indigo-500" />;
    case 'delivered':
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'cancelled':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Package className="w-4 h-4 text-gray-500" />;
  }
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'processing':
      return 'text-blue-600 bg-blue-50';
    case 'shipped':
      return 'text-indigo-600 bg-indigo-50';
    case 'delivered':
    case 'completed':
      return 'text-green-600 bg-green-50';
    case 'cancelled':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['/api/orders'],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view your order history.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => setLocation('/auth/login')}>
              Log In
            </Button>
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
            <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
            <p className="text-gray-600 mt-2">View and track all your orders</p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load your orders. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {!isLoading && !error && (!orders || orders.length === 0) && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Yet</h3>
                  <p className="text-gray-600 mb-6">Start shopping to see your orders here.</p>
                  <Button onClick={() => setLocation('/')}>
                    Browse Products
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders List */}
          {!isLoading && orders && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order: Order) => {
                const orderNumber = order.rsrOrderNumber || `#${order.id}`;
                const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
                const itemCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;

                return (
                  <Card key={order.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">Order {orderNumber}</CardTitle>
                            {getStatusIcon(order.status)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Placed on {orderDate}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Order Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b">
                          <div>
                            <div className="text-sm text-gray-600">Items</div>
                            <div className="font-semibold">{itemCount} {itemCount === 1 ? 'item' : 'items'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Total</div>
                            <div className="font-semibold flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {formatPrice(parseFloat(order.totalPrice))}
                            </div>
                          </div>
                          {order.fflRecipientId && (
                            <div>
                              <div className="text-sm text-gray-600">Shipping</div>
                              <div className="font-semibold text-sm">Ships to FFL Dealer</div>
                            </div>
                          )}
                        </div>

                        {/* Item Preview */}
                        {order.items && order.items.length > 0 && (
                          <div className="space-y-2">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex-1">
                                  <span className="text-gray-900">{item.description}</span>
                                  <span className="text-gray-500 ml-2">x{item.quantity}</span>
                                </div>
                                <span className="text-gray-700 font-medium">
                                  {formatPrice(parseFloat(item.price) * item.quantity)}
                                </span>
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <div className="text-sm text-gray-500">
                                +{order.items.length - 2} more {order.items.length - 2 === 1 ? 'item' : 'items'}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/order-confirmation?orderId=${order.id}`)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </Button>
                          {(order.status.toLowerCase() === 'shipped' || order.status.toLowerCase() === 'delivered') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Truck className="w-4 h-4" />
                              Track Shipment
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}