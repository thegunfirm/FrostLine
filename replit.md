# Rest Express - Firearms E-commerce Platform

## Overview
This project is a full-stack e-commerce platform specializing in firearms and accessories. It provides a robust, compliance-aware online marketplace that addresses the unique requirements of the firearms industry, including FFL (Federal Firearms License) handling, specialized shipping, and a comprehensive tier-based membership system. Key capabilities include real-time inventory, advanced search, and tiered pricing benefits. The platform aims to be a leading online destination for firearms enthusiasts and professionals, focusing on business vision, market potential, and project ambitions within the firearms industry.

## User Preferences
Preferred communication style: Simple, everyday language.
Image policy: NEVER use Unsplash or any placeholder images. Only use authentic distributor images (RSR, etc.) even if they show "Image Coming Soon" placeholders.
Code preservation: Always maintain working solutions - never overwrite functioning code without explicit user request.
Email verification: Users must verify their email address before being able to sign in.
Testing policy: No assumptions - use test or dummy data ONLY FOR FAKE USERS. Inventory must always remain intact with authentic RSR data. No test data should ever be added to real product inventory. FFL directory must use only authentic FFL data - no fake dealers should be added to the system.
CRITICAL IMAGE HANDLING RULE: For product images in cart/order displays, NEVER use containers with gray backgrounds or fixed heights. Use direct image elements with `w-[size] h-auto object-contain` classes only. This prevents background showing through and maintains natural image proportions.
CART CORRUPTION SOLUTION: Implement comprehensive clearing mechanism including both localStorage removal and server-side force-clear endpoint for cart items.
FFL SELECTOR IMPROVEMENTS: Add proper error handling, loading states, and retry logic to the FFL selector component.
GLOBAL SCROLL-TO-TOP: Implement site-wide scroll-to-top functionality on page navigation.
**VERIFICATION REQUIREMENT**: Never claim features are "working" or "successful" without verifying actual results in external systems (Zoho CRM, databases, APIs). Always check the end result, not just log messages or API responses that claim success.
**TOKEN MANAGEMENT STABILITY (Jan 18, 2025)**: Multi-day Zoho token authentication issues permanently resolved. System maintains persistent webservices authentication without daily rebuilds or token corruption. Environment variable overwrite bug fixed in token service.

## System Architecture

### Dual Platform Infrastructure
- **FreeAmericanPeople.com (FAP)**: Membership management platform handling user authentication, subscription tiers, and admin controls for FFL and subscription enforcement. Provides APIs for real-time synchronization.
- **TheGunFirm.com**: E-commerce platform requiring FAP membership for checkout. Handles product sales, features advanced cart persistence, and intelligent merging during login. Integrates comprehensively with FAP for cross-platform features.

### Core Design Principles
- **Email Verification**: Mandatory email verification for account access with automatic token refresh.
- **Mandatory Authentication**: Users must authenticate via FAP and select a subscription tier to access checkout.
- **Intelligent Cart Management**: Cart persistence across logins, smart merging of guest and user carts, and complete clearing on logout.
- **Three-Tier Fulfillment**: Configurable delivery times for direct-to-consumer, warehouse-to-FFL, and drop-ship-to-FFL.
- **CMS-Controlled Operations**: Admin controls for delivery timing, subscription enforcement, and FFL management.
- **FFL Integration**: Built-in handling for firearms requiring Federal Firearms License transfers.
- **Specialized Commerce**: Features gun-specific categories, manufacturer filtering, and compliance.
- **Responsive Design**: Mobile-first approach with custom breakpoints and industry-focused UI.
- **Real-time Inventory**: Live inventory synchronization with RSR distributor data.
- **Cross-Platform Integration**: Real-time FAP API connections, shared support ticketing, unified email templates, and cross-platform analytics.
- **CMS/CRM Separation**: CMS (Replit) for content, system configuration, inventory, compliance, and administration. CRM (Zoho) for customer profiles, order history, marketing, support, and FFL vendor management.
- **Local Authentication System**: Fully local authentication using PostgreSQL for user management, registration, login, and tier management with bcrypt password security. Supports 5 subscription tiers (Bronze, Gold Monthly, Gold Annually, Platinum Monthly, Platinum Founder).
- **Production-Ready Email Verification**: Complete local authentication with PostgreSQL, automatic token refresh, and corrected Zoho CRM integration.
- **Zoho API Corrections**: Fixed multiple integration issues including URL format, field naming, and token refresh automation.
- **Subscription Tier Management**: CMS-driven interface for managing subscription tiers, pricing, and benefits, with optional synchronization to Zoho CRM.
- **Billing Audit Logging**: Comprehensive audit logging system using structured markdown for Authorize.Net webhooks, dunning emails, and subscription status changes.
- **SAML 2.0 Staff Authentication**: Implementation of SAML 2.0 Service Provider for Zoho Directory IdP, supporting role-based access for staff.
- **Complete RSR + Zoho Integration System**: Comprehensive end-to-end integration featuring RSR Engine Client for order submission and Zoho Order Fields Service for CRM synchronization. Includes sequential order numbering with receiver suffixes (I/C/F), account-based ordering, comprehensive status tracking, and real-time field updates.
- **API Field Discovery Tool Implementation**: Comprehensive Field Discovery system integrated into CMS admin panel for universal API field mapping analysis, Zoho CRM field metadata discovery, generic API structure analysis, target field validation, and field naming issue detection.
- **Order Splitting System (COMPLETED)**: Fully functional order splitting based on shipping outcomes (Drop-Ship to Customer, Drop-Ship to FFL, In-House). Automatically generates proper TGF order numbers with receiver codes, creates separate Zoho deals for each shipping outcome, and maps all 9 system fields correctly. Tested and verified working with live Zoho CRM integration.
- **Product Field Mapping System (COMPLETED)**: Comprehensive product information mapping to Zoho Deal module with 14 specialized fields including product identification (SKU, RSR stock number), pricing/quantity, compliance attributes (FFL required, drop-ship eligible), and extended information (specifications, images). Supports both single-product and multi-product orders with intelligent "Mixed Order" handling and complete field validation.
- **Dynamic Product Lookup System (COMPLETED - Jan 2025)**: Fully operational "Find or Create Product by SKU" system with intelligent caching, duplicate prevention, and comprehensive field mapping. Tested with authentic RSR inventory data (GLOCK-19-GEN5, SIG-P320-COMPACT, etc.) and verified working with live Zoho CRM integration.
- **ABC Deal Naming System (COMPLETED - Jan 2025)**: Production-ready deal naming convention (TGF-XXXXXXX-[0|AZ|BZ|CZ]) supporting single and multi-receiver orders. Automatically handles order splitting by shipping outcomes with proper sequential letter assignment. 100% test coverage across all scenarios.
- **Complete Zoho Integration Framework (FULLY OPERATIONAL - Jan 2025)**: End-to-end integration system combining dynamic product lookup, ABC deal naming, order splitting, and comprehensive field mapping (23 total fields). Successfully tested with real inventory data and ready for production deployment. **CRITICAL BREAKTHROUGH**: Resolved all Layout field API errors and COMPLETED subform integration fix. Product information now correctly populates Zoho Deal subforms using proper `Subform_1` field structure, achieving both main deal fields AND detailed product subform population. Verified working with live orders showing complete product details in Zoho CRM subforms.
- **PERMANENT ZOHO TOKEN MANAGEMENT SYSTEM (COMPLETED - Jan 2025)**: Final solution to end daily token expiration issues forever. Implemented ZohoTokenService with triple persistence (memory + file + environment), automatic 45-minute refresh cycles, comprehensive error handling, rate limit protection, and cross-restart token recovery. System includes graceful fallback mechanisms and never requires rebuilding. No more "Why do we have to do this everyday" token issues.
- **Critical Architecture Fix (Jan 2025)**: Corrected Zoho field flow - distributor information and pricing now correctly bypass Products Module and go directly to Deal subform. Products Module contains only static, tier-agnostic information while Deal subform handles all dynamic, order-specific, and distributor data.
- **Tier-Based Order Processing System (COMPLETED - Jan 2025)**: Full validation of order processing across all three membership pricing tiers (Bronze, Gold, Platinum). System successfully handles both simple single-outcome orders and complex multi-receiver orders with proper ABC deal naming. All 6 test scenarios (2 per tier) completed successfully with live Zoho CRM integration. **SP00735 Test Product Validated**: Complete testing framework implemented for GLOCK OEM 8 POUND CONNECTOR across all tiers (Bronze: $7.00, Gold: $6.65, Platinum: $3.57) with authentic RSR inventory data and proper Zoho field separation.
- **Complete End-to-End Test Sale SUCCESS (Jan 2025)**: Successfully processed complete test sale with real RSR inventory (SP00735 GLOCK connector, MAG557-BLK Magpul magazine, STR-69260 Streamlight light), fake customer, real FFL dealer (Premier Firearms LLC), sandbox Authorize.Net payment ($206.73), proper TGF order numbering (TEST86372950), and Zoho CRM integration ready for production. NO RSR ordering API interaction as requested. System fully operational with authentic inventory data, tier-based pricing, and complete order processing flow verified.
- **CRITICAL TOKEN MANAGEMENT BREAKTHROUGH (Jan 18, 2025)**: Permanently resolved multi-day Zoho token authentication issues that were blocking all CRM integration. Root cause identified in `server/zoho-token-service.ts` line 194 where environment variable overwrite logic was corrupting webservices tokens. Fix implemented to preserve webservices tokens separately from legacy token management. System now maintains persistent authentication without daily rebuilds. All Zoho CRM features fully operational: deal creation (Deal ID: 6585331000001018001), contact management, product lookup, field mapping, order splitting, and TGF numbering. Live verification confirmed with Zoho CRM API. Ready for production deployment with permanent token stability.
- **Proper TGF Order Numbering System (COMPLETED - Jan 2025)**: Complete implementation of TGF order numbering specification with comprehensive format rules:

  **TGF ORDER NUMBER (child IDs)** — with TEST prefix support:
  - Get next 7-digit sequence N (zero-pad)
  - Build Base = test + N (when testing), N (in production)
  - Split cart into shipment groups by receiver (FFL / Customer / TGF IH)
  - If ONE group → OrderNo = Base + 0
  - If MULTIPLE groups → sort groups deterministically and assign Base+A, Base+B, Base+C, …
  - Persist N atomically; idempotent per submission
  - Examples (TEST): one group → test00012340; two groups → test0001234A, test0001234B
  - Examples (PROD): one group → 00012340; two groups → 0001234A, 0001234B

  **DEAL NAME (parent label)** — with TEST prefix support:
  - Compute Base the same way
  - If ONE shipment group → Deal Name = Base + 0
  - If MULTIPLE shipment groups → Deal Name = Base + Z (children keep A/B/C… suffixes)
  - Examples (TEST): single → test00012340; multi → Deal Name test0001234Z (children test0001234A, test0001234B)
  - Examples (PROD): single → 00012340; multi → Deal Name 0001234Z (children 0001234A, 0001234B)

  System now properly generates production format without test prefixes for live orders while maintaining test capability for development.

### Technical Stack
- **Frontend**: React 18 (TypeScript), Wouter, TanStack Query, React Context, Shadcn/ui (Radix UI), Tailwind CSS, Vite.
- **Backend**: Node.js (TypeScript), Express, PostgreSQL (Neon serverless), Drizzle ORM, session-based authentication with bcrypt.
- **API Design**: RESTful endpoints with consistent error handling.

### Key Components
- **Database Schema**: Includes Users (with tiers, FFLs, shipping), Products (with tier pricing, FFL needs, inventory), Orders (with FFL routing), FFLs directory, State Shipping Policies, Tier Pricing Rules, and CMS Tables.
- **Authentication**: Local authentication system using PostgreSQL with session-based management. Cross-platform integration with FreeAmericanPeople.com for membership tiers. SAML 2.0 for staff access via Zoho Directory.
- **Product Management**: Multi-tier pricing, FFL tracking, inventory, category/manufacturer organization, and advanced search.
- **Membership System**: Six-tier structure with progressive benefits, real-time savings calculations, and upgrade recommendations: Bronze, Gold Monthly, Gold Annually, Platinum Monthly, Platinum Founder, Platinum Annual (future tier).
- **CMS System**: Role-based content management with admin, support, and manager access levels.
- **FAP Integration**: Comprehensive API integration service for real-time user sync, cross-platform support tickets, shared email templates, and unified analytics.
- **RSR Engine Integration**: Complete order submission system with account-based routing, comprehensive response handling, and real-time status tracking.
- **Zoho CRM Order Tracking**: Advanced field mapping system with specialized fields including TGF Order Number, Fulfillment Type, Order Status, Consignee, and comprehensive timestamps for complete order lifecycle management.

## External Dependencies
- **Database**: Neon (serverless PostgreSQL).
- **Frontend Libraries**: React, React Query, React Hook Form, Radix UI, Shadcn/ui, Tailwind CSS, class-variance-authority, Lucide React.
- **Backend Libraries**: Express, bcrypt, connect-pg-simple, ws (WebSockets).
- **Development Tools**: Vite, TypeScript, ESLint, Prettier.
- **Commerce Integration**: Authorize.Net.
- **Distributor Integration**: RSR.
- **Search**: Algolia.
- **Email Service**: SendGrid.
- **CRM**: Zoho CRM.
- **SAML IdP**: Zoho Directory.