// Test with the correct token directly
const correctToken = '1000.63659b48fea467278e02ce4d71fe93dd.9649b0449616a7b69df9a6b44b744430';

async function testCorrectToken() {
  console.log('Testing correct token directly...');
  
  try {
    const response = await fetch('https://www.zohoapis.com/crm/v2/Contacts?per_page=5', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${correctToken}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok && result.data) {
      console.log('✅ Correct token works!');
      console.log(`Found ${result.data.length} contacts`);
      
      // Show the first contact for verification
      if (result.data.length > 0) {
        const firstContact = result.data[0];
        console.log('First contact:', {
          id: firstContact.id,
          email: firstContact.Email,
          name: `${firstContact.First_Name || ''} ${firstContact.Last_Name || ''}`.trim()
        });
        
        // Check for our test users
        const testEmails = ['bronze.test@example.com', 'gold.test@example.com', 'platinum.test@example.com'];
        const testContacts = result.data.filter(contact => testEmails.includes(contact.Email));
        
        if (testContacts.length > 0) {
          console.log(`\n🎯 Found ${testContacts.length} test users:`);
          testContacts.forEach(contact => {
            console.log(`  - ${contact.Email}: ${contact.First_Name} ${contact.Last_Name} (ID: ${contact.id})`);
          });
        }
      }
    } else {
      console.log('❌ Token still failed:', result);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testCorrectToken();