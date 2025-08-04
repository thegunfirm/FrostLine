# Rest Express - Firearms E-commerce Platform

## Overview
This is a full-stack e-commerce platform for firearms and accessories, featuring a React frontend, Node.js Express backend, and PostgreSQL database. It includes a comprehensive tier-based membership system, handles FFL (Federal Firearms License) requirements, specialized shipping policies, and offers tiered pricing benefits. The platform aims to provide a robust, compliance-aware online marketplace for the firearms industry, integrating real-time inventory and advanced search capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.
Image policy: NEVER use Unsplash or any placeholder images. Only use authentic distributor images (RSR, etc.) even if they show "Image Coming Soon" placeholders.
Code preservation: Always maintain working solutions - never overwrite functioning code without explicit user request.

## System Architecture

### Core Design Principles
- **Tier-based Membership**: Bronze, Gold, and Platinum tiers with differentiated pricing and benefits.
- **FFL Integration**: Built-in handling for firearms requiring Federal Firearms License transfers.
- **Specialized Commerce**: Gun-specific categories, manufacturer filtering, and compliance features.
- **Responsive Design**: Mobile-first approach with custom breakpoints and a brand-focused UI reflecting industry aesthetics.
- **Hybrid Search**: Multi-layer search system combining RSR API, Algolia indexing, and internal AI learning for product recommendations.
- **Real-time Inventory**: Live inventory synchronization with RSR distributor data.
- **Payment Dual System**: Separate Authorize.Net credentials for product vs. membership payments.

### Technical Stack
- **Frontend**: React 18 (TypeScript), Wouter for routing, TanStack Query for server state, React Context for authentication, Shadcn/ui (Radix UI) for components, Tailwind CSS for styling, Vite for tooling.
- **Backend**: Node.js (TypeScript), Express framework, PostgreSQL database with Drizzle ORM, Neon serverless PostgreSQL, session-based authentication with bcrypt.
- **API Design**: RESTful endpoints with consistent error handling.

### Key Components
- **Database Schema**: Users (with tiers, FFLs, shipping), Products (with tier pricing, FFL needs, inventory), Orders (with FFL routing), FFLs directory, State Shipping Policies, Tier Pricing Rules.
- **Authentication**: Session-based with RBAC (user, admin, support, dealer).
- **Product Management**: Multi-tier pricing, FFL tracking, inventory, category/manufacturer organization, advanced search.
- **Membership System**: Three-tier structure with progressive benefits, real-time savings calculations, and upgrade recommendations.

## External Dependencies
- **Database**: Neon (serverless PostgreSQL), Drizzle ORM.
- **Frontend Libraries**: React, React Query, React Hook Form, Radix UI, Shadcn/ui, Tailwind CSS, class-variance-authority, Lucide React.
- **Backend Libraries**: Express, bcrypt, connect-pg-simple, ws (WebSockets).
- **Development Tools**: Vite, TypeScript, ESLint, Prettier.
- **Commerce Integration**: Authorize.Net (for payments).
- **Distributor Integration**: RSR (for product data, inventory, and images via FTP and HTTP fallback).
- **Search**: Algolia (for product indexing and search functionality).