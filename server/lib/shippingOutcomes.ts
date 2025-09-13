/**
 * Shipping outcome determination and suffix mapping
 * Handles the logic for determining fulfillment outcomes and assigning suffixes
 */

export type ShippingOutcome = 'DS>FFL' | 'DS>Customer' | 'IH>FFL' | 'IH>Customer';
export type ShippingSuffix = 'A' | 'B' | 'C' | 'D';

export interface OrderLine {
  sku: string;
  qty: number;
  regulated: boolean;
  fulfillment: 'IH' | 'DS';
}

export interface ShippingBucket {
  outcome: ShippingOutcome;
  lines: OrderLine[];
}

export interface ShippingOutcomeResult {
  uniqueOutcomes: ShippingOutcome[];
  buckets: Record<ShippingOutcome, ShippingBucket>;
}

/**
 * Derive shipping outcomes from order lines
 * @param lines - Array of order lines
 * @returns Object with unique outcomes and line buckets
 */
export function deriveOutcomes(lines: OrderLine[]): ShippingOutcomeResult {
  const buckets: Record<string, ShippingBucket> = {};
  
  for (const line of lines) {
    let outcome: ShippingOutcome;
    
    // Determine outcome based on regulated status and fulfillment method
    if (line.regulated && line.fulfillment === 'DS') {
      outcome = 'DS>FFL';
    } else if (line.regulated && line.fulfillment === 'IH') {
      outcome = 'IH>FFL';
    } else if (!line.regulated && line.fulfillment === 'DS') {
      outcome = 'DS>Customer';
    } else if (!line.regulated && line.fulfillment === 'IH') {
      outcome = 'IH>Customer';
    } else {
      // Fallback - shouldn't happen with proper validation
      outcome = 'IH>Customer';
    }
    
    // Initialize bucket if it doesn't exist
    if (!buckets[outcome]) {
      buckets[outcome] = {
        outcome,
        lines: []
      };
    }
    
    // Add line to appropriate bucket
    buckets[outcome].lines.push(line);
  }
  
  const uniqueOutcomes = Object.keys(buckets) as ShippingOutcome[];
  
  return {
    uniqueOutcomes,
    buckets: buckets as Record<ShippingOutcome, ShippingBucket>
  };
}

/**
 * Map shipping outcome to suffix label
 * Fixed order: DS>FFL → A, DS>Customer → B, IH>FFL → C, IH>Customer → D
 * @param outcome - Shipping outcome
 * @returns Suffix label
 */
export function labelSuffix(outcome: ShippingOutcome): ShippingSuffix {
  const suffixMap: Record<ShippingOutcome, ShippingSuffix> = {
    'DS>FFL': 'A',
    'DS>Customer': 'B', 
    'IH>FFL': 'C',
    'IH>Customer': 'D'
  };
  
  return suffixMap[outcome];
}

/**
 * Get all possible outcomes in deterministic order
 */
export const OUTCOME_ORDER: ShippingOutcome[] = ['DS>FFL', 'DS>Customer', 'IH>FFL', 'IH>Customer'];