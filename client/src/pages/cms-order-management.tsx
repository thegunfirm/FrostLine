import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Package, MapPin, CreditCard, Clock, CheckCircle, XCircle, Truck, FileText, Search, Filter, User } from "lucide-react";
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

interface SearchFilters {
  orderNumber: string;
  customerName: string;
  fflId: string;
  startDate: string;
  endDate: string;
  status: string;
}

function OrderCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);
  const items = Array.isArray(order.items) ? order.items : [];
  const user = order.user;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              Order #{order.id}
              <Badge variant="outline" className="text-xs">
                ID: {order.authorizeNetTransactionId || 'N/A'}
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Placed on {formatDate(order.orderDate)}
            </p>
            
            {/* Customer Information */}
            <div className="flex items-center gap-2 mt-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-sm text-gray-500">
                ({user?.email})
              </span>
              <Badge variant="outline" className="text-xs">
                {user?.subscriptionTier}
              </Badge>
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="text-sm">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <span className="text-sm capitalize">
              {order.paymentMethod?.replace('_', ' ') || 'Credit Card'}
            </span>
          </div>

          {order.ffl && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm">
                FFL: {order.ffl.businessName}
              </span>
            </div>
          )}

          {order.savingsRealized && parseFloat(order.savingsRealized) > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">
                Saved {formatPrice(order.savingsRealized)}
              </span>
            </div>
          )}
        </div>

        {/* FFL Information */}
        {order.ffl && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">FFL Dealer:</p>
                <p className="text-blue-700">{order.ffl.businessName}</p>
                <p className="text-blue-600">
                  {order.ffl.premiseStreet}<br />
                  {order.ffl.premiseCity}, {order.ffl.premiseState} {order.ffl.premiseZipCode}
                </p>
                <p className="text-blue-600">License: {order.ffl.licenseName}</p>
              </div>
            </div>
          </div>
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
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
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
                    SKU: {item.sku || 'N/A'} • Qty: {item.quantity} × {formatPrice(item.price || 0)}
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

export default function CMSOrderManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<SearchFilters>({
    orderNumber: '',
    customerName: '',
    fflId: '',
    startDate: '',
    endDate: '',
    status: 'all'
  });

  const [page, setPage] = useState(1);
  const limit = 20;

  // Check if user has access
  if (!user || !['admin', 'support', 'manager'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="border-red-200 bg-red-50 max-w-md">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Access denied. You need admin, support, or manager privileges to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      queryParams.append(key, value);
    }
  });
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['/api/admin/orders/search', filters, page],
    queryFn: async () => {
      const response = await fetch(`/api/admin/orders/search?${queryParams}`);
      if (!response.ok) throw new Error('Failed to search orders');
      return response.json();
    },
  });

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      orderNumber: '',
      customerName: '',
      fflId: '',
      startDate: '',
      endDate: '',
      status: 'all'
    });
    setPage(1);
  };

  const orders = searchResults?.orders || [];
  const total = searchResults?.total || 0;
  const totalPages = searchResults?.totalPages || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h1>
            <p className="text-gray-600">
              Search and manage customer orders by order number, customer name, FFL, or date.
            </p>
          </div>

          {/* Search Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    placeholder="Enter order ID..."
                    value={filters.orderNumber}
                    onChange={(e) => handleFilterChange('orderNumber', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    placeholder="First or last name..."
                    value={filters.customerName}
                    onChange={(e) => handleFilterChange('customerName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Processing">Processing</SelectItem>
                      <SelectItem value="Shipped">Shipped</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                      <SelectItem value="Returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="fflId">FFL ID</Label>
                  <Input
                    id="fflId"
                    placeholder="FFL dealer ID..."
                    value={filters.fflId}
                    onChange={(e) => handleFilterChange('fflId', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button variant="outline" onClick={clearFilters}>
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
                <div className="text-sm text-gray-600">
                  {total > 0 && `Found ${total} order${total !== 1 ? 's' : ''}`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Failed to load orders. Please try refreshing the page or contact IT support if the problem persists.
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {!isLoading && !error && (
            <>
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No orders found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your search criteria to find orders.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="space-y-6">
                    {orders.map((order: any) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <Button
                        variant="outline"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600 px-4">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}