import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/pricing-utils";
import { format, subDays, parseISO } from "date-fns";
import { Search, Package, Eye, Download, Calendar as CalendarIcon, AlertCircle, Filter, RefreshCw, ChevronLeft, ChevronRight, Clock, CheckCircle, Truck, XCircle, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

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
  userId: number;
  rsrOrderNumber?: string;
  createdAt: string;
  status: string;
  totalPrice: string;
  items: OrderItem[];
  authorizeNetTransactionId?: string;
  fflRecipientId?: number;
  customerEmail?: string;
  customerName?: string;
}

interface OrderFilters {
  orderNumber: string;
  customerName: string;
  status: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  page: number;
  limit: number;
}

const orderStatuses = [
  { value: "all", label: "All Statuses" },
  { value: "Processing", label: "Processing" },
  { value: "Shipped", label: "Shipped" },
  { value: "Delivered", label: "Delivered" },
  { value: "Cancelled", label: "Cancelled" },
];

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'processing':
      return <Clock className="w-4 h-4" />;
    case 'shipped':
      return <Truck className="w-4 h-4" />;
    case 'delivered':
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-indigo-100 text-indigo-800';
    case 'delivered':
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function OrdersManagementPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [filters, setFilters] = useState<OrderFilters>({
    orderNumber: "",
    customerName: "",
    status: "all",
    startDate: undefined,
    endDate: undefined,
    page: 1,
    limit: 20
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'support';

  // Fetch orders with filters
  const { data: ordersData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/orders/search', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.orderNumber) params.append('orderNumber', filters.orderNumber);
      if (filters.customerName) params.append('customerName', filters.customerName);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      
      return await apiRequest(`/api/admin/orders/search?${params.toString()}`);
    },
    enabled: isAdmin
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return await apiRequest(`/api/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders/search'] });
    }
  });

  // Export orders function
  const handleExportOrders = () => {
    const params = new URLSearchParams();
    if (filters.orderNumber) params.append('orderNumber', filters.orderNumber);
    if (filters.customerName) params.append('customerName', filters.customerName);
    if (filters.status !== 'all') params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
    params.append('format', 'csv');
    
    window.open(`/api/admin/orders/export?${params.toString()}`, '_blank');
  };

  // Quick date filters
  const setQuickDateFilter = (days: number) => {
    setFilters({
      ...filters,
      startDate: subDays(new Date(), days),
      endDate: new Date(),
      page: 1
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const orders = ordersData?.orders || [];
  const totalPages = ordersData?.totalPages || 1;
  const totalOrders = ordersData?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
            <p className="text-gray-600 mt-2">View and manage all customer orders</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {orders.filter((o: Order) => o.status.toLowerCase() === 'processing').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Shipped</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {orders.filter((o: Order) => o.status.toLowerCase() === 'shipped').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Revenue (This Page)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(
                    orders.reduce((sum: number, o: Order) => 
                      sum + parseFloat(o.totalPrice || '0'), 0
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Order Number Search */}
                <div>
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="orderNumber"
                      placeholder="Search order #"
                      value={filters.orderNumber}
                      onChange={(e) => setFilters({ ...filters, orderNumber: e.target.value, page: 1 })}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Customer Name Search */}
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    placeholder="Search by name"
                    value={filters.customerName}
                    onChange={(e) => setFilters({ ...filters, customerName: e.target.value, page: 1 })}
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {orderStatuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div>
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.startDate ? format(filters.startDate, "PP") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.startDate}
                          onSelect={(date) => setFilters({ ...filters, startDate: date, page: 1 })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.endDate ? format(filters.endDate, "PP") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.endDate}
                          onSelect={(date) => setFilters({ ...filters, endDate: date, page: 1 })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Quick Filters & Actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(7)}>
                  Last 7 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(30)}>
                  Last 30 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(90)}>
                  Last 90 Days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setFilters({
                    orderNumber: "",
                    customerName: "",
                    status: "all",
                    startDate: undefined,
                    endDate: undefined,
                    page: 1,
                    limit: 20
                  })}
                >
                  Clear Filters
                </Button>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportOrders}>
                    <Download className="w-4 h-4 mr-1" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8">
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <Alert variant="destructive" className="m-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load orders. Please try again.
                  </AlertDescription>
                </Alert>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Found</h3>
                  <p className="text-gray-600">Try adjusting your filters to see more results.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>FFL</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order: Order) => {
                        const orderNumber = order.rsrOrderNumber || `#${order.id}`;
                        const orderDate = format(parseISO(order.createdAt), 'MMM dd, yyyy');
                        const itemCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
                        
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {orderNumber}
                            </TableCell>
                            <TableCell>{orderDate}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.customerName || 'N/A'}</div>
                                <div className="text-sm text-gray-500">{order.customerEmail || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell>{itemCount}</TableCell>
                            <TableCell className="font-medium">
                              {formatPrice(parseFloat(order.totalPrice))}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("gap-1", getStatusColor(order.status))}>
                                {getStatusIcon(order.status)}
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {order.fflRecipientId ? (
                                <Badge variant="outline">FFL Required</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setLocation(`/order-confirmation?orderId=${order.id}`)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {user?.role === 'admin' && (
                                  <Select 
                                    value={order.status}
                                    onValueChange={(value) => updateStatusMutation.mutate({ 
                                      orderId: order.id, 
                                      status: value 
                                    })}
                                  >
                                    <SelectTrigger className="w-32 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Processing">Processing</SelectItem>
                                      <SelectItem value="Shipped">Shipped</SelectItem>
                                      <SelectItem value="Delivered">Delivered</SelectItem>
                                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, totalOrders)} of {totalOrders} orders
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                      disabled={filters.page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === filters.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilters({ ...filters, page: pageNum })}
                            className="w-8"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && <span className="px-2">...</span>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                      disabled={filters.page === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}