import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { storage } from '../storage';

/**
 * RSR FFL Import Service
 * Imports authentic FFL dealer data from RSR distributor
 */

interface RSRFFLRecord {
  licenseNumber: string;
  businessName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone?: string;
  contactEmail?: string;
  status: 'OnFile' | 'Preferred' | 'NotOnFile';
}

export class RSRFFLImportService {
  private dataPath = join(process.cwd(), 'server', 'data', 'distributors', 'rsr', 'downloads', 'inventory');

  /**
   * Import FFL dealers from RSR data file
   */
  async importFFLs(): Promise<{ imported: number; updated: number; errors: string[] }> {
    // Try multiple possible FFL data file locations
    const possibleFiles = [
      join(this.dataPath, 'ffl-transfer-dealers.txt'),
      join(process.cwd(), 'server', 'data', 'sample-ffl-data.txt'),
      join(this.dataPath, 'dealers.txt'),
      join(this.dataPath, 'ffl-dealers.txt')
    ];
    
    let filePath: string | null = null;
    for (const file of possibleFiles) {
      if (existsSync(file)) {
        filePath = file;
        break;
      }
    }
    
    if (!filePath) {
      return {
        imported: 0,
        updated: 0,
        errors: ['No FFL data file found. Please download RSR FFL data first.']
      };
    }

    const errors: string[] = [];
    let imported = 0;
    let updated = 0;

    try {
      console.log('📋 Reading RSR FFL data from:', filePath);
      const fileContent = readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

      console.log(`📊 Found ${lines.length} FFL records to process`);

      for (const line of lines) {
        try {
          const fflData = this.parseFFLLine(line);
          if (fflData) {
            // Check if FFL already exists
            const existingFfl = await storage.getFFLByLicense(fflData.licenseNumber);
            
            if (existingFfl) {
              // Update existing FFL
              await storage.updateFFL(existingFfl.id, {
                businessName: fflData.businessName,
                address: fflData.address,
                phone: fflData.phone,
                contactEmail: fflData.contactEmail,
                status: fflData.status,
                zip: fflData.address.zip
              });
              updated++;
            } else {
              // Create new FFL
              await storage.createFFL({
                licenseNumber: fflData.licenseNumber,
                businessName: fflData.businessName,
                address: fflData.address,
                phone: fflData.phone,
                contactEmail: fflData.contactEmail,
                status: fflData.status,
                zip: fflData.address.zip,
                isAvailableToUser: true,
                regionRestrictions: null,
                licenseDocumentUrl: null
              });
              imported++;
            }
          }
        } catch (error: any) {
          const errorMsg = `Failed to process FFL line: ${line.substring(0, 100)}... - ${error.message}`;
          errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      console.log(`✅ RSR FFL import complete: ${imported} imported, ${updated} updated, ${errors.length} errors`);
      return { imported, updated, errors };

    } catch (error: any) {
      const errorMsg = `Failed to read RSR FFL file: ${error.message}`;
      console.error('❌', errorMsg);
      errors.push(errorMsg);
      return { imported: 0, updated: 0, errors };
    }
  }

  /**
   * Parse a single FFL line from RSR data
   * Format: BusinessName;Street;City;State;Zip;LicenseNumber
   */
  private parseFFLLine(line: string): RSRFFLRecord | null {
    try {
      // Skip comment lines
      if (line.startsWith('#') || line.trim() === '') {
        return null;
      }
      
      // RSR FFL file format is semicolon delimited
      const parts = line.split(';').map(p => p.trim());
      
      if (parts.length < 6) {
        return null; // Skip incomplete records
      }

      // Format: BusinessName;Street;City;State;Zip;LicenseNumber
      const [businessName, street, city, state, zip, licenseNumber] = parts;

      if (!licenseNumber || !businessName || !city || !state || !zip) {
        return null; // Skip records missing essential data
      }

      return {
        licenseNumber: licenseNumber.trim(),
        businessName: businessName.trim(),
        address: {
          street: street?.trim() || '',
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim()
        },
        phone: undefined, // Not included in this RSR format
        contactEmail: undefined, // Not included in this RSR format
        status: 'OnFile' // RSR dealers are typically on file
      };
    } catch (error) {
      console.error('Failed to parse FFL line:', error);
      return null;
    }
  }

  /**
   * Map RSR status to our system status
   */
  private mapRSRStatus(rsrStatus: string): 'OnFile' | 'Preferred' | 'NotOnFile' {
    const status = rsrStatus?.toLowerCase();
    
    if (status?.includes('preferred') || status?.includes('priority')) {
      return 'Preferred';
    } else if (status?.includes('onfile') || status?.includes('verified')) {
      return 'OnFile';
    } else {
      return 'NotOnFile';
    }
  }

  /**
   * Clear all existing FFLs and import fresh from RSR
   */
  async refreshAllFFLs(): Promise<{ imported: number; updated: number; errors: string[] }> {
    console.log('🔄 Clearing existing FFL data for fresh RSR import...');
    
    // Clear existing FFLs (keep only authentic RSR data)
    await storage.clearAllFFLs();
    
    return this.importFFLs();
  }
}

export const rsrFFLImportService = new RSRFFLImportService();