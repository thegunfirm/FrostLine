#!/usr/bin/env node

const { neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');
const { eq } = require('drizzle-orm');
const XLSX = require('xlsx');
const ws = require('ws');

// Neon configuration for serverless
neonConfig.webSocketConstructor = ws;

// Import schema tables - using direct table definitions
const { pgTable, serial, text, boolean, timestamp, jsonb, integer } = require('drizzle-orm/pg-core');

const ffls = pgTable('ffls', {
  id: serial('id').primaryKey(),
  licenseNumber: text('license_number').notNull(),
  businessName: text('business_name').notNull(),
  contactEmail: text('contact_email'),
  phone: text('phone'),
  address: jsonb('address').notNull(),
  zip: text('zip').notNull(),
  status: text('status').notNull(),
  licenseDocumentUrl: text('license_document_url'),
  isAvailableToUser: boolean('is_available_to_user'),
  regionRestrictions: jsonb('region_restrictions'),
  createdAt: timestamp('created_at'),
  isRsrPartner: boolean('is_rsr_partner'),
  isAtfActive: boolean('is_atf_active'),
  licenseType: text('license_type'),
  tradeNameDba: text('trade_name_dba'),
  mailingAddress: jsonb('mailing_address'),
  licenseExpiration: timestamp('license_expiration'),
  lastAtfUpdate: timestamp('last_atf_update'),
});

const fflDataSources = pgTable('ffl_data_sources', {
  id: serial('id').primaryKey(),
  sourceType: text('source_type').notNull(),
  sourceName: text('source_name').notNull(),
  recordCount: integer('record_count').notNull(),
  lastUpdated: timestamp('last_updated').notNull(),
  isActive: boolean('is_active').default(true),
  notes: text('notes'),
});

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { ffls, fflDataSources } });

/**
 * Direct ATF directory integration - bypasses upload interface
 */
async function processAtfDirectoryDirect() {
  console.log('Starting direct ATF directory integration...');
  
  try {
    const filePath = './atf-directory-complete.xlsx';
    
    console.log(`Processing ATF file: ${filePath}`);

    // Read and parse the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} records in ATF directory`);

    let recordsProcessed = 0;
    let recordsSkipped = 0;
    let recordsUpdated = 0;
    const errors = [];

    // Process each ATF record
    for (const [index, record] of data.entries()) {
      try {
        // Map Excel columns to our FFL schema
        const fflData = mapAtfRecordToFfl(record);
        
        if (!fflData) {
          recordsSkipped++;
          continue;
        }

        // Check if FFL already exists (by license number)
        const [existingFfl] = await db.select()
          .from(ffls)
          .where(eq(ffls.licenseNumber, fflData.licenseNumber));

        if (existingFfl) {
          // Update existing FFL with ATF data, but preserve RSR status if it's "OnFile"
          const updateData = {
            ...fflData,
            status: existingFfl.status === 'OnFile' ? 'OnFile' : 'NotOnFile',
            lastAtfUpdate: new Date()
          };
          
          await db.update(ffls)
            .set(updateData)
            .where(eq(ffls.licenseNumber, fflData.licenseNumber));
          
          recordsUpdated++;
        } else {
          // Insert new FFL from ATF data
          await db.insert(ffls).values(fflData);
          
          recordsProcessed++;
        }

        // Log progress every 500 records
        if ((index + 1) % 500 === 0) {
          console.log(`Processed ${index + 1}/${data.length} records (${recordsProcessed} new, ${recordsUpdated} updated, ${recordsSkipped} skipped)`);
        }

      } catch (error) {
        console.error(`Error processing record ${index + 1}:`, error);
        errors.push(`Record ${index + 1}: ${error.message}`);
        recordsSkipped++;
      }
    }

    console.log('\n=== ATF Directory Integration Complete ===');
    console.log(`Total records in file: ${data.length}`);
    console.log(`New FFLs added: ${recordsProcessed}`);
    console.log(`Existing FFLs updated: ${recordsUpdated}`);
    console.log(`Records skipped: ${recordsSkipped}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nFirst 10 errors:');
      errors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
    }

    // Update FFL data source tracking
    await updateFflDataSource('atf', 'ATF Directory July 2024', recordsProcessed + recordsUpdated);

  } catch (error) {
    console.error('ATF directory integration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Map ATF Excel record to FFL database schema
 */
function mapAtfRecordToFfl(record) {
  try {
    // Map exact ATF column names based on Excel structure
    const region = record['LIC_REGN'];
    const district = record['LIC_DIST'];
    const county = record['LIC_CNTY'];
    const licenseType = record['LIC_TYPE'];
    const seqNumber = record['LIC_SEQN'];
    
    const businessName = record['LICENSE_NAME'];
    const streetAddress = record['PREMISE_STREET'];
    const city = record['PREMISE_CITY'];
    const state = record['PREMISE_STATE'];
    const zip = record['PREMISE_ZIP_CODE'];
    const phone = record['VOICE_PHONE'];
    
    // Build license number from components (ATF format: Region-District-County-Type-Sequence)
    const licenseNumber = `${region}-${district}-${county}-${licenseType}-${seqNumber}`;

    if (!businessName || !licenseNumber || !region || !district) {
      return null; // Skip records without essential data
    }

    // Clean and format the data
    const cleanBusinessName = businessName.toString().trim();
    const cleanLicenseNumber = licenseNumber.toString().trim();
    
    if (cleanBusinessName.length < 2) {
      return null; // Skip records with insufficient business name
    }

    // Map license type to readable format
    const fflTypeMap = {
      '01': 'Dealer in Firearms',
      '02': 'Pawnbroker in Firearms',
      '03': 'Collector of Curios and Relics',
      '06': 'Manufacturer of Ammunition',
      '07': 'Manufacturer of Firearms',
      '08': 'Importer of Firearms',
      '09': 'Dealer in Destructive Devices',
      '10': 'Manufacturer of Destructive Devices',
      '11': 'Importer of Destructive Devices'
    };
    
    const fflType = fflTypeMap[licenseType] || `Type ${licenseType}`;

    return {
      licenseNumber: cleanLicenseNumber,
      businessName: cleanBusinessName,
      contactEmail: null, // ATF directory doesn't include email
      phone: phone ? phone.toString().trim().replace(/[^\d-() ]/g, '') : null,
      address: {
        street: streetAddress ? streetAddress.toString().trim() : '',
        city: city ? city.toString().trim() : '',
        state: state ? state.toString().trim().toUpperCase() : ''
      },
      zip: zip ? zip.toString().trim() : '',
      status: 'NotOnFile', // ATF dealers not partnered with RSR
      licenseDocumentUrl: null,
      isAvailableToUser: true,
      regionRestrictions: null,
      isRsrPartner: false,
      isAtfActive: true,
      licenseType: fflType,
      tradeNameDba: null, // ATF directory doesn't include DBA names
      mailingAddress: null, // Could be different from premise address
      licenseExpiration: null, // ATF directory doesn't include expiration
      lastAtfUpdate: new Date(),
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error mapping ATF record:', error, record);
    return null;
  }
}

/**
 * Update FFL data source tracking
 */
async function updateFflDataSource(sourceType, sourceName, recordCount) {
  try {
    // Check if data source exists
    const [existingSource] = await db.select()
      .from(fflDataSources)
      .where(eq(fflDataSources.sourceType, sourceType));

    if (existingSource) {
      // Update existing source
      await db.update(fflDataSources)
        .set({
          sourceName,
          recordCount,
          lastUpdated: new Date(),
          isActive: true
        })
        .where(eq(fflDataSources.sourceType, sourceType));
    } else {
      // Create new source
      await db.insert(fflDataSources).values({
        sourceType,
        sourceName,
        recordCount,
        lastUpdated: new Date(),
        isActive: true,
        notes: 'Direct integration from ATF directory file'
      });
    }
    
    console.log(`Updated FFL data source tracking: ${sourceName} - ${recordCount} records`);
  } catch (error) {
    console.error('Error updating FFL data source:', error);
  }
}

// Main execution
if (require.main === module) {
  processAtfDirectoryDirect()
    .then(() => {
      console.log('\n✅ ATF directory integration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ ATF directory integration failed:', error);
      process.exit(1);
    });
}

module.exports = { processAtfDirectoryDirect, mapAtfRecordToFfl };