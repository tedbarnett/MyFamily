# Design Guidelines: My Family Memory Aid App

## Design Approach
**System**: Apple HIG + Material Design principles, heavily customized for senior accessibility
**Rationale**: Clarity, simplicity, and tactile feedback optimized for an 89-year-old user with potential vision and dexterity challenges

## Core Design Principles
1. **Extreme Readability**: Every element prioritizes legibility
2. **Touch-First**: All interactive elements accommodate less precise touches
3. **Cognitive Simplicity**: One clear action per screen, minimal decisions
4. **Recognition Over Recall**: Heavy use of photos and visual cues

## Typography
**Font Family**: System fonts (San Francisco/Segoe UI/Roboto) for maximum clarity
- **Names/Headings**: 28-32px, bold weight (font-semibold to font-bold)
- **Relationships**: 20-24px, medium weight
- **Body Details**: 18-20px, regular weight
- **Category Headers**: 24-28px, bold
- **Minimum touch target labels**: 16px

**Line Height**: Generous 1.6-1.8 for all text

## Layout System
**Spacing Primitives**: Use Tailwind units of 4, 6, 8, 12, 16, 20
- Card padding: p-6 to p-8
- Section spacing: space-y-8 to space-y-12
- Touch targets: min-h-16 to min-h-20
- Screen margins: px-4 to px-6

**Container Strategy**:
- Mobile-first with max-width constraints (max-w-2xl)
- Full-width cards with internal padding
- Single column layout (no multi-column grids)

## Component Library

### Navigation
- **Top Header**: Fixed position, category name + back button
- **Category Tabs**: Large pill-style buttons (h-14 to h-16) with icons
- **Back Button**: Oversized (h-12 w-12) with clear arrow icon

### Person Cards (Browse View)
- **Layout**: Full-width cards with generous spacing between (space-y-6)
- **Photo**: Large circular or square avatar (128px - 160px)
- **Content**: Photo left, text right (or stacked on very small screens)
- **Touch Target**: Entire card is tappable (min-h-24)
- **Information Display**: Name (bold, large), relationship subtitle

### Person Detail Page
- **Photo**: Hero-style full-width photo at top (400px-500px height, object-cover)
- **Information Cards**: Grouped facts in distinct sections
  - Relationship section
  - Basic info (age, birthday, location)
  - Family connections (spouse, children, partner)
  - Professional/personal details
- **Layout**: Single column, generous vertical spacing (space-y-8)

### Category Navigation
- **Grid**: 2-column grid on mobile (3 columns on tablets)
- **Category Cards**: 
  - Height: h-32 to h-40
  - Icon + Label centered
  - Count badge showing number of people
- **Categories**: Husband, Children, Grandchildren, Friends, Caregivers

### Interactive Elements
- **Buttons**: 
  - Minimum height: h-14 to h-16
  - Rounded corners: rounded-xl to rounded-2xl
  - Clear labels, no icon-only buttons
- **Touch Feedback**: Subtle scale on press (no complex hover states)

## Visual Hierarchy
1. **Photos**: Dominant visual element, always high-quality and large
2. **Names**: Second most prominent (bold, large text)
3. **Relationships**: Third level (medium weight, slightly smaller)
4. **Details**: Supporting information, well-spaced

## Accessibility Features
- **Contrast**: Ensure WCAG AAA compliance (7:1 minimum)
- **Touch Targets**: Minimum 48px x 48px (prefer 56-64px)
- **Focus Indicators**: Thick, high-contrast focus rings (ring-4)
- **No Time Limits**: No auto-advancing content
- **Clear States**: Obvious active/selected states

## Images
**Photo Requirements**:
- All person photos: Portrait orientation, well-lit, clear faces
- Placement: Featured prominently on cards and detail pages
- Format: Circular avatars on browse cards, full-width rectangles on detail pages
- Fallback: Large initials on solid background if photo unavailable

**No Hero Image**: This is a utility app focused on browsing, not landing page marketing

## Interaction Patterns
- **Navigation**: Simple back button flow (Category → Person List → Person Detail)
- **Gestures**: Tap only (no swipes or complex gestures)
- **Feedback**: Immediate visual response to all touches
- **Loading**: Clear loading indicators if fetching data

## Mobile Optimization
- **Single Column**: All layouts stack vertically
- **Scrolling**: Smooth, generous padding at top/bottom
- **Safe Areas**: Respect mobile device safe zones
- **Orientation**: Portrait-only (lock if possible)