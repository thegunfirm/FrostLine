import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Truck, Package, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface UnifiedOrderItem {
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fulfillmentType: 'In-House' | 'Drop-Ship to FFL' | 'Drop-Ship to Customer';
  dealId: string;
  shipmentGroup: string;
  isFirearm: boolean;
  manufacturerPartNumber?: string;
  rsrStockNumber?: string;
  upcCode?: string;
}

interface ShipmentGroup {
  fulfillmentType: 'In-House' | 'Drop-Ship to FFL' | 'Drop-Ship to Customer';
  status: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  dealId: string;
  items: UnifiedOrderItem[];
  subtotal: number;
}

interface UnifiedOrderSummary {
  masterOrderNumber: string;
  customerEmail: string;
  orderDate: string;
  totalAmount: number;
  overallStatus: string;
  paymentStatus: string;
  shipmentGroups: { [key: string]: ShipmentGroup };
  summary: {
    totalItems: number;
    totalDeals: number;
    inHouseItems: number;
    dropShipToFflItems: number;
    dropShipToCustomerItems: number;
  };
  metadata: {
    hasFirearms: boolean;
    requiresFfl: boolean;
    holdStatus?: string;
    complianceNotes?: string;
  };
}

interface UnifiedOrderSummaryProps {
  orderData: UnifiedOrderSummary;
}

export function UnifiedOrderSummary({ orderData }: UnifiedOrderSummaryProps) {
  const getFulfillmentIcon = (type: string) => {
    switch (type) {
      case 'In-House':
        return <Package className="w-4 h-4" />;
      case 'Drop-Ship to FFL':
        return <MapPin className="w-4 h-4" />;
      case 'Drop-Ship to Customer':
        return <Truck className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'shipped':
      case 'delivered':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'on hold':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Order #{orderData.masterOrderNumber}</CardTitle>
              <p className="text-muted-foreground mt-1">
                Placed on {formatDate(orderData.orderDate)}
              </p>
            </div>
            <div className="text-right">
              <Badge variant={getStatusBadgeVariant(orderData.overallStatus)} className="mb-2">
                {orderData.overallStatus}
              </Badge>
              <p className="text-2xl font-bold">{formatCurrency(orderData.totalAmount)}</p>
              <p className="text-sm text-muted-foreground">
                Payment: {orderData.paymentStatus}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Total Items</p>
              <p className="text-muted-foreground">{orderData.summary.totalItems}</p>
            </div>
            <div>
              <p className="font-medium">Shipment Groups</p>
              <p className="text-muted-foreground">{orderData.summary.totalDeals}</p>
            </div>
            <div>
              <p className="font-medium">Contains Firearms</p>
              <p className="text-muted-foreground">
                {orderData.metadata.hasFirearms ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="font-medium">Requires FFL</p>
              <p className="text-muted-foreground">
                {orderData.metadata.requiresFfl ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Alerts */}
      {orderData.metadata.holdStatus && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Hold Status: {orderData.metadata.holdStatus}</p>
                {orderData.metadata.complianceNotes && (
                  <p className="text-sm text-orange-700 mt-1">{orderData.metadata.complianceNotes}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipment Groups (Amazon-style) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Shipment Details</h3>
        
        {Object.entries(orderData.shipmentGroups).map(([groupKey, group]) => (
          <Card key={groupKey}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getFulfillmentIcon(group.fulfillmentType)}
                  <div>
                    <h4 className="font-medium">{group.fulfillmentType}</h4>
                    <p className="text-sm text-muted-foreground">
                      Deal ID: {group.dealId}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={getStatusBadgeVariant(group.status)}>
                    {group.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(group.subtotal)}
                  </p>
                </div>
              </div>
              
              {group.estimatedDelivery && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Estimated delivery: {formatDate(group.estimatedDelivery)}</span>
                </div>
              )}
              
              {group.trackingNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Tracking: {group.trackingNumber}</span>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {group.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <h5 className="font-medium">{item.productName}</h5>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>SKU: {item.productCode}</p>
                        {item.manufacturerPartNumber && (
                          <p>MPN: {item.manufacturerPartNumber}</p>
                        )}
                        {item.rsrStockNumber && (
                          <p>RSR: {item.rsrStockNumber}</p>
                        )}
                        {item.isFirearm && (
                          <Badge variant="outline" className="text-xs">
                            Firearm
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(item.unitPrice)} × {item.quantity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>In-House Items</span>
              <span>{orderData.summary.inHouseItems}</span>
            </div>
            <div className="flex justify-between">
              <span>Drop-Ship to FFL Items</span>
              <span>{orderData.summary.dropShipToFflItems}</span>
            </div>
            <div className="flex justify-between">
              <span>Drop-Ship to Customer Items</span>
              <span>{orderData.summary.dropShipToCustomerItems}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(orderData.totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}