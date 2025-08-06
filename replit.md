# Rest Express - Firearms E-commerce Platform

## Overview
This is a full-stack e-commerce platform for firearms and accessories, featuring a React frontend, Node.js Express backend, and PostgreSQL database. It includes a comprehensive tier-based membership system, handles FFL (Federal Firearms License) requirements, specialized shipping policies, and offers tiered pricing benefits. The platform aims to provide a robust, compliance-aware online marketplace for the firearms industry, integrating real-time inventory and advanced search capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.
Image policy: NEVER use Unsplash or any placeholder images. Only use authentic distributor images (RSR, etc.) even if they show "Image Coming Soon" placeholders.
Code preservation: Always maintain working solutions - never overwrite functioning code without explicit user request.
Email verification: Users must verify their email address before being able to sign in (implemented 2025-08-05).
Testing policy: No assumptions - use test or dummy data ONLY FOR FAKE USERS. Inventory must always remain intact with authentic RSR data. No test data should ever be added to real product inventory. FFL directory must use only authentic FFL data - no fake dealers should be added to the system.
**CRITICAL IMAGE HANDLING RULE (2025-08-06)**: For product images in cart/order displays, NEVER use containers with gray backgrounds or fixed heights. Use direct image elements with `w-[size] h-auto object-contain` classes only. This prevents background showing through and maintains natural image proportions. This has been an issue multiple times - always use this simple approach.

**CART CORRUPTION SOLUTION (2025-08-06)**: Cart items persistently reappearing due to localStorage persistence issues. Fixed with comprehensive clearing mechanism including both localStorage removal and server-side force-clear endpoint. Script provided for manual clearing when corruption occurs.

**FFL SELECTOR IMPROVEMENTS (2025-08-06)**: Fixed indefinite loading issues in FFL selector component by adding proper error handling, loading states, and retry logic. Component now gracefully handles network timeouts and provides clear user feedback.

## System Architecture

### Dual Platform Infrastructure
- **FreeAmericanPeople.com (FAP)**: 
  - Membership management platform with CMS and backend
  - User authentication and subscription tier management
  - Admin controls for delivery timing, subscription enforcement, FFL settings
  - Authorize.Net integration for membership payments
  - **NEW (2025-08-05)**: Full API integration with real-time synchronization
- **TheGunFirm.com**: 
  - E-commerce platform requiring FAP membership for checkout access
  - Enforces subscription tier requirements before checkout
  - Authorize.Net integration for product sales
  - Advanced cart persistence and intelligent merging during login flow
  - **NEW (2025-08-05)**: Complete FAP integration with cross-platform features

### Core Design Principles
- **Email Verification System**: Users must verify their email address via SendGrid before account access (2025-08-05)
- **Mandatory Authentication**: Users must login via FAP and select subscription tier before checkout access
- **Intelligent Cart Management**: Cart persistence across login, smart merging of guest/user carts, complete clearing on logout
- **Three-Tier Fulfillment System**: Direct-to-consumer, warehouse-to-FFL, drop-ship-to-FFL with configurable delivery times
- **CMS-Controlled Operations**: Admin controls for delivery timing, subscription enforcement toggles, FFL management
- **FFL Integration**: Built-in handling for firearms requiring Federal Firearms License transfers with RSR "on file" status
- **Specialized Commerce**: Gun-specific categories, manufacturer filtering, and compliance features
- **Responsive Design**: Mobile-first approach with custom breakpoints and industry-focused UI
- **Real-time Inventory**: Live inventory synchronization with RSR distributor data
- **Cross-Platform Integration (2025-08-05)**: Real-time FAP API connections, shared support ticketing, unified email templates, cross-platform analytics

### Technical Stack
- **Frontend**: React 18 (TypeScript), Wouter for routing, TanStack Query for server state, React Context for authentication, Shadcn/ui (Radix UI) for components, Tailwind CSS for styling, Vite for tooling.
- **Backend**: Node.js (TypeScript), Express framework, PostgreSQL database with Drizzle ORM, Neon serverless PostgreSQL, session-based authentication with bcrypt.
- **API Design**: RESTful endpoints with consistent error handling.

### Key Components
- **Database Schema**: Users (with tiers, FFLs, shipping), Products (with tier pricing, FFL needs, inventory), Orders (with FFL routing), FFLs directory, State Shipping Policies, Tier Pricing Rules, CMS Tables (API configs, email templates, support tickets, system settings, user activity logs).
- **Authentication**: Cross-platform authentication via FreeAmericanPeople.com with session-based RBAC (user, admin, support, dealer) for TheGunFirm.com access.
- **Product Management**: Multi-tier pricing, FFL tracking, inventory, category/manufacturer organization, advanced search.
- **Membership System**: Three-tier structure with progressive benefits, real-time savings calculations, and upgrade recommendations.
- **CMS System (2025-08-05)**: Role-based content management with admin (API/development), support (customer relations), manager (email templates) access levels.
- **FAP Integration (2025-08-05)**: Comprehensive API integration service with real-time user sync, cross-platform support tickets, shared email templates, and unified analytics.

## External Dependencies
- **Database**: Neon (serverless PostgreSQL), Drizzle ORM.
- **Frontend Libraries**: React, React Query, React Hook Form, Radix UI, Shadcn/ui, Tailwind CSS, class-variance-authority, Lucide React.
- **Backend Libraries**: Express, bcrypt, connect-pg-simple, ws (WebSockets).
- **Development Tools**: Vite, TypeScript, ESLint, Prettier.
- **Commerce Integration**: Dual Authorize.Net accounts (FAP for memberships, TheGunFirm for product sales).
- **Distributor Integration**: RSR (for product data, inventory, and images via FTP and HTTP fallback).
- **Search**: Algolia (for product indexing and search functionality).