/**
 * Direct Authorize.Net Service Test
 * Tests the service directly without HTTP endpoint
 */

async function testAuthorizeNetService() {
  console.log('🔧 Testing Authorize.Net Service Directly...');
  
  try {
    // Import the service directly using dynamic import
    const { authorizeNetService } = await import('./server/authorize-net-service.js');
    
    console.log('✅ Service imported successfully');
    
    const testResult = await authorizeNetService.authOnlyTransaction(
      1.00,
      '4111111111111111',
      '1225',
      '123',
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      }
    );
    
    console.log('✅ Authorization Test Result:');
    console.log(JSON.stringify(testResult, null, 2));
    
  } catch (error) {
    console.log('❌ Direct Service Test Error:');
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
  }
}

testAuthorizeNetService().then(() => {
  console.log('🏁 Direct service test complete');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});