# "My Family" - Memory Aid App

## Version: 1.3 (December 1, 2025)

## Overview

A multi-tenant web application designed to help seniors identify and remember family members, friends, and caregivers. The app prioritizes extreme accessibility with large touch targets, high-contrast typography, and simple navigation optimized for seniors with potential vision and dexterity challenges.

### Current Features
- Multi-family support with unique URLs per family (e.g., `/smith-family`)
- 7 customizable categories (husband, wife, children, grandchildren, partners, other/Friends & Neighbors, caregivers)
- Dark category buttons with vignette-style photos fading in from the right
- Large square photos with centered name/role overlay
- Senior-friendly design with large touch targets (56px+) and high contrast
- Search functionality to find people by name, relationship, or location
- Admin page with full edit, photo upload, and category customization
- Smart name matching for clickable child/spouse links
- PostgreSQL database storage with in-memory caching
- Voice notes feature with live microphone recording
- Automatic age calculation from birthdates
- Full name display (when different from display name)
- Birthdays page showing upcoming celebrations with countdown
- Everyone page for viewing all family members
- Photo Album with swipe navigation (starts with grandchildren for engagement)
- Memory Quiz with score tracking over time (chart at bottom of admin page)
- PWA support with custom Apple Touch Icon for iOS home screen installation
- Category buttons show person counts in subtitles
- **Customizable categories** - Families can rename categories and hide unused ones via Admin settings
- **Unified Partners category** - Combines daughters-in-law, sons-in-law, and partners with spouse linking
- **Welcome message** - Customizable message on home page with markdown support (bold, italic, phone/SMS/FaceTime/email links), hidden when blank
- **Grandchildren linking** - Admin can link grandchildren to their parents in the children category; linked grandchildren appear on person detail page
- **Age-based sorting** - Grandchildren, children, and partners are sorted by age (oldest first); other categories use manual sort order
- **Drag-and-drop photo reordering** - Drag photos in Admin edit dialog to reorder; leftmost becomes primary photo
- **Dynamic app icons** - Favicon and apple-touch-icon dynamically generated from husband/wife photo for personalized PWA experience
- **AI-powered eye level positioning** - Gemini AI automatically detects face position when photos are uploaded; controls vertical photo positioning on category buttons so faces aren't cropped awkwardly (default: 0.7 if no face detected)
- No login required for seniors; family members authenticate with join codes for admin access
- All mutation routes (create/update/delete people, photos, voice notes) require authentication
- **Strict multi-tenant security** - All read endpoints require valid familyId from session or X-Family-Slug header; no cross-family data leakage

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
- Routes: Home, Category listing, Person detail, Everyone, Photo Album, Birthdays, Quiz, Admin

**State Management**: TanStack Query (React Query) for server state
- Single-page navigation with prefetched data
- Static home data cached indefinitely for fast loading
- No complex client state - all data flows from API endpoints

**Design System Principles**:
- Mobile-first, single-column layouts only
- Recognition over recall: heavy use of photos and visual cues
- One clear action per screen to minimize cognitive load
- Dark category buttons with vignette photo effect on home page

### Backend Architecture

**Server Framework**: Express.js with TypeScript
- Development mode: Vite dev server with HMR
- Production mode: Static file serving from `dist/public`

**API Design**: REST endpoints with family scoping
- `GET /api/people` - Fetch all people (scoped by family)
- `GET /api/people/:category` - Filter by category
- `GET /api/person/:id` - Get individual person details
- `GET /api/static/home` - Pre-computed home page data for fast loading
- `GET /api/category-settings` - Custom category labels and visibility
- `PUT /api/category-settings` - Update category customization
- `GET /api/birthdays` - Upcoming birthdays
- `GET /api/quiz-results` - Memory quiz score history
- `POST /api/quiz-result` - Save quiz result
- `PUT /api/person/:id/photo` - Update person's primary photo
- `POST /api/person/:id/photos` - Add additional photo
- `DELETE /api/person/:id/photos` - Remove a photo
- `GET /api/welcome-info` - Get senior name and welcome message
- `PUT /api/welcome-message` - Update welcome message (requires auth)
- `GET /api/person/:id/linked-grandchildren` - Get IDs of grandchildren linked to a parent (for admin edit)

**Data Storage Strategy**: 
- PostgreSQL database with Drizzle ORM (`server/storage.ts`)
- In-memory cache for fast reads (primed on startup)
- Data structure optimized for flat, denormalized reads (no complex joins needed)

**Database Schema** (PostgreSQL with Drizzle ORM):
```
people table:
- id (UUID primary key)
- familyId (UUID foreign key to families)
- name, fullName (display name and full legal name)
- category, relationship
- born, passed (nullable dates)
- location, summary (nullable text)
- phone, email (nullable contact info)
- spouseId, parentIds (relationship references - nullable)
- photoData, thumbnailData (base64 encoded images - nullable)
- photos (JSONB array for additional photos)
- voiceNoteData (base64 audio - nullable)
- sortOrder (for consistent ordering)

families table:
- id (UUID primary key)
- slug (unique URL-friendly name, e.g., "smith-family")
- name (display name)
- joinCode (8-char code for family member authentication)
- createdAt, updatedAt (timestamps)
- categorySettings (JSONB for custom category labels and visibility)
- welcomeMessage (text, nullable - custom welcome message with markdown support)

quiz_results table:
- id (UUID primary key)
- familyId (UUID foreign key to families)
- score, totalQuestions (integers)
- completedAt (timestamp)

Note: Age is computed dynamically from `born` date, not stored in database.
```

### Key Architectural Decisions

**Why PostgreSQL with In-Memory Cache**:
- PostgreSQL for reliable persistent storage
- In-memory cache primed on startup for instant reads
- Cache invalidated on data changes for consistency
- All CRUD operations abstracted behind `IStorage` interface

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
- Framer Motion - Animations for photo album

**Data Layer**:
- Drizzle ORM - Type-safe database toolkit (PostgreSQL dialect configured)
- @neondatabase/serverless - Serverless PostgreSQL driver
- Zod - Runtime type validation (via drizzle-zod)

**State & Forms**:
- TanStack Query - Server state management and caching
- React Hook Form - Form state management for admin features
- @hookform/resolvers - Validation resolver integration

**Media Processing**:
- Sharp - Server-side image resizing for thumbnails
- react-easy-crop - Photo cropping in admin

**Development Tools**:
- TypeScript - Type safety across full stack
- ESBuild - Production bundling for server code
- PostCSS with Autoprefixer - CSS processing

**Authentication**:
- Express sessions with connect-pg-simple for PostgreSQL session storage
- Simple join code authentication for family members (admin access only)
- No authentication required for senior users viewing the app

**Data Export/Import Scripts**:
- `scripts/export-family-data.ts` - Export family data to JSON for backup/migration
- `scripts/import-family-data.ts` - Import family data from JSON file
- `scripts/seed-template.json` - Template for creating custom seed data
- Usage: `npx tsx scripts/export-family-data.ts [family-slug]`
- Usage: `npx tsx scripts/import-family-data.ts <json-file> [--clear]`
