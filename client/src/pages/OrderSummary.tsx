import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UnifiedOrderSummary } from '@/components/UnifiedOrderSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';

export function OrderSummaryPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [searchOrderNumber, setSearchOrderNumber] = useState('');

  const { data: orderData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/orders/unified', searchOrderNumber],
    enabled: !!searchOrderNumber,
    retry: false,
  });

  const handleSearch = () => {
    if (orderNumber.trim()) {
      setSearchOrderNumber(orderNumber.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Order Summary</h1>
        
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Look Up Your Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  placeholder="Enter your TGF order number (e.g., 1755652199945-485)"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={!orderNumber.trim() || isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {isLoading && (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin mr-3" />
                <span>Loading order details from Zoho...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6">
              <div className="text-center">
                <h3 className="font-medium text-red-800 mb-2">Order Not Found</h3>
                <p className="text-red-700">
                  We couldn't find an order with that number. Please check your order number and try again.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {orderData && (
          <UnifiedOrderSummary orderData={orderData} />
        )}

        {/* Demo Section */}
        {!searchOrderNumber && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">Demo: Amazon-Style Order Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-blue-700 space-y-2">
                <p>This unified order system treats Zoho as the system of record and provides:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Amazon-style shipment grouping for different fulfillment types</li>
                  <li>Real-time order status from Zoho CRM</li>
                  <li>Unified view across multiple deals/shipments</li>
                  <li>Firearms compliance status and hold information</li>
                  <li>Detailed product information including RSR and manufacturer data</li>
                </ul>
                <p className="mt-4 font-medium">
                  Try searching for order number: <code className="bg-blue-100 px-2 py-1 rounded">1755652199945-485</code>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}