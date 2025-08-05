import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Home, Building2, Clock } from "lucide-react";
import type { CartItem } from "@/hooks/use-cart";

interface DeliveryGroupsProps {
  items: CartItem[];
  fulfillmentSettings?: any[];
  selectedFfl?: number | null;
}

export function DeliveryGroups({ items, fulfillmentSettings, selectedFfl }: DeliveryGroupsProps) {
  
  // Group items by fulfillment type
  const groupedItems = items.reduce((groups, item) => {
    const type = item.fulfillmentType || 'direct';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(item);
    return groups;
  }, {} as Record<string, CartItem[]>);

  const getDeliveryInfo = (type: string) => {
    const setting = fulfillmentSettings?.find(s => s.type === type);
    
    switch (type) {
      case 'direct':
        return {
          icon: Home,
          title: 'Direct to Your Address',
          description: 'Accessories and non-firearm items shipped directly to you',
          deliveryTime: setting ? `${setting.deliveryDaysMin}-${setting.deliveryDaysMax} business days` : '3-5 business days',
          address: 'Your shipping address'
        };
      case 'ffl_dropship':
        return {
          icon: Building2,
          title: 'Direct to FFL (Dropship)',
          description: 'Firearms shipped directly from distributor to your FFL dealer',
          deliveryTime: setting ? `${setting.deliveryDaysMin}-${setting.deliveryDaysMax} business days` : '5-7 business days',
          address: selectedFfl ? 'Selected FFL dealer' : 'FFL selection required'
        };
      case 'ffl_non_dropship':
        return {
          icon: Truck,
          title: 'Via TheGunFirm to FFL',
          description: 'Firearms shipped to TheGunFirm first, then to your FFL dealer',
          deliveryTime: setting ? `${setting.deliveryDaysMin}-${setting.deliveryDaysMax} business days` : '7-10 business days',
          address: selectedFfl ? 'Selected FFL dealer' : 'FFL selection required'
        };
      default:
        return {
          icon: Truck,
          title: 'Standard Delivery',
          description: 'Standard shipping method',
          deliveryTime: '5-7 business days',
          address: 'Shipping address'
        };
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  return (
    <div className="space-y-4">
      {Object.entries(groupedItems).map(([type, typeItems]) => {
        const deliveryInfo = getDeliveryInfo(type);
        const Icon = deliveryInfo.icon;
        const groupTotal = typeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return (
          <Card key={type} className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Icon className="w-5 h-5 text-amber-600" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>{deliveryInfo.title}</span>
                    <Badge variant="outline" className="ml-2">
                      {typeItems.length} item{typeItems.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <p className="text-sm font-normal text-gray-600 mt-1">
                    {deliveryInfo.description}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Delivery Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Estimated Delivery</p>
                    <p className="text-sm text-gray-600">{deliveryInfo.deliveryTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delivery Address</p>
                    <p className="text-sm text-gray-600">{deliveryInfo.address}</p>
                  </div>
                </div>
              </div>

              {/* Items in this group */}
              <div className="space-y-3">
                {typeItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/api/admin/fallback-image";
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-gray-600">{item.manufacturer}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">Qty: {item.quantity}</span>
                        {item.requiresFFL && (
                          <Badge variant="outline" className="text-xs">
                            FFL Required
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatPrice(item.price)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Group Subtotal */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="font-medium text-gray-900">
                  {deliveryInfo.title} Subtotal
                </span>
                <span className="font-bold text-gray-900">
                  {formatPrice(groupTotal)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Delivery Note */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Delivery Information</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Shipping costs will be calculated based on delivery location and method</li>
          <li>• FFL transfers may incur additional fees charged by the dealer</li>
          <li>• You will receive tracking information for each shipment</li>
          <li>• Business days exclude weekends and holidays</li>
        </ul>
      </div>
    </div>
  );
}