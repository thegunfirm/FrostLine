// Check Zoho Products module field configuration
console.log('🔧 Checking Zoho Products module field configuration');

async function checkFieldConfiguration() {
  try {
    // Get fresh token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ZOHO_WEBSERVICES_CLIENT_ID,
        client_secret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET,
        refresh_token: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN
      })
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('Failed to get token');
    }
    
    console.log('✅ Token obtained');
    
    // Get Products module field metadata
    console.log('📋 Fetching Products module field metadata...');
    
    const fieldsResponse = await fetch('https://www.zohoapis.com/crm/v2/settings/fields?module=Products', {
      headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
    });
    
    const fieldsData = await fieldsResponse.json();
    
    if (fieldsData.fields) {
      console.log(`📦 Found ${fieldsData.fields.length} fields in Products module`);
      
      // Look for critical fields
      const criticalFields = ['Product_Code', 'Distributor_Part_Number', 'Product_Name', 'Manufacturer'];
      
      console.log('\n🔍 Checking critical field configurations:');
      
      criticalFields.forEach(fieldName => {
        const field = fieldsData.fields.find(f => f.api_name === fieldName);
        
        if (field) {
          console.log(`\n✅ ${fieldName}:`);
          console.log(`   Data Type: ${field.data_type}`);
          console.log(`   Required: ${field.required || false}`);
          console.log(`   Read Only: ${field.read_only || false}`);
          console.log(`   API Name: ${field.api_name}`);
          console.log(`   Display Label: ${field.display_label}`);
          console.log(`   Max Length: ${field.length || 'N/A'}`);
          console.log(`   Unique: ${field.unique || false}`);
          console.log(`   Formula: ${field.formula ? 'Yes' : 'No'}`);
          console.log(`   System Mandatory: ${field.system_mandatory || false}`);
          
          if (field.read_only) {
            console.log(`   ⚠️  WARNING: ${fieldName} is READ-ONLY!`);
          }
          
          if (field.formula) {
            console.log(`   ⚠️  WARNING: ${fieldName} is a FORMULA field!`);
            console.log(`   Formula: ${field.formula.expression || 'N/A'}`);
          }
        } else {
          console.log(`\n❌ ${fieldName}: FIELD NOT FOUND!`);
        }
      });
      
      // Look for any custom fields that might be related
      console.log('\n🔍 Looking for custom fields related to product codes or distributor parts...');
      
      const relatedFields = fieldsData.fields.filter(field => 
        field.api_name.toLowerCase().includes('code') ||
        field.api_name.toLowerCase().includes('part') ||
        field.api_name.toLowerCase().includes('sku') ||
        field.api_name.toLowerCase().includes('distributor')
      );
      
      if (relatedFields.length > 0) {
        console.log(`📋 Found ${relatedFields.length} potentially related fields:`);
        relatedFields.forEach(field => {
          console.log(`  - ${field.api_name} (${field.display_label}) - Type: ${field.data_type}`);
          if (field.read_only || field.formula) {
            console.log(`    ⚠️  ${field.read_only ? 'READ-ONLY' : ''} ${field.formula ? 'FORMULA' : ''}`);
          }
        });
      } else {
        console.log('❌ No related fields found');
      }
      
      // Check permissions for the webservices app
      console.log('\n🔒 Checking field permissions...');
      
      const permissionsResponse = await fetch('https://www.zohoapis.com/crm/v2/settings/roles', {
        headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
      });
      
      const permissionsData = await permissionsResponse.json();
      
      if (permissionsData.roles) {
        console.log(`👥 Found ${permissionsData.roles.length} roles in the organization`);
        
        // Look for webservices app role or similar
        const webservicesRole = permissionsData.roles.find(role => 
          role.name.toLowerCase().includes('webservices') ||
          role.name.toLowerCase().includes('api') ||
          role.name.toLowerCase().includes('integration')
        );
        
        if (webservicesRole) {
          console.log(`✅ Found integration role: ${webservicesRole.name}`);
        } else {
          console.log('⚠️  No specific webservices/API role found');
        }
      }
      
    } else {
      console.log('❌ No fields data received');
    }
    
    console.log('\n📝 Summary of findings:');
    console.log('- Check if Product_Code and Distributor_Part_Number fields exist');
    console.log('- Check if they are read-only or formula fields');
    console.log('- Check if the webservices app has permission to write to these fields');
    
  } catch (error) {
    console.log('❌ Field check failed:', error.message);
  }
}

checkFieldConfiguration();