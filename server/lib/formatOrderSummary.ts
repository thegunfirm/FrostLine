/**
 * Order Summary Formatter
 * Formats order documents into consistent summary JSON for the API contract
 */

import { ShippingOutcome, labelSuffix, OUTCOME_ORDER } from './shippingOutcomes';

export interface OrderSummaryTotals {
  items: number;
  shipping: number;
  tax: number;
  grand: number;
}

export interface OrderSummaryShipment {
  suffix?: 'A' | 'B' | 'C' | 'D';
  outcome: ShippingOutcome;
  lines: Array<{
    sku: string;
    qty: number;
  }>;
  ffl?: {
    id: string;
    [key: string]: any;
  };
}

export interface OrderSummaryResponse {
  orderId: string;
  baseNumber: string;
  displayNumber: string;
  totals: OrderSummaryTotals;
  shipments: OrderSummaryShipment[];
  createdAt: string;
  customer: {
    email: string | null;
    customerId: string | null;
  };
  transactionId: string | null;
}

export interface OrderDocument {
  orderId: string;
  baseNumber: string;
  paymentId: string;
  idempotencyKey: string;
  totals: OrderSummaryTotals;
  shipments: Array<{
    outcome: ShippingOutcome;
    lines: Array<{
      sku: string;
      qty: number;
    }>;
    ffl?: {
      id: string;
      [key: string]: any;
    };
  }>;
  createdAt: Date;
  customer: {
    email: string | null;
    customerId: string | null;
  };
  transactionId: string | null;
}

/**
 * Format an order document into the API contract summary format
 * @param orderDoc - Order document from storage
 * @returns Formatted order summary
 */
export function toSummary(orderDoc: OrderDocument): OrderSummaryResponse {
  const { shipments } = orderDoc;
  
  // Determine display number based on shipment count
  let displayNumber: string;
  let formattedShipments: OrderSummaryShipment[];
  
  if (shipments.length === 1) {
    // Single shipment gets "-0" suffix
    displayNumber = `${orderDoc.baseNumber}-0`;
    formattedShipments = shipments.map(shipment => ({
      outcome: shipment.outcome,
      lines: shipment.lines,
      ffl: shipment.ffl
    }));
  } else {
    // Multiple shipments get "-Z" with A/B/C/D suffixes
    displayNumber = `${orderDoc.baseNumber}-Z`;
    
    // Sort shipments by the deterministic OUTCOME_ORDER and assign suffixes
    const sortedShipments = [...shipments].sort((a, b) => {
      const aIndex = OUTCOME_ORDER.indexOf(a.outcome);
      const bIndex = OUTCOME_ORDER.indexOf(b.outcome);
      return aIndex - bIndex;
    });
    
    formattedShipments = sortedShipments.map(shipment => ({
      suffix: labelSuffix(shipment.outcome),
      outcome: shipment.outcome,
      lines: shipment.lines,
      ffl: shipment.ffl
    }));
  }
  
  return {
    orderId: orderDoc.orderId,
    baseNumber: orderDoc.baseNumber,
    displayNumber,
    totals: orderDoc.totals,
    shipments: formattedShipments,
    createdAt: orderDoc.createdAt.toISOString(),
    customer: orderDoc.customer,
    transactionId: orderDoc.transactionId
  };
}