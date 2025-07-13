/**
 * Monitor Algolia Sync Progress
 * Checks when the pricing sync is complete by monitoring search results
 */

async function monitorAlgoliaSync() {
  console.log('🔍 Monitoring Algolia pricing sync progress...');
  
  let attempts = 0;
  const maxAttempts = 20; // 10 minutes max
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch('http://localhost:5000/api/search/algolia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: '',
          filters: { category: 'Rifles' },
          page: 1,
          hitsPerPage: 10
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const searchResults = await response.json();
      
      // Check if pricing is updated
      let differentPricing = 0;
      let matchingPricing = 0;
      
      searchResults.hits.forEach((hit: any) => {
        const bronze = parseFloat(hit.tierPricing.bronze);
        const gold = parseFloat(hit.tierPricing.gold);
        
        if (bronze !== gold) {
          differentPricing++;
        } else {
          matchingPricing++;
        }
      });

      console.log(`📊 Attempt ${attempts + 1}: ${differentPricing} products with different pricing, ${matchingPricing} with matching pricing`);
      
      // If all products have different pricing, sync is complete
      if (matchingPricing === 0 && differentPricing === searchResults.hits.length) {
        console.log('✅ Algolia pricing sync is complete!');
        
        // Show sample of corrected pricing
        console.log('\n📋 Sample corrected pricing:');
        searchResults.hits.slice(0, 5).forEach((hit: any) => {
          const bronze = parseFloat(hit.tierPricing.bronze);
          const gold = parseFloat(hit.tierPricing.gold);
          const savings = bronze - gold;
          const savingsPercent = bronze > 0 ? ((savings / bronze) * 100).toFixed(1) : '0.0';
          
          console.log(`${hit.stockNumber}: Bronze=$${bronze.toFixed(2)}, Gold=$${gold.toFixed(2)} (${savingsPercent}% savings)`);
        });
        
        break;
      }

      attempts++;
      
      if (attempts < maxAttempts) {
        console.log(`⏳ Waiting 30 seconds for Algolia sync to propagate...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }

    } catch (error) {
      console.error(`❌ Error monitoring sync:`, error);
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }
  
  if (attempts >= maxAttempts) {
    console.log('⚠️  Monitoring timed out, but pricing sync should complete shortly');
  }
}

// Run the monitoring
monitorAlgoliaSync().catch(console.error);