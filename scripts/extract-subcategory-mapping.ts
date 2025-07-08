/**
 * Extract Complete RSR Subcategory Mapping
 */

import fs from 'fs';

async function extractSubcategoryMapping() {
  console.log('🔍 Extracting complete RSR subcategory mapping...');
  
  const filePath = 'server/data/rsr/downloads/rsrinventory-new.txt';
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  // Map department -> subcategory -> product examples
  const subcategoryMap = new Map<string, Map<string, string[]>>();
  
  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length >= 15) {
      const departmentNumber = fields[3];
      const subcategoryCode = fields[9];
      const productName = fields[2];
      
      if (departmentNumber && subcategoryCode && productName) {
        if (!subcategoryMap.has(departmentNumber)) {
          subcategoryMap.set(departmentNumber, new Map());
        }
        
        const deptMap = subcategoryMap.get(departmentNumber)!;
        if (!deptMap.has(subcategoryCode)) {
          deptMap.set(subcategoryCode, []);
        }
        
        const examples = deptMap.get(subcategoryCode)!;
        if (examples.length < 3) {
          examples.push(productName);
        }
      }
    }
  }
  
  // Display mapping for each department
  const sortedDepartments = Array.from(subcategoryMap.keys()).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const dept of sortedDepartments) {
    const deptMap = subcategoryMap.get(dept)!;
    const sortedSubcats = Array.from(deptMap.keys()).sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
    
    console.log(`\n📂 DEPARTMENT ${dept} SUBCATEGORIES:`);
    console.log('='.repeat(50));
    
    for (const subcat of sortedSubcats) {
      const examples = deptMap.get(subcat)!;
      console.log(`${subcat.padStart(3)}: ${examples.join(' | ')}`);
    }
  }
  
  // Focus on Department 01 (Handguns) with detailed analysis
  console.log(`\n🔫 DEPARTMENT 01 (HANDGUNS) DETAILED BREAKDOWN:`);
  console.log('='.repeat(60));
  
  const handgunMap = subcategoryMap.get('01');
  if (handgunMap) {
    const handgunSubcats = Array.from(handgunMap.keys()).sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
    
    for (const subcat of handgunSubcats) {
      const examples = handgunMap.get(subcat)!;
      
      // Analyze patterns to determine subcategory meaning
      const sampleText = examples.join(' ').toLowerCase();
      let category = 'Unknown';
      
      if (sampleText.includes('1911')) category = '1911 Pistols';
      else if (sampleText.includes('glock')) category = 'Glock Pistols';
      else if (sampleText.includes('sig') || sampleText.includes('p320') || sampleText.includes('p365')) category = 'SIG Sauer Pistols';
      else if (sampleText.includes('cz')) category = 'CZ Pistols';
      else if (sampleText.includes('revolver') || sampleText.includes('357') || sampleText.includes('38spl')) category = 'Revolvers';
      else if (sampleText.includes('ar') || sampleText.includes('pstl') || sampleText.includes('rifle')) category = 'AR/Rifle Pistols';
      else if (sampleText.includes('22lr') || sampleText.includes('22wmr')) category = '.22 Caliber Pistols';
      else if (sampleText.includes('9mm')) category = '9mm Pistols';
      else if (sampleText.includes('45acp')) category = '.45 ACP Pistols';
      else if (sampleText.includes('380')) category = '.380 ACP Pistols';
      else if (sampleText.includes('40sw')) category = '.40 S&W Pistols';
      else if (sampleText.includes('10mm')) category = '10mm Pistols';
      
      console.log(`${subcat.padStart(3)} (${category}): ${examples.join(' | ')}`);
    }
  }
  
  // Show subcategory 305 specifically
  console.log(`\n🎯 SUBCATEGORY 305 ANALYSIS (Your Springfield XD):`);
  console.log('='.repeat(50));
  
  if (handgunMap?.has('305')) {
    const examples305 = handgunMap.get('305')!;
    console.log(`Found ${examples305.length} examples in subcategory 305:`);
    examples305.forEach((example, i) => {
      console.log(`${i + 1}. ${example}`);
    });
    
    // Analyze what makes subcategory 305 unique
    const text305 = examples305.join(' ').toLowerCase();
    console.log(`\nPattern Analysis for 305:`);
    console.log(`- Contains "9mm": ${text305.includes('9mm')}`);
    console.log(`- Contains "45acp": ${text305.includes('45acp')}`);
    console.log(`- Contains "polymer": ${text305.includes('polymer')}`);
    console.log(`- Contains "striker": ${text305.includes('striker')}`);
    console.log(`- Contains "xd": ${text305.includes('xd')}`);
    console.log(`- Contains "springfield": ${text305.includes('springfield')}`);
  }
}

extractSubcategoryMapping().catch(console.error);