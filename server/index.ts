import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import samlRoutes from "./saml-routes";
import passport from 'passport';

// Set Zoho environment variables - using webservices app credentials for tech@thegunfirm.com
if (!process.env.ZOHO_CLIENT_ID) {
  // Use webservices app credentials if available, otherwise use existing
  process.env.ZOHO_CLIENT_ID = process.env.ZOHO_WEBSERVICES_CLIENT_ID || "1000.8OVSJ4V07OOVJWYAC0KA1JEFNH2W3M";
}
if (!process.env.ZOHO_CLIENT_SECRET) {
  process.env.ZOHO_CLIENT_SECRET = process.env.ZOHO_WEBSERVICES_CLIENT_SECRET || "4d4b2ab7f0f731102c7d15d6754f1f959251db68e0";
}
if (!process.env.ZOHO_REDIRECT_URI) {
  // Use current Replit domain for OAuth callback - this was the working pattern
  const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + '.replit.dev';
  process.env.ZOHO_REDIRECT_URI = `https://${replitDomain}/api/zoho/auth/callback`;
}
if (!process.env.ZOHO_ACCOUNTS_HOST) {
  process.env.ZOHO_ACCOUNTS_HOST = "https://accounts.zoho.com";
}
if (!process.env.ZOHO_CRM_BASE) {
  process.env.ZOHO_CRM_BASE = "https://www.zohoapis.com";
}

// Set SAML environment variables for development
if (!process.env.SAML_IDP_SSO_URL) {
  process.env.SAML_IDP_SSO_URL = "https://directory.zoho.com/p/896141717/app/1079411000000002069/sso";
}
if (!process.env.SAML_IDP_CERT_PEM) {
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
}
if (!process.env.SAML_REQUIRE_SIGNED_ASSERTIONS) {
  process.env.SAML_REQUIRE_SIGNED_ASSERTIONS = "true";
}
if (!process.env.SAML_CLOCK_SKEW_SEC) {
  process.env.SAML_CLOCK_SKEW_SEC = "300";
}
import { setupVite, serveStatic, log } from "./vite";
import { rsrAutoSync } from "./services/rsr-auto-sync";
import { pricingService } from "./services/pricing-service";
import { automaticZohoTokenManager } from "./services/automatic-zoho-token-manager";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: true, // Changed to true for OAuth state persistence
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax' // Added for better cross-site compatibility
  }
}));

// Initialize Passport for SAML authentication, but skip for local auth endpoints
app.use((req, res, next) => {
  // Skip Passport processing for local authentication endpoints
  if (req.path === '/api/login' || req.path === '/api/register') {
    return next();
  }
  passport.initialize()(req, res, next);
});

app.use((req, res, next) => {
  // Skip Passport session processing for local authentication endpoints
  if (req.path === '/api/login' || req.path === '/api/register') {
    return next();
  }
  passport.session()(req, res, next);
});

// Passport session serialization
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize pricing service
  await pricingService.initializeDefaultPricing();
  
  // Initialize automatic Zoho token management
  try {
    // Start the automatic token manager
    const token = await automaticZohoTokenManager.ensureValidToken();
    if (token) {
      console.log('✅ Automatic Zoho token management started successfully');
      console.log('🔄 Tokens will refresh automatically every 50 minutes');
    } else {
      console.log('⚠️ No valid Zoho tokens - will refresh when available');
    }
  } catch (error) {
    console.error('⚠️ Failed to initialize automatic token management:', error);
  }
  
  // Auto-sync disabled during data integrity work
  // rsrAutoSync.start();
  
  // Register SAML routes
  app.use('/sso/saml', samlRoutes);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
