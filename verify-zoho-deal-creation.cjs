const axios = require('axios');

async function verifyZohoDeal() {
  try {
    // Use the webservices token for verification
    const zohoWebservicesAccessToken = process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN;
    
    if (!zohoWebservicesAccessToken) {
      console.error('❌ ZOHO_WEBSERVICES_ACCESS_TOKEN not found');
      return;
    }

    console.log('🔍 Verifying Deal 6585331000001077001 in Zoho CRM...');
    
    // Fetch the deal details
    const dealResponse = await axios.get(
      'https://www.zohoapis.com/crm/v3/Deals/6585331000001077001',
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${zohoWebservicesAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const deal = dealResponse.data.data[0];
    console.log('✅ Deal found:', {
      id: deal.id,
      dealName: deal.Deal_Name,
      amount: deal.Amount,
      stage: deal.Stage,
      tgfOrder: deal.TGF_Order,
      fulfillmentType: deal.Fulfillment_Type,
      orderStatus: deal.Order_Status
    });

    // Check subform data
    if (deal.Subform_1 && deal.Subform_1.length > 0) {
      console.log(`✅ Subform contains ${deal.Subform_1.length} products:`);
      deal.Subform_1.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.Product_Name} (${item.Product_Code})`);
        console.log(`     Qty: ${item.Quantity}, Price: $${item.Unit_Price}`);
        console.log(`     RSR: ${item.Distributor_Part_Number}, FFL: ${item.FFL_Required}`);
      });
    } else {
      console.log('⚠️ No subform data found');
    }

    console.log('🎉 Zoho integration verification complete - deal is properly created!');

  } catch (error) {
    console.error('❌ Verification failed:', error.response?.data || error.message);
  }
}

verifyZohoDeal();