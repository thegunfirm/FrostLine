/**
 * Tax calculation service with CA blocking
 * Implements server-side tax computation and state restrictions
 */

interface TaxCalculationInput {
  shipTo: {
    state: string;
    [key: string]: any;
  };
  lines: Array<{
    sku: string;
    qty: number;
    regulated?: boolean;
    fulfillment?: string;
  }>;
  items: number;
  shipping: number;
}

export interface TaxError {
  code: string;
  message: string;
}

/**
 * Calculate tax for an order
 * @param input - Tax calculation input
 * @returns Tax amount
 * @throws TaxError with code 'NO_SHIP_CA' if shipping to California
 */
export function calculate(input: TaxCalculationInput): number {
  const { shipTo } = input;
  
  // Hard block: No shipping to California
  if (shipTo.state === 'CA') {
    const error: TaxError = {
      code: 'NO_SHIP_CA',
      message: 'We do not ship orders to CA.'
    };
    throw error;
  }
  
  // Placeholder tax calculation - return 0 for now
  // Future: Integrate with tax service provider like Avalara/TaxJar
  return 0;
}

export const taxService = {
  calculate
};