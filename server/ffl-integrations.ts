import axios from 'axios';

interface AtfFflData {
  licenseNumber: string;
  businessName: string;
  tradeName?: string;
  premisesAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  expirationDate: string;
}

interface ThirdPartyFflData {
  fflNumber: string;
  dealerName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  email?: string;
  website?: string;
  status: string;
}

export class FflIntegrationService {
  
  /**
   * Verify an FFL license against ATF eZ Check
   * Note: This requires the first 3 digits + last 5 digits of the license
   */
  async verifyFflWithAtf(licenseNumber: string): Promise<AtfFflData | null> {
    try {
      // Extract verification format: first 3 + last 5 digits
      const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
      if (cleanLicense.length < 8) {
        throw new Error('License number too short for verification');
      }
      
      const verificationCode = cleanLicense.substring(0, 3) + cleanLicense.substring(cleanLicense.length - 5);
      
      // Note: ATF eZ Check requires manual verification or authorized API access
      // For now, we'll return a structure that matches what would be returned
      console.log(`ATF verification requested for license: ${licenseNumber} (code: ${verificationCode})`);
      
      // TODO: Implement actual ATF API call when credentials are available
      return null;
    } catch (error) {
      console.error('ATF verification error:', error);
      return null;
    }
  }

  /**
   * Search FFLs using third-party API services
   */
  async searchFflsThirdParty(zipCode: string, radius: number = 25): Promise<ThirdPartyFflData[]> {
    // This would integrate with services like:
    // - FFL API (fflapi.com)
    // - 2A Commerce FFL API
    // - Master FFL
    // - Optimum7 FFL API
    
    console.log(`Third-party FFL search requested for ${zipCode} within ${radius} miles`);
    
    // TODO: Implement when API keys are provided
    return [];
  }

  /**
   * Import FFLs from ATF monthly listings
   * Downloads and parses the official ATF FFL listings
   */
  async importAtfMonthlyListings(state?: string): Promise<ThirdPartyFflData[]> {
    try {
      // ATF provides monthly FFL listings in various formats
      const baseUrl = 'https://www.atf.gov/firearms/listing-federal-firearms-licensees';
      
      console.log(`ATF monthly import requested for state: ${state || 'ALL'}`);
      
      // TODO: Implement ATF data parsing when needed
      return [];
    } catch (error) {
      console.error('ATF import error:', error);
      return [];
    }
  }

  /**
   * Enhanced FFL search with distance calculation
   */
  calculateDistance(zip1: string, zip2: string): number {
    // Simple distance calculation based on zip code proximity
    // For more accurate results, would use geocoding API
    
    const code1 = parseInt(zip1.substring(0, 3));
    const code2 = parseInt(zip2.substring(0, 3));
    
    // Rough estimation: 1 zip code prefix difference ≈ 50 miles
    return Math.abs(code1 - code2) * 50;
  }

  /**
   * Get recommended FFLs based on user location and preferences
   */
  async getRecommendedFfls(userZip: string, userPreferences?: {
    preferredStatus?: 'OnFile' | 'Preferred';
    maxDistance?: number;
    hasPhone?: boolean;
    hasEmail?: boolean;
  }): Promise<any[]> {
    // This would combine:
    // 1. Database FFLs
    // 2. Third-party API results
    // 3. ATF verification status
    // 4. User preferences and history
    
    console.log(`Recommended FFLs requested for ${userZip}`, userPreferences);
    
    // TODO: Implement comprehensive recommendation logic
    return [];
  }
}

export const fflIntegrationService = new FflIntegrationService();