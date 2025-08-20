import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  MapPin, 
  CreditCard, 
  Calendar, 
  User, 
  Shield, 
  Truck, 
  FileText, 
  Building, 
  Phone, 
  DollarSign,
  Clock,
  Target
} from "lucide-react";
import { OrderStatusProgress } from "./OrderStatusProgress";

interface DetailedOrderSummaryProps {
  orderData: any;
}

const formatPrice = (price: number | string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numPrice.toFixed(2)}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'Not available';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function DetailedOrderSummary({ orderData }: DetailedOrderSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {orderData.tgfOrderNumber ? `TGF Order ${orderData.tgfOrderNumber}` : `Order #${orderData.id}`}
              </CardTitle>
              {orderData.dealName && (
                <p className="text-lg text-blue-600 font-medium mt-1">
                  Deal: {orderData.dealName}
                </p>
              )}
              <p className="text-gray-600 mt-2">
                Placed on {formatDate(orderData.orderDate || orderData.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {formatPrice(orderData.totalPrice || orderData.amount)}
              </div>
              {orderData.expectedRevenue && (
                <p className="text-sm text-gray-600 mt-1">
                  Expected Revenue: {formatPrice(orderData.expectedRevenue)}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Order Status Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Order Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusProgress
            orderStatus={orderData.orderStatus || 'Processing'}
            pipelineStage={orderData.pipelineStage || orderData.stage}
            holdType={orderData.holdType}
            holdStartedAt={orderData.holdStartedAt}
            holdClearedAt={orderData.holdClearedAt}
            estimatedShipDate={orderData.estimatedShipDate}
            carrier={orderData.carrier}
            trackingNumber={orderData.trackingNumber}
          />
        </CardContent>
      </Card>

      {/* Key Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderData.dealOwner && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Deal Owner</label>
                <p className="text-sm font-medium">{orderData.dealOwner}</p>
              </div>
            )}
            
            {orderData.leadSource && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lead Source</label>
                <p className="text-sm font-medium">{orderData.leadSource}</p>
              </div>
            )}
            
            {orderData.conversionChannel && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversion Channel</label>
                <p className="text-sm font-medium">{orderData.conversionChannel}</p>
              </div>
            )}
            
            {orderData.flow && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Flow</label>
                <p className="text-sm font-medium">{orderData.flow}</p>
              </div>
            )}
            
            {orderData.probability && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Probability</label>
                <p className="text-sm font-medium">{orderData.probability}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Customer Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderData.contactName && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</label>
                <p className="text-sm font-medium">{orderData.contactName}</p>
              </div>
            )}
            
            {orderData.accountName && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account</label>
                <p className="text-sm font-medium">{orderData.accountName}</p>
              </div>
            )}
            
            {orderData.consigneeType && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Consignee Type</label>
                <p className="text-sm font-medium">{orderData.consigneeType}</p>
              </div>
            )}
            
            {orderData.type && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
                <p className="text-sm font-medium">{orderData.type}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fulfillment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="w-5 h-5" />
              Fulfillment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderData.fulfillmentType && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fulfillment Type</label>
                <p className="text-sm font-medium">{orderData.fulfillmentType}</p>
              </div>
            )}
            
            {orderData.orderingAccount && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ordering Account</label>
                <p className="text-sm font-medium">{orderData.orderingAccount}</p>
              </div>
            )}
            
            {orderData.distributorOrderNumber && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Distributor Order #</label>
                <p className="text-sm font-mono">{orderData.distributorOrderNumber}</p>
              </div>
            )}
            
            {orderData.returnStatus && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Return Status</label>
                <p className="text-sm font-medium">{orderData.returnStatus}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline & Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timeline & Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {orderData.createdAt && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</label>
                <p className="text-sm">{formatDate(orderData.createdAt)}</p>
              </div>
            )}
            
            {orderData.submitted && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted</label>
                <p className="text-sm">{formatDate(orderData.submitted)}</p>
              </div>
            )}
            
            {orderData.lastDistributorUpdate && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Distributor Update</label>
                <p className="text-sm">{formatDate(orderData.lastDistributorUpdate)}</p>
              </div>
            )}
            
            {orderData.appConfirmed && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">App Confirmed</label>
                <p className="text-sm">{formatDate(orderData.appConfirmed)}</p>
              </div>
            )}
          </div>
          
          {orderData.appResponse && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">App Response</label>
              <p className="text-sm font-mono mt-1">{orderData.appResponse}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orderData.items && orderData.items.length > 0 ? (
            <div className="space-y-4">
              {orderData.items.map((item: any, index: number) => (
                <div key={index} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {item.description || item.name || `Item ${index + 1}`}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-gray-600">
                      <div>Qty: {item.quantity || 1}</div>
                      <div>Price: {formatPrice(item.price || 0)}</div>
                      {item.sku && <div>SKU: {item.sku}</div>}
                      {item.upc && <div>UPC: {item.upc}</div>}
                    </div>
                    {item.requiresFFL && (
                      <Badge variant="outline" className="mt-2">
                        FFL Required
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-lg">
                      {formatPrice((item.quantity || 1) * (item.price || 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No item details available</p>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      {(orderData.nextStep || orderData.campaignSource || orderData.closingDate) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {orderData.nextStep && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next Step</label>
                <p className="text-sm font-medium">{orderData.nextStep}</p>
              </div>
            )}
            
            {orderData.campaignSource && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Campaign Source</label>
                <p className="text-sm font-medium">{orderData.campaignSource}</p>
              </div>
            )}
            
            {orderData.closingDate && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Closing Date</label>
                <p className="text-sm">{formatDate(orderData.closingDate)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}