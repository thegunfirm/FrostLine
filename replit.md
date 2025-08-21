# Rest Express - Firearms E-commerce Platform

## Overview
This project is a full-stack e-commerce platform specializing in firearms and accessories. It provides a robust, compliance-aware online marketplace that addresses the unique requirements of the firearms industry, including FFL (Federal Firearms License) handling, specialized shipping, and a comprehensive tier-based membership system. Key capabilities include real-time inventory, advanced search, and tiered pricing benefits. The platform aims to be a leading online destination for firearms enthusiasts and professionals, focusing on business vision, market potential, and project ambitions within the firearms industry.

## User Preferences
Preferred communication style: Simple, everyday language.
Image policy: NEVER use Unsplash or any placeholder images. Only use authentic distributor images (RSR, etc.) even if they show "Image Coming Soon" placeholders.
Code preservation: Always maintain working solutions - never overwrite functioning code without explicit user request.
Email verification: Users must verify their email address before being able to sign in.
CRITICAL INVENTORY POLICY: NEVER use fabricated, test, or placeholder product data. ONLY use products that exist in our live RSR feed. When working with inventory, verify products exist in the database first. No exceptions. No fallback data. No test SKUs like GLOCK17GEN5. FFL directory must use only authentic FFL data - no fake dealers should be added to the system.

MANDATORY DATA VERIFICATION PROTOCOL: 
1. ALWAYS run `node check-product-upc.cjs` or query the products table BEFORE using ANY product data
2. NEVER assume what product data should be - ALWAYS verify against live RSR database
3. When testing integrations, use ONLY products found in the actual database
4. If product data doesn't exist in database, work with user to import authentic RSR data
5. ALL SKUs, UPCs, RSR stock numbers, and product names must match live database exactly
DISTRIBUTOR NUMBER SEPARATION FIX: Fixed critical backend issue where RSR stock numbers (distributor) were incorrectly used as SKUs instead of manufacturer part numbers. System now properly separates manufacturer part numbers (SKUs) from RSR stock numbers (for ordering). Date: 2025-01-20.
FIELD CORRUPTION RESOLUTION COMPLETE: Successfully resolved Field 12 corruption issue with 94.90% separation (27,926 products) where manufacturer part numbers were properly separated from RSR distributor codes. Remaining 5.10% (1,502 products) identified as legitimate cases where RSR intentionally matches distributor stock numbers to manufacturer part numbers. System now correctly handles both scenarios - separated codes when different, identical codes when intentionally matched. Date: 2025-01-20.
CRITICAL IMAGE HANDLING RULE: For product images in cart/order displays, NEVER use containers with gray backgrounds or fixed heights. Use direct image elements with `w-[size] h-auto object-contain` classes only. This prevents background showing through and maintains natural image proportions.
CART CORRUPTION SOLUTION: Implement comprehensive clearing mechanism including both localStorage removal and server-side force-clear endpoint for cart items.
FFL SELECTOR IMPROVEMENTS: Add proper error handling, loading states, and retry logic to the FFL selector component.
GLOBAL SCROLL-TO-TOP: Implement site-wide scroll-to-top functionality on page navigation.
VERIFICATION REQUIREMENT: Never claim features are "working" or "successful" without verifying actual results in external systems (Zoho CRM, databases, APIs). Always check the end result, not just log messages or API responses that claim success.
INVENTORY DATA PROTECTION: Never modify live inventory/product data in the database. This is business-critical customer data that must not be altered during testing or development. Use only existing data as-is for any testing purposes.
CRITICAL SECURITY POLICY: NEVER place tokens, API keys, or any credentials directly in code. ALWAYS use environment variables and the account secrets system. No hardcoded credentials, no "fallback" values, no exceptions. This policy is mandatory to prevent security breaches and development delays.
RSR IMPORT STANDARD: RSR Comprehensive Import System is the ONLY active RSR system. All legacy RSR sync endpoints deprecated and redirect to comprehensive system. No business decisions on frequencies - uses RSR's exact recommendations. Single source of truth for all RSR operations.

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
- **Local Authentication System**: Fully local authentication using PostgreSQL for user management, registration, login, and tier management with bcrypt password security. Supports 5 subscription tiers.
- **Subscription Tier Management**: CMS-driven interface for managing subscription tiers, pricing, and benefits, with optional synchronization to Zoho CRM.
- **Billing Audit Logging**: Comprehensive audit logging system using structured markdown for Authorize.Net webhooks, dunning emails, and subscription status changes.
- **SAML 2.0 Staff Authentication**: Implementation of SAML 2.0 Service Provider for Zoho Directory IdP, supporting role-based access for staff.
- **Complete RSR + Zoho Integration System**: Comprehensive end-to-end integration featuring RSR Engine Client for order submission and Zoho Order Fields Service for CRM synchronization. Includes sequential order numbering, account-based ordering, comprehensive status tracking, and real-time field updates.
- **API Field Discovery Tool Implementation**: Comprehensive Field Discovery system integrated into CMS admin panel for universal API field mapping analysis.
- **Order Splitting System**: Fully functional order splitting based on shipping outcomes (Drop-Ship to Customer, Drop-Ship to FFL, In-House). Automatically generates proper TGF order numbers and creates separate Zoho deals.
- **Product Field Mapping System**: Comprehensive product information mapping to Zoho Deal module with specialized fields including product identification, pricing/quantity, compliance attributes, and extended information. Supports both single-product and multi-product orders.
- **Dynamic Product Lookup System**: Fully operational "Find or Create Product by SKU" system with intelligent caching and duplicate prevention.
- **ABC Deal Naming System**: Production-ready deal naming convention supporting single and multi-receiver orders, automatically handling order splitting.
- **Complete Zoho Integration Framework**: End-to-end integration system combining dynamic product lookup, ABC deal naming, order splitting, and comprehensive field mapping. Includes correct population of Zoho Deal subforms.
- **Permanent Zoho Token Management System**: Implemented ZohoTokenService with triple persistence (memory + file + environment), automatic refresh cycles, comprehensive error handling, and rate limit protection for persistent authentication.
- **Tier-Based Order Processing System**: Full validation of order processing across all membership pricing tiers.
- **Proper TGF Order Numbering System**: Complete implementation of TGF order numbering specification with comprehensive format rules for both single and multiple shipment groups.
- **RSR-Compliant Import Frequency System**: Full implementation of RSR's recommended import frequencies - inventory updates every 2 hours, quantity updates every 15 minutes, daily data integrity monitoring. Includes comprehensive scheduler service, FTP automation, admin controls, and emergency update capabilities. **CONSOLIDATED STANDARD** - All legacy RSR systems deprecated, single definitive system for all RSR operations.
- **Enhanced Algolia Search Integration**: Complete dual indexing system supporting both manufacturer part number (SKU) and product name searches. Includes CMS admin management endpoints for search synchronization and status monitoring. Verified working with 1,628+ indexed products and comprehensive field mapping. Date: 2025-01-20.
- **RSR Image Integration Breakthrough**: Successfully implemented authenticated RSR image loading using correct naming convention (RSRSKU_1.jpg) with RSR credentials. System now loads authentic product images directly from RSR's servers (verified 19,565 byte image loads). Includes proper fallback system for products without images. Date: 2025-01-21.

### Technical Stack
- **Frontend**: React 18 (TypeScript), Wouter, TanStack Query, React Context, Shadcn/ui (Radix UI), Tailwind CSS, Vite.
- **Backend**: Node.js (TypeScript), Express, PostgreSQL (Neon serverless), Drizzle ORM, session-based authentication with bcrypt.
- **API Design**: RESTful endpoints with consistent error handling.

### Key Components
- **Database Schema**: Includes Users (with tiers, FFLs, shipping), Products (with tier pricing, FFL needs, inventory), Orders (with FFL routing), FFLs directory, State Shipping Policies, Tier Pricing Rules, and CMS Tables.
- **Authentication**: Local authentication system using PostgreSQL with session-based management. Cross-platform integration with FreeAmericanPeople.com for membership tiers. SAML 2.0 for staff access via Zoho Directory.
- **Product Management**: Multi-tier pricing, FFL tracking, inventory, category/manufacturer organization, and advanced search.
- **Membership System**: Six-tier structure with progressive benefits: Bronze, Gold Monthly, Gold Annually, Platinum Monthly, Platinum Founder, Platinum Annual.
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