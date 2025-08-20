import { CheckCircle, Clock, AlertCircle, Truck, Package, Shield } from 'lucide-react';

interface OrderStatusProgressProps {
  orderStatus?: string;
  pipelineStage?: string;
  holdType?: string;
  holdStartedAt?: string;
  holdClearedAt?: string;
  estimatedShipDate?: string;
  carrier?: string;
  trackingNumber?: string;
}

const statusStages = [
  { key: 'qualification', label: 'Order Received', icon: Package },
  { key: 'processing', label: 'Processing', icon: Clock },
  { key: 'compliance', label: 'Compliance Check', icon: Shield },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const getStatusStep = (orderStatus: string, pipelineStage: string) => {
  const status = orderStatus?.toLowerCase() || '';
  const stage = pipelineStage?.toLowerCase() || '';
  
  if (status.includes('delivered') || stage.includes('closed')) return 4;
  if (status.includes('shipped') || status.includes('transit')) return 3;
  if (status.includes('processing') || stage.includes('proposal') || stage.includes('negotiation')) return 2;
  if (status.includes('qualification') || stage.includes('qualification')) return 1;
  return 0;
};

export function OrderStatusProgress({
  orderStatus = 'Processing',
  pipelineStage = 'Qualification',
  holdType,
  holdStartedAt,
  holdClearedAt,
  estimatedShipDate,
  carrier,
  trackingNumber
}: OrderStatusProgressProps) {
  const currentStep = getStatusStep(orderStatus, pipelineStage);
  const hasCompliance = holdType || holdStartedAt;
  
  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="relative">
        <div className="flex items-center">
          {statusStages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index <= currentStep;
            const isCurrent = index === currentStep;
            const isCompliance = stage.key === 'compliance';
            
            // Skip compliance step if no firearms compliance needed
            if (isCompliance && !hasCompliance) {
              return null;
            }
            
            return (
              <div key={stage.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                    ${isActive 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                    ${isCurrent ? 'ring-4 ring-blue-100' : ''}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                      {stage.label}
                    </p>
                  </div>
                </div>
                
                {/* Progress Line */}
                {index < statusStages.length - 1 && (!isCompliance || hasCompliance) && (
                  <div className="flex-1 mx-4">
                    <div className={`h-0.5 transition-colors ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Current Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Current Status</span>
          </div>
          <p className="text-sm font-semibold text-blue-800">{orderStatus}</p>
          {pipelineStage && (
            <p className="text-xs text-blue-600 mt-1">Pipeline: {pipelineStage}</p>
          )}
        </div>

        {/* Compliance Status */}
        {hasCompliance && (
          <div className={`border rounded-lg p-3 ${
            holdClearedAt 
              ? 'bg-green-50 border-green-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Shield className={`w-4 h-4 ${holdClearedAt ? 'text-green-600' : 'text-amber-600'}`} />
              <span className={`text-xs font-medium uppercase tracking-wide ${
                holdClearedAt ? 'text-green-600' : 'text-amber-600'
              }`}>
                Compliance Status
              </span>
            </div>
            <p className={`text-sm font-semibold ${
              holdClearedAt ? 'text-green-800' : 'text-amber-800'
            }`}>
              {holdClearedAt ? 'Cleared' : holdType || 'Under Review'}
            </p>
            {holdStartedAt && !holdClearedAt && (
              <p className="text-xs text-amber-600 mt-1">
                Started: {new Date(holdStartedAt).toLocaleDateString()}
              </p>
            )}
            {holdClearedAt && (
              <p className="text-xs text-green-600 mt-1">
                Cleared: {new Date(holdClearedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Shipping Info */}
        {(estimatedShipDate || carrier || trackingNumber) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Shipping Info</span>
            </div>
            {estimatedShipDate && (
              <p className="text-xs text-gray-600">
                Est. Ship: {new Date(estimatedShipDate).toLocaleDateString()}
              </p>
            )}
            {carrier && (
              <p className="text-xs text-gray-600 mt-1">Carrier: {carrier}</p>
            )}
            {trackingNumber && (
              <p className="text-xs font-mono text-gray-800 mt-1">
                Tracking: {trackingNumber}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}