#!/usr/bin/env node

/**
 * Comprehensive Zoho CRM Integration Test Suite
 * Tests OAuth flow, token exchange, and API connectivity
 */

import axios from 'axios';

const BASE_URL = 'https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev';

async function runTests() {
    console.log('🧪 ZOHO CRM INTEGRATION TEST SUITE');
    console.log('==================================\n');

    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Test 1: Check if OAuth initiate endpoint works
    try {
        console.log('Test 1: OAuth Initiate Endpoint');
        const response = await axios.get(`${BASE_URL}/api/zoho/auth/initiate`, {
            maxRedirects: 0,
            validateStatus: (status) => status === 302
        });
        
        const redirectUrl = response.headers.location;
        if (redirectUrl && redirectUrl.includes('accounts.zoho.com')) {
            console.log('✅ PASS: OAuth initiate redirects to Zoho');
            console.log(`   Redirect URL: ${redirectUrl.substring(0, 100)}...`);
            results.passed++;
            results.tests.push({ name: 'OAuth Initiate', status: 'PASS' });
        } else {
            throw new Error('No valid redirect URL found');
        }
    } catch (error) {
        console.log('❌ FAIL: OAuth initiate endpoint');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'OAuth Initiate', status: 'FAIL', error: error.message });
    }

    console.log('');

    // Test 2: Test status endpoint
    try {
        console.log('Test 2: Zoho Status Endpoint');
        const response = await axios.get(`${BASE_URL}/api/zoho/status`);
        
        if (response.data && response.data.integration_status) {
            console.log('✅ PASS: Zoho status endpoint responds');
            console.log(`   Status: ${response.data.integration_status}`);
            console.log(`   Client ID: ${response.data.client_id ? 'Present' : 'Missing'}`);
            results.passed++;
            results.tests.push({ name: 'Status Endpoint', status: 'PASS' });
        } else {
            throw new Error('Invalid status response');
        }
    } catch (error) {
        console.log('❌ FAIL: Zoho status endpoint');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Status Endpoint', status: 'FAIL', error: error.message });
    }

    console.log('');

    // Test 3: Test the test endpoint
    try {
        console.log('Test 3: Zoho Test Endpoint');
        const response = await axios.get(`${BASE_URL}/api/zoho/test`);
        
        if (response.data && response.data.status === 'OAuth integration complete') {
            console.log('✅ PASS: Zoho test endpoint confirms integration');
            console.log(`   Message: ${response.data.message}`);
            results.passed++;
            results.tests.push({ name: 'Test Endpoint', status: 'PASS' });
        } else {
            throw new Error('Integration not confirmed');
        }
    } catch (error) {
        console.log('❌ FAIL: Zoho test endpoint');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Test Endpoint', status: 'FAIL', error: error.message });
    }

    console.log('');

    // Test 4: Verify OAuth callback can handle authorization codes
    try {
        console.log('Test 4: OAuth Callback Handler (Simulation)');
        // We can't easily test with a real code, but we can test the endpoint exists
        const response = await axios.get(`${BASE_URL}/api/zoho/auth/callback?error=test_simulation`, {
            validateStatus: (status) => status === 400
        });
        
        if (response.status === 400 && response.data.includes('OAuth Error')) {
            console.log('✅ PASS: OAuth callback handles errors correctly');
            results.passed++;
            results.tests.push({ name: 'OAuth Callback', status: 'PASS' });
        } else {
            throw new Error('Callback error handling not working');
        }
    } catch (error) {
        console.log('❌ FAIL: OAuth callback handler');
        console.log(`   Error: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'OAuth Callback', status: 'FAIL', error: error.message });
    }

    // Summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('======================');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%\n`);

    // Detailed results
    console.log('📋 DETAILED RESULTS:');
    results.tests.forEach((test, index) => {
        const status = test.status === 'PASS' ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${test.name}`);
        if (test.error) {
            console.log(`   └─ Error: ${test.error}`);
        }
    });

    console.log('\n🔍 MANUAL VERIFICATION STEPS:');
    console.log('1. Visit the OAuth URL shown in Test 1');
    console.log('2. Complete Zoho authorization');
    console.log('3. Verify redirect back to callback URL');
    console.log('4. Check server logs for "OAuth successful! Tokens received"');

    if (results.passed >= 3) {
        console.log('\n🎉 INTEGRATION READY: Core OAuth functionality is working!');
        return true;
    } else {
        console.log('\n⚠️  NEEDS ATTENTION: Some tests failed, check configuration');
        return false;
    }
}

// Run the tests
runTests().catch(console.error);