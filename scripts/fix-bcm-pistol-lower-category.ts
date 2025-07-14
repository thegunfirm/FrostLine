/**
 * Fix BCM Pistol Lower Category
 * Updates the BCM PSTL LOWER GROUP to correct "Uppers/Lowers" category in Algolia
 */

async function fixBCMPistolLowerCategory() {
  console.log('🔧 Fixing BCM Pistol Lower category in Algolia...');
  
  try {
    // Update the specific product in Algolia
    const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          action: 'partialUpdateObject',
          body: {
            objectID: 'BCMLRG-PISTOL',
            categoryName: 'Uppers/Lowers',
            departmentNumber: '41'
          }
        }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Algolia update failed:', errorText);
      process.exit(1);
    }
    
    console.log('✅ BCM Pistol Lower category updated successfully');
    console.log('📋 Changes applied:');
    console.log('   • Product: BCM PSTL LOWER GROUP W/RCVR EXT 556');
    console.log('   • Category: Handguns → Uppers/Lowers');
    console.log('   • Department: 01 → 41');
    
  } catch (error) {
    console.error('❌ Error fixing BCM pistol lower category:', error);
    process.exit(1);
  }
}

// Run the fix
fixBCMPistolLowerCategory();