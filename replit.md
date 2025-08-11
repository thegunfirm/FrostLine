# Rest Express - Firearms E-commerce Platform

## Overview
This project is a full-stack e-commerce platform specializing in firearms and accessories. It provides a robust, compliance-aware online marketplace that addresses the unique requirements of the firearms industry, including FFL (Federal Firearms License) handling, specialized shipping, and a comprehensive tier-based membership system. Key capabilities include real-time inventory, advanced search, and tiered pricing benefits. The platform aims to be a leading online destination for firearms enthusiasts and professionals.

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

## System Architecture

### Dual Platform Infrastructure
- **FreeAmericanPeople.com (FAP)**: Membership management platform handling user authentication, subscription tiers, and admin controls for FFL and subscription enforcement. Integrates with Authorize.Net for membership payments and provides APIs for real-time synchronization.
- **TheGunFirm.com**: E-commerce platform requiring FAP membership for checkout. Handles product sales via Authorize.Net, features advanced cart persistence, and intelligent merging during login. Integrates comprehensively with FAP for cross-platform features.

### Core Design Principles
- **Email Verification**: Mandatory email verification via SendGrid for account access.
- **Mandatory Authentication**: Users must authenticate via FAP and select a subscription tier to access checkout.
- **Intelligent Cart Management**: Cart persistence across logins, smart merging of guest and user carts, and complete clearing on logout.
- **Three-Tier Fulfillment**: Configurable delivery times for direct-to-consumer, warehouse-to-FFL, and drop-ship-to-FFL.
- **CMS-Controlled Operations**: Admin controls for delivery timing, subscription enforcement, and FFL management.
- **FFL Integration**: Built-in handling for firearms requiring Federal Firearms License transfers.
- **Specialized Commerce**: Features gun-specific categories, manufacturer filtering, and compliance.
- **Responsive Design**: Mobile-first approach with custom breakpoints and industry-focused UI.
- **Real-time Inventory**: Live inventory synchronization with RSR distributor data.
- **Cross-Platform Integration**: Real-time FAP API connections, shared support ticketing, unified email templates, and cross-platform analytics.
- **CMS/CRM Separation**: CMS (Replit) for content, system configuration, inventory, compliance, and administration. CRM (Zoho) for customer profiles, order history, marketing, support, and FFL vendor management. Inventory resides exclusively in TheGunFirm database from RSR; Zoho only receives purchase data.
- **Zoho CRM as Primary Database**: Transitioned to Zoho CRM for primary customer data, including authentication, user registration, and login. Authentication uses Zoho CRM contacts instead of a local database. Passwords are secured with Bcrypt and stored in Zoho CRM.
- **Subscription Tier Management**: CMS-driven interface for managing subscription tiers, pricing, and benefits, with synchronization to Zoho CRM.
- **Billing Audit Logging**: Comprehensive audit logging system using structured markdown for Authorize.Net webhooks, dunning emails, and subscription status changes.
- **SAML 2.0 Staff Authentication**: Implementation of SAML 2.0 Service Provider for Zoho Directory IdP, supporting role-based access for staff (support, admin, billing, manager). Currently requires Zoho Directory configuration update for development domain testing.

### Technical Stack
- **Frontend**: React 18 (TypeScript), Wouter, TanStack Query, React Context, Shadcn/ui (Radix UI), Tailwind CSS, Vite.
- **Backend**: Node.js (TypeScript), Express, PostgreSQL (Neon serverless), Drizzle ORM, session-based authentication with bcrypt.
- **API Design**: RESTful endpoints with consistent error handling.

### Key Components
- **Database Schema**: Includes Users (with tiers, FFLs, shipping), Products (with tier pricing, FFL needs, inventory), Orders (with FFL routing), FFLs directory, State Shipping Policies, Tier Pricing Rules, and CMS Tables.
- **Authentication**: Cross-platform authentication via FreeAmericanPeople.com with session-based RBAC for TheGunFirm.com access. Zoho-first authentication for user and staff access.
- **Product Management**: Multi-tier pricing, FFL tracking, inventory, category/manufacturer organization, and advanced search.
- **Membership System**: Three-tier structure with progressive benefits, real-time savings calculations, and upgrade recommendations.
- **CMS System**: Role-based content management with admin, support, and manager access levels.
- **FAP Integration**: Comprehensive API integration service for real-time user sync, cross-platform support tickets, shared email templates, and unified analytics.

## External Dependencies
- **Database**: Neon (serverless PostgreSQL), Drizzle ORM.
- **Frontend Libraries**: React, React Query, React Hook Form, Radix UI, Shadcn/ui, Tailwind CSS, class-variance-authority, Lucide React.
- **Backend Libraries**: Express, bcrypt, connect-pg-simple, ws (WebSockets).
- **Development Tools**: Vite, TypeScript, ESLint, Prettier.
- **Commerce Integration**: Authorize.Net (for memberships on FAP, for product sales on TheGunFirm).
- **Distributor Integration**: RSR (for product data, inventory, and images).
- **Search**: Algolia (for product indexing and search).
- **Email Service**: SendGrid (for email verification and order confirmations).
- **CRM**: Zoho CRM (for customer profiles, user authentication, FFL vendor management, and order recording).
- **SAML IdP**: Zoho Directory (for staff authentication).