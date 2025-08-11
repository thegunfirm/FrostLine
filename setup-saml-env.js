#!/usr/bin/env node

// Set SAML environment variables directly
process.env.SAML_IDP_SSO_URL = "https://directory.zoho.com/p/896141717/app/1079411000000002069/sso";
process.env.SAML_IDP_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIICkTCCAXkCBgGYmqHaXDANBgkqhkiG9w0BAQsFADAMMQowCAYDVQQDEwFBMB4XDTI1MDgxMDE5
MzU1NVoXDTI4MDgxMDE5MzU1NVowDDEKMAgGA1UEAxMBQTCCASIwDQYJKoZIhvcNAQEBBQADggEP
ADCCAQoCggEBAIM04EXBwhjRwPnL5Xm0rSQuYjER2ehzIyI03q7cZf4Q1Ca8WbR9oijVYnfUm7Yn
9/eJmb9gYLWUdlwk1sDFFzktoaFDMHlSYJ46/+Feue5ZUq+DflX7MhGhQmIXD6CuOoLbnohO9KhD
6aOvJLqQCyC90IZsmoipHKZ0ANKmmngYRgciMaPEvF9s7TcS41Dv9RWXdni4klJ1eGvfKMEQ5FVK
h5X38XKK5VcCpf9/XYPnm1K0x8QGs7Xp7yJZp0s/V8KiVvBJbDodKdfYbOkRaJ4FdhF1cfT0tgMv
rI1rCVHxoamUlMC5cPNnf9kjPB8O/tljD1PySpYYzrUI2SPMiVcCAwEAATANBgkqhkiG9w0BAQsF
AAOCAQEADqKELbE4Lwj+aWcNVt1APEeBAaBCi8vgi5v0uTqNJIhwxXSoemKMpSAwatZMCQyuHiYX
J8/cHqfSXjB/Mzpu+LSVY9jxOBvreNYMgSTMUcqml08FvBcDyx6veJ4z2H9SqFPE4u4X5SPZapiO
CZbI6uh0+98gsRPtPsckrRIvKIN4o4PmvEthxjSa6dJsKjou+BlQJLc/X1cq/RKv5TparbNsXJA7
KWO0DvHU3fepnVxnSRjeSesTW5HRhwsUY+6F5oYrm7EhFbuKs7ME3hS3a24lVtohMXj03BT8Rufo
pN//dmyyguzXinHO767hD8PzMTxoy3hvgfox1Bo5xrw5ig==
-----END CERTIFICATE-----`;
process.env.SAML_REQUIRE_SIGNED_ASSERTIONS = "true";
process.env.SAML_CLOCK_SKEW_SEC = "300";

console.log("✅ SAML environment variables configured");
console.log("🔐 Testing SAML configuration...");

// Test the configuration
const { tsx } = require('tsx');
require('./server/saml-test.ts');