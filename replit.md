# Judy's Family Memory Aid App

## Version: 1.0 (November 26, 2025)

## Overview

A specialized web application designed to help an 89-year-old user (Judy) identify and remember family members, friends, and caregivers. The app prioritizes extreme accessibility with large touch targets, high-contrast typography, and simple navigation optimized for seniors with potential vision and dexterity challenges.

### v1.0 Features
- 25 people across 6 categories (husband, children, grandchildren, daughters in law, friends & neighbors, caregivers)
- Large square photos with centered name/role overlay
- Senior-friendly design with large touch targets (56px+) and high contrast
- Search functionality to find people by name, relationship, or location
- Admin page (/admin) with full edit and photo upload capabilities
- Smart name matching for clickable child/spouse links
- Visit tracking API (available but hidden from UI)
- PostgreSQL database storage
- Voice notes feature with live microphone recording
- Automatic age calculation from birthdates
- **Birthdays tab** - Bottom tab bar on home page shows next 3 upcoming birthdays with photo, name, role, and countdown
- PWA support with custom Apple Touch Icon for iOS home screen installation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Library**: Shadcn/ui (Radix UI primitives) with Tailwind CSS
- Heavily customized for senior accessibility
- All interactive elements sized for imprecise touches (minimum 48-64px targets)
- Typography scaled large: 28-32px for names, 20-24px for relationships, 18-20px for details

**Routing**: Wouter for lightweight client-side routing
- Three main routes: Home (category selection), Category listing, Person detail view

**State Management**: TanStack Query (React Query) for server state
- Single-page navigation with prefetched data
- No complex client state - all data flows from API endpoints

**Design System Principles**:
- Mobile-first, single-column layouts only
- Recognition over recall: heavy use of photos and visual cues
- One clear action per screen to minimize cognitive load
- Apple HIG + Material Design guidelines adapted for accessibility

### Backend Architecture

**Server Framework**: Express.js with TypeScript
- Development mode: Vite dev server with HMR
- Production mode: Static file serving from `dist/public`

**API Design**: Simple REST endpoints
- `GET /api/people` - Fetch all people
- `GET /api/people/:category` - Filter by category (husband, children, grandchildren, friends, caregivers)
- `GET /api/person/:id` - Get individual person details

**Data Storage Strategy**: 
- Currently using in-memory storage (`MemStorage` class in `server/storage.ts`)
- Schema defined with Drizzle ORM for future PostgreSQL migration
- Data structure optimized for flat, denormalized reads (no complex joins needed)

**Database Schema** (Drizzle/PostgreSQL ready):
```
people table:
- id (UUID primary key)
- name, category, relationship
- photoUrl (nullable)
- born, age, passed (nullable)
- location, spouse
- children (text array)
- summary
- sortOrder (for consistent ordering)
```

### Key Architectural Decisions

**Why In-Memory Storage Currently**:
- Rapid prototyping and testing without database setup
- Easy transition path: Drizzle schema already defined
- All CRUD operations abstracted behind `IStorage` interface for easy swapping

**Why Vite Over Create React App**:
- Faster HMR and build times
- Better TypeScript support out of the box
- Simpler configuration for monorepo structure (client/server/shared)

**Why Wouter Over React Router**:
- Minimal bundle size (1.5kb vs 10kb+)
- Simpler API sufficient for linear navigation flow
- Better performance for simple use cases

**Path Alias Strategy**:
- `@/` → `client/src/` for frontend code
- `@shared/` → `shared/` for types shared between client and server
- `@assets/` → `attached_assets/` for static media

**Accessibility-First Component Customization**:
- All Shadcn components modified with larger minimum sizes
- Touch targets never smaller than 44x44px (WCAG AAA standard)
- Color contrast ratios meet WCAG AAA (7:1 for normal text)

### External Dependencies

**UI & Styling**:
- Radix UI primitives (@radix-ui/*) - Accessible component foundations
- Tailwind CSS - Utility-first styling with custom design tokens
- class-variance-authority - Type-safe component variants
- Lucide React - Icon library with consistent sizing

**Data Layer**:
- Drizzle ORM - Type-safe database toolkit (PostgreSQL dialect configured)
- @neondatabase/serverless - Serverless PostgreSQL driver for future deployment
- Zod - Runtime type validation (via drizzle-zod)

**State & Forms**:
- TanStack Query - Server state management and caching
- React Hook Form - Form state management (if needed for admin features)
- @hookform/resolvers - Validation resolver integration

**Development Tools**:
- TypeScript - Type safety across full stack
- ESBuild - Production bundling for server code
- PostCSS with Autoprefixer - CSS processing

**Notable Absences**:
- No authentication system (single-user app for Judy)
- No real-time features (static content doesn't change frequently)
- No complex state management (Redux/Zustand) - TanStack Query handles all server state