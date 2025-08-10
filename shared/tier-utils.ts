// Tier mapping utilities for subscription management

export const TIER_LABELS = {
  PLATINUM_FOUNDER: 'Platinum Founder',
  PLATINUM_MONTHLY: 'Platinum Monthly', 
  PLATINUM_ANNUALLY: 'Platinum Annually',
  GOLD_MONTHLY: 'Gold Monthly',
  GOLD_ANNUALLY: 'Gold Annually', 
  BRONZE_MONTHLY: 'Bronze Monthly',
  BRONZE_ANNUALLY: 'Bronze Annually'
} as const;

export type TierLabel = typeof TIER_LABELS[keyof typeof TIER_LABELS];

// System setting to control whether Platinum Annual should be labeled as Founder
let platinumAnnualToFounderMode = true; // Start in Founder mode

export function setPlatinumAnnualToFounderMode(enabled: boolean): void {
  platinumAnnualToFounderMode = enabled;
}

export function getPlatinumAnnualToFounderMode(): boolean {
  return platinumAnnualToFounderMode;
}

/**
 * Maps user subscription selection to the appropriate tier label for CRM/display
 * @param subscriptionTier - The tier the user selected (e.g., "Platinum", "Gold", "Bronze") 
 * @param paymentPeriod - Whether they chose monthly or annual payment ("monthly" | "annually")
 * @returns The proper tier label for CRM and display purposes
 */
export function mapSubscriptionToTierLabel(
  subscriptionTier: string, 
  paymentPeriod: 'monthly' | 'annually'
): TierLabel {
  const tier = subscriptionTier.toLowerCase();
  
  if (tier === 'platinum') {
    if (paymentPeriod === 'monthly') {
      return TIER_LABELS.PLATINUM_MONTHLY;
    } else {
      // For annual Platinum, check if we're still in "Founder" mode
      return platinumAnnualToFounderMode 
        ? TIER_LABELS.PLATINUM_FOUNDER 
        : TIER_LABELS.PLATINUM_ANNUALLY;
    }
  }
  
  if (tier === 'gold') {
    return paymentPeriod === 'monthly' 
      ? TIER_LABELS.GOLD_MONTHLY 
      : TIER_LABELS.GOLD_ANNUALLY;
  }
  
  if (tier === 'bronze') {
    return paymentPeriod === 'monthly' 
      ? TIER_LABELS.BRONZE_MONTHLY 
      : TIER_LABELS.BRONZE_ANNUALLY;
  }
  
  // Fallback - shouldn't happen with proper validation
  return TIER_LABELS.BRONZE_MONTHLY;
}

/**
 * Extracts the base tier from a tier label
 * @param tierLabel - Full tier label (e.g., "Platinum Founder", "Gold Monthly")
 * @returns Base tier ("Platinum", "Gold", "Bronze")
 */
export function getBaseTierFromLabel(tierLabel: TierLabel): string {
  if (tierLabel.startsWith('Platinum')) return 'Platinum';
  if (tierLabel.startsWith('Gold')) return 'Gold';
  if (tierLabel.startsWith('Bronze')) return 'Bronze';
  return 'Bronze';
}

/**
 * Determines if a tier label represents annual billing
 * @param tierLabel - Full tier label
 * @returns True if annual billing, false if monthly
 */
export function isAnnualTier(tierLabel: TierLabel): boolean {
  return tierLabel.includes('Annually') || tierLabel.includes('Founder');
}

/**
 * Gets display pricing information for a tier label
 * @param tierLabel - Full tier label
 * @returns Pricing display information
 */
export function getTierDisplayInfo(tierLabel: TierLabel): {
  displayName: string;
  isAnnual: boolean;
  baseTier: string;
  isFounder: boolean;
} {
  return {
    displayName: tierLabel,
    isAnnual: isAnnualTier(tierLabel),
    baseTier: getBaseTierFromLabel(tierLabel),
    isFounder: tierLabel === TIER_LABELS.PLATINUM_FOUNDER
  };
}