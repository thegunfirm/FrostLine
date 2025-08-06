#!/usr/bin/env node

/**
 * ATF FFL Directory Processing Script
 * Parses the ATF Excel file and cross-references with RSR data to create comprehensive FFL directory
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db.ts';
import { ffls } from '../shared/schema.ts';
import { eq, sql } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🇺🇸 Processing ATF FFL Directory...');

// Load and parse the ATF Excel file
const parseAtfFile = () => {
  const filePath = path.join(__dirname, '..', 'server', 'data', 'atf', 'downloads', 'atf-ffl-list.xls');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ ATF file not found. Run download-atf-directory.js first.');
    process.exit(1);
  }

  console.log('📊 Reading ATF Excel file...');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  console.log(`📋 Found ${data.length} ATF FFL records`);
  
  return data;
};

// Clean and standardize ATF data
const processAtfRecord = (record) => {
  // ATF file structure (may vary):
  // License Number, License Name, Trade Name, License Type, Premises Address, Mailing Address, Expiration Date
  
  const licenseNumber = record['License Number'] || record['LICENSE NUMBER'] || record['LicenseNumber'];
  const businessName = record['License Name'] || record['LICENSE NAME'] || record['LicenseName'];
  const tradeNameDba = record['Trade Name'] || record['TRADE NAME'] || record['TradeName'];
  const licenseType = record['License Type'] || record['LICENSE TYPE'] || record['LicenseType'];
  
  // Parse premises address
  const premisesAddress = record['Premises Address'] || record['PREMISES ADDRESS'] || record['PremisesAddress'] || '';
  const addressParts = premisesAddress.split(',').map(part => part.trim());
  
  // Parse mailing address
  const mailingAddress = record['Mailing Address'] || record['MAILING ADDRESS'] || record['MailingAddress'] || '';
  
  // Extract expiration date
  const expirationDate = record['Expiration Date'] || record['EXPIRATION DATE'] || record['ExpirationDate'];
  
  // Parse address components (basic parsing)
  let street = '', city = '', state = '', zip = '';
  if (addressParts.length >= 3) {
    street = addressParts[0] || '';
    city = addressParts[addressParts.length - 2] || '';
    const lastPart = addressParts[addressParts.length - 1] || '';
    
    // Extract state and zip from last part (e.g., "AZ 85387")
    const stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
    if (stateZipMatch) {
      state = stateZipMatch[1];
      zip = stateZipMatch[2].split('-')[0]; // Take first 5 digits
    }
  }

  return {
    licenseNumber: licenseNumber ? String(licenseNumber).trim() : null,
    businessName: businessName ? String(businessName).trim() : null,
    tradeNameDba: tradeNameDba ? String(tradeNameDba).trim() : null,
    licenseType: licenseType ? String(licenseType).trim() : null,
    address: {
      street: street,
      city: city,
      state: state,
      zip: zip
    },
    zip: zip,
    mailingAddress: mailingAddress ? String(mailingAddress).trim() : null,
    licenseExpiration: expirationDate ? new Date(expirationDate) : null,
    isAtfActive: true,
    lastAtfUpdate: new Date()
  };
};

// Get RSR FFL license numbers for cross-referencing
const getRsrFflNumbers = async () => {
  const rsrFile = path.join(__dirname, '..', 'server', 'data', 'distributors', 'rsr', 'downloads', 'inventory', 'ffl-transfer-dealers.txt');
  
  if (!fs.existsSync(rsrFile)) {
    console.warn('⚠️ RSR FFL file not found. All FFLs will be marked as NotOnFile.');
    return new Set();
  }

  const rsrData = fs.readFileSync(rsrFile, 'utf-8');
  const rsrLines = rsrData.split('\n').filter(line => line.trim());
  
  const rsrFflNumbers = new Set();
  rsrLines.forEach(line => {
    const parts = line.split('\t');
    if (parts.length >= 2) {
      const licenseNumber = parts[1].trim(); // FFL license number is second field
      if (licenseNumber) {
        rsrFflNumbers.add(licenseNumber);
      }
    }
  });

  console.log(`🔗 Found ${rsrFflNumbers.size} RSR partner FFLs for cross-referencing`);
  return rsrFflNumbers;
};

// Main processing function
const main = async () => {
  try {
    // Parse ATF data
    const atfData = parseAtfFile();
    
    // Get RSR FFL numbers
    const rsrFflNumbers = await getRsrFflNumbers();
    
    // Process each ATF record
    console.log('🔄 Processing ATF records...');
    let processed = 0;
    let onFileCount = 0;
    let notOnFileCount = 0;
    let errors = 0;

    for (const rawRecord of atfData) {
      try {
        const record = processAtfRecord(rawRecord);
        
        if (!record.licenseNumber || !record.businessName) {
          errors++;
          continue;
        }

        // Determine status based on RSR cross-reference
        const isRsrPartner = rsrFflNumbers.has(record.licenseNumber);
        const status = isRsrPartner ? 'OnFile' : 'NotOnFile';
        
        if (isRsrPartner) onFileCount++;
        else notOnFileCount++;

        // Check if FFL already exists
        const existing = await db.select().from(ffls).where(eq(ffls.licenseNumber, record.licenseNumber)).limit(1);
        
        if (existing.length > 0) {
          // Update existing record
          await db.update(ffls)
            .set({
              businessName: record.businessName,
              tradeNameDba: record.tradeNameDba,
              licenseType: record.licenseType,
              address: record.address,
              zip: record.zip,
              status: status,
              isRsrPartner: isRsrPartner,
              isAtfActive: record.isAtfActive,
              licenseExpiration: record.licenseExpiration,
              lastAtfUpdate: record.lastAtfUpdate
            })
            .where(eq(ffls.licenseNumber, record.licenseNumber));
        } else {
          // Insert new record
          await db.insert(ffls).values({
            businessName: record.businessName,
            licenseNumber: record.licenseNumber,
            tradeNameDba: record.tradeNameDba,
            licenseType: record.licenseType,
            address: record.address,
            zip: record.zip,
            status: status,
            isRsrPartner: isRsrPartner,
            isAtfActive: record.isAtfActive,
            licenseExpiration: record.licenseExpiration,
            lastAtfUpdate: record.lastAtfUpdate,
            isAvailableToUser: true
          });
        }

        processed++;
        
        if (processed % 1000 === 0) {
          console.log(`   Processed ${processed}/${atfData.length} records...`);
        }
        
      } catch (error) {
        errors++;
        console.error(`Error processing record: ${error.message}`);
      }
    }

    console.log('');
    console.log('✅ ATF FFL Directory Processing Complete!');
    console.log(`📊 Statistics:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   On File (RSR partners): ${onFileCount}`);
    console.log(`   Not On File: ${notOnFileCount}`);
    console.log(`   Errors: ${errors}`);
    console.log('');
    console.log('🎯 Status Legend:');
    console.log('   OnFile = FFL is on RSR partner list (can handle RSR orders)');
    console.log('   NotOnFile = FFL exists in ATF directory but not RSR partner');
    console.log('   Preferred = Staff-marked FFLs (managed in CMS)');

    // Update status file
    const statusFile = path.join(__dirname, '..', 'server', 'data', 'atf', 'atf-sync-status.json');
    const status = {
      lastProcessed: new Date().toISOString(),
      totalRecords: atfData.length,
      processedRecords: processed,
      onFileCount: onFileCount,
      notOnFileCount: notOnFileCount,
      errors: errors,
      status: 'completed'
    };
    
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    
  } catch (error) {
    console.error('❌ Error processing ATF directory:', error.message);
    process.exit(1);
  }
};

main();