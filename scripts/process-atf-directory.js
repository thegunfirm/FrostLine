#!/usr/bin/env node

const { neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');
const { eq } = require('drizzle-orm');
const { readFileSync } = require('fs');
const XLSX = require('xlsx');
const ws = require('ws');

// Neon configuration for serverless
neonConfig.webSocketConstructor = ws;

// Import schema tables
const { atfDirectoryFiles, ffls } = require('../shared/schema');

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { atfDirectoryFiles, ffls } });

/**
 * Process ATF directory Excel file and integrate into FFL database
 * Usage: node scripts/process-atf-directory.js <fileId>
 */
async function processAtfDirectoryFile(fileId) {
  console.log(`Starting ATF directory processing for file ID: ${fileId}`);
  
  try {
    // Get file record from database
    const [file] = await db.select()
      .from(atfDirectoryFiles)
      .where(eq(atfDirectoryFiles.id, fileId));
    
    if (!file) {
      throw new Error(`ATF directory file with ID ${fileId} not found`);
    }

    console.log(`Processing file: ${file.fileName}`);

    // Read and parse the Excel file
    const workbook = XLSX.readFile(file.filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} records in Excel file`);

    // Update file status and total records count
    await db.update(atfDirectoryFiles)
      .set({
        recordsTotal: data.length,
        processingStatus: 'processing',
        updatedAt: new Date()
      })
      .where(eq(atfDirectoryFiles.id, fileId));

    let recordsProcessed = 0;
    let recordsSkipped = 0;
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
        const existingFfl = await db.select()
          .from(ffls)
          .where(eq(ffls.licenseNumber, fflData.licenseNumber));

        if (existingFfl.length > 0) {
          // Update existing FFL with ATF data
          await db.update(ffls)
            .set({
              ...fflData,
              status: 'NotOnFile', // ATF dealers not partnered with RSR
              updatedAt: new Date()
            })
            .where(eq(ffls.licenseNumber, fflData.licenseNumber));
        } else {
          // Insert new FFL from ATF data
          await db.insert(ffls).values({
            ...fflData,
            status: 'NotOnFile', // ATF dealers not partnered with RSR
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        recordsProcessed++;

        // Log progress every 100 records
        if ((index + 1) % 100 === 0) {
          console.log(`Processed ${index + 1}/${data.length} records`);
          
          // Update progress in database
          await db.update(atfDirectoryFiles)
            .set({
              recordsProcessed,
              recordsSkipped,
              updatedAt: new Date()
            })
            .where(eq(atfDirectoryFiles.id, fileId));
        }

      } catch (error) {
        console.error(`Error processing record ${index + 1}:`, error);
        errors.push(`Record ${index + 1}: ${error.message}`);
        recordsSkipped++;
      }
    }

    // Final update with completion status
    await db.update(atfDirectoryFiles)
      .set({
        processingStatus: 'completed',
        processedAt: new Date(),
        recordsProcessed,
        recordsSkipped,
        errorLog: errors.length > 0 ? errors.join('\n') : null,
        updatedAt: new Date()
      })
      .where(eq(atfDirectoryFiles.id, fileId));

    console.log(`ATF directory processing completed successfully`);
    console.log(`Records processed: ${recordsProcessed}`);
    console.log(`Records skipped: ${recordsSkipped}`);
    console.log(`Errors: ${errors.length}`);

    // Update FFL data source tracking
    await updateFflDataSource('atf', `ATF Directory ${file.periodMonth}/${file.periodYear}`, recordsProcessed);

  } catch (error) {
    console.error('ATF directory processing failed:', error);
    
    // Update file status to failed
    await db.update(atfDirectoryFiles)
      .set({
        processingStatus: 'failed',
        errorLog: error.message,
        updatedAt: new Date()
      })
      .where(eq(atfDirectoryFiles.id, fileId));
      
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
    // ATF Excel columns (based on standard ATF FFL directory format)
    const licenseNumber = record['License Number'] || record['LICENSE NUMBER'] || record['license_number'];
    const businessName = record['Business Name'] || record['BUSINESS NAME'] || record['business_name'];
    const tradeName = record['Trade Name'] || record['TRADE NAME'] || record['trade_name'] || record['DBA'];
    const streetAddress = record['Street Address'] || record['STREET ADDRESS'] || record['address'];
    const city = record['City'] || record['CITY'] || record['city'];
    const state = record['State'] || record['STATE'] || record['state'];
    const zip = record['ZIP'] || record['Zip Code'] || record['zip'];
    const phone = record['Phone'] || record['PHONE'] || record['phone'];

    if (!licenseNumber || !businessName) {
      return null; // Skip records without essential data
    }

    return {
      licenseNumber: licenseNumber.toString().trim(),
      businessName: businessName.toString().trim(),
      tradeNameDba: tradeName ? tradeName.toString().trim() : null,
      address: {
        street: streetAddress ? streetAddress.toString().trim() : '',
        city: city ? city.toString().trim() : '',
        state: state ? state.toString().trim() : '',
        zipCode: zip ? zip.toString().trim() : ''
      },
      phone: phone ? phone.toString().trim() : null,
      email: null, // ATF directory typically doesn't include email
      website: null, // ATF directory typically doesn't include website
      fflType: 'Dealer', // Most ATF licenses are dealer licenses
      specialOccupationalTax: false, // Default, can be updated manually
      preferredShipping: false, // Default for ATF-only dealers
      notes: 'Added from ATF Federal Firearms License Directory'
    };
  } catch (error) {
    console.error('Error mapping ATF record:', error);
    return null;
  }
}

/**
 * Update FFL data source tracking
 */
async function updateFflDataSource(sourceType, sourceName, recordCount) {
  const { fflDataSources } = require('../shared/schema');
  
  try {
    // Check if data source exists
    const existingSource = await db.select()
      .from(fflDataSources)
      .where(eq(fflDataSources.sourceType, sourceType));

    if (existingSource.length > 0) {
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
        notes: 'Automated processing from ATF directory file'
      });
    }
  } catch (error) {
    console.error('Error updating FFL data source:', error);
  }
}

// Main execution
if (require.main === module) {
  const fileId = process.argv[2];
  if (!fileId) {
    console.error('Usage: node scripts/process-atf-directory.js <fileId>');
    process.exit(1);
  }

  processAtfDirectoryFile(parseInt(fileId))
    .then(() => {
      console.log('ATF directory processing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('ATF directory processing failed:', error);
      process.exit(1);
    });
}

module.exports = { processAtfDirectoryFile, mapAtfRecordToFfl };