# Design System Documentation

## Breakpoints & Responsive Design

### Breakpoint System

The Sherwin-Williams Color Explorer uses a mobile-first responsive design approach with the following breakpoints:

| Breakpoint             | Width                           | Device Category                                | Use Case                                                           |
| ---------------------- | ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| **Extra Small Mobile** | `< 400px`                       | Very small phones                              | Further size reductions for tiny screens                           |
| **Mobile**             | `< 600px`                       | Phones (portrait & landscape)                  | Single column layouts, stacked elements, full-width components     |
| **Tablet**             | `600px - 899px`                 | Tablets, small laptops                         | 2-column grids, increased spacing, hybrid touch/mouse interactions |
| **Desktop**            | `900px - 1199px`                | Laptops, desktops                              | Multi-column layouts, enhanced hover states, maximum content width |
| **Large Desktop**      | `≥ 1200px`                      | Large monitors, 4K displays                    | Maximum spacing, larger tiles, optimized for viewing distance      |
| **Short Height**       | `max-height: 600px`             | Laptops with low resolution, landscape tablets | Compact modal layouts, reduced vertical spacing                    |
| **Landscape Mobile**   | `< 900px width, < 500px height` | Phones in landscape orientation                | Removed sticky header, hidden descriptions, compact layouts        |

### Breakpoint Usage in CSS

```css
/* Mobile-first (default, no media query needed) */
.element {
  /* mobile styles */
}

/* Tablet and up */
@media (min-width: 600px) {
  /* tablet styles */
}

/* Desktop and up */
@media (min-width: 900px) {
  /* desktop styles */
}

/* Large desktop and up */
@media (min-width: 1200px) {
  /* large desktop styles */
}

/* Tablet only (between breakpoints) */
@media (min-width: 600px) and (max-width: 899px) {
  /* tablet-specific */
}

/* Short screen height */
@media (max-height: 600px) {
  /* compact layouts */
}

/* Extra small mobile */
@media (max-width: 399px) {
  /* tiny phone optimizations */
}

/* Landscape mobile orientation */
@media (max-width: 899px) and (max-height: 499px) and (orientation: landscape) {
  /* horizontal phone layouts */
}
```

### Touch vs Mouse Interactions

```css
/* Disable hover effects on touch devices */
@media (hover: none) and (pointer: coarse) {
  .element:hover {
    /* reset hover styles */
  }
}

/* Enhanced hover for precise pointers */
@media (hover: hover) and (pointer: fine) {
  .element:hover {
    /* enhanced hover styles */
  }
}
```

## Layout Components

### Header

**Mobile** (`< 600px`):

- Stacked layout (vertical)
- Full-width buttons
- Reduced font sizes
- Minimum touch target: 44×44px
- Padding: `var(--spacing-3)` (12px)

**Tablet** (`600px - 899px`):

- Horizontal button layout with wrapping
- Increased spacing between buttons
- Padding: `var(--spacing-4)` (16px)

**Desktop** (`≥ 900px`):

- Full horizontal layout
- Maximum spacing
- Padding: `var(--spacing-6)` (24px)

**Extra Small Mobile** (`< 400px`):

- Further reduced title: `var(--font-size-xl)` (22px)
- Smaller description: `var(--font-size-xs)` (12px)
- Compact button padding

**Landscape Mobile** (`< 900px width, < 500px height`):

- Removed sticky positioning to save vertical space
- Hidden description paragraph
- Smaller title: `var(--font-size-lg)` (18px)
- Reduced margins

### Accordion

**Mobile** (`< 600px`):

- Full-width items
- Compact spacing: `var(--spacing-3)` (12px)
- Single tap to expand/collapse
- Auto-scroll to expanded section

**Tablet** (`600px - 899px`):

- Increased padding: `var(--spacing-6)` (24px)
- Larger touch targets

**Desktop** (`≥ 900px`):

- Maximum padding: `var(--spacing-8)` (32px)
- Enhanced hover states
- Keyboard navigation optimized

### Color Tiles

**Mobile** (`< 600px`):

- Full-width tiles: `100%`
- Minimum width: `280px`
- Always show details (no hover state)
- Single column grid
- Touch-optimized button spacing: `var(--spacing-3)` (12px)

**Tablet** (`600px - 899px`):

- Max width: `350px`
- 2-3 column grid (auto-fit)
- Progressive disclosure on hover
- Padding: `var(--spacing-4)` (16px)

**Desktop** (`900px - 1199px`):

- Min width: `280px`, Max width: `320px`
- Multi-column grid (3-4 columns)
- Enhanced hover effects with lift animation
- Padding: `var(--spacing-6)` (24px)

**Large Desktop** (`≥ 1200px`):

- Min width: `300px`, Max width: `340px`
- 4+ column grid
- Maximum spacing and breathing room
- Min height: `200px`

### Modal Dialog

**Mobile** (`< 600px`):

- Nearly full-screen: padding `var(--spacing-2)` (8px)
- Max height: `95vh`
- Stacked action buttons (full-width)
- 2-column color grid
- Reduced font sizes
- Compact section spacing: `var(--spacing-4)` (16px)

**Tablet** (`600px - 899px`):

- Padding: `var(--spacing-4)` (16px)
- 3-column color grid
- Horizontal action buttons with wrapping
- Increased modal padding: `var(--spacing-8)` (32px)

**Desktop** (`≥ 900px`):

- Max width: `800px`
- Padding: `var(--spacing-10)` (40px)
- 4+ column color grid
- All action buttons in one row
- Maximum section spacing: `var(--spacing-8)` (32px)

**Short Height** (`max-height: 600px`):

- Scrollable modal overlay
- Compact header: `var(--spacing-3)` (12px)
- 3-column color grid
- Reduced vertical spacing throughout
- Smaller font sizes

**Extra Small Mobile** (`< 400px`):

- Reduced modal title: `var(--font-size-lg)` (20px)
- Smaller subtitle: `var(--font-size-base)` (16px)
- Compact padding throughout

**Landscape Mobile** (`< 900px width, < 500px height`):

- Reduced max-height: `90vh`
- Compact header padding: `var(--spacing-3)` (12px)
- Smaller title: `var(--font-size-md)` (16px)
- Body padding: `var(--spacing-4)` (16px)

### Toast Notifications

**Mobile** (`< 600px`):

- Full-width with side margins: `var(--spacing-4)` (16px)
- Positioned from bottom: `var(--spacing-4)` (16px)
- Smaller message font: `var(--font-size-sm)` (14px)
- Adjusted slide animations for horizontal positioning

**Desktop** (default):

- Centered with fixed width: 320-560px
- Bottom position: `var(--spacing-6)` (24px)
- Standard message font: `var(--font-size-base)` (16px)

### Confirmation Modals

**Mobile** (`< 600px`):

- Full-width stacked buttons
- Reduced padding: `var(--spacing-4)` (16px)
- Smaller title: `var(--font-size-lg)` (20px)
- Compact message: `var(--font-size-sm)` (14px)

**Desktop** (default):

- Horizontal button layout
- Standard padding: `var(--spacing-5)` to `var(--spacing-6)` (20-24px)
- Title: `var(--font-size-xl)` (24px)
- Message: `var(--font-size-base)` (16px)

## Spacing System

### Base Grid: 8px

All spacing follows a consistent 8px base grid for visual harmony and alignment:

| Token           | Value  | Use Case                                   |
| --------------- | ------ | ------------------------------------------ |
| `--spacing-0`   | `0`    | Reset margins/padding                      |
| `--spacing-px`  | `1px`  | Borders, hairlines                         |
| `--spacing-0-5` | `2px`  | Minimal gaps (badges)                      |
| `--spacing-1`   | `4px`  | Tight spacing (icon gaps)                  |
| `--spacing-2`   | `8px`  | Base unit - minimum touch-friendly spacing |
| `--spacing-3`   | `12px` | Mobile element spacing                     |
| `--spacing-4`   | `16px` | Standard element spacing                   |
| `--spacing-5`   | `20px` | Modal headers                              |
| `--spacing-6`   | `24px` | Section spacing                            |
| `--spacing-7`   | `28px` | Large section spacing                      |
| `--spacing-8`   | `32px` | Major section breaks                       |
| `--spacing-10`  | `40px` | Desktop modal padding                      |
| `--spacing-12`  | `48px` | Extra large spacing                        |
| `--spacing-16`  | `64px` | Maximum spacing                            |

### Responsive Spacing

**Mobile** (`< 600px`):

- Primary spacing: `--spacing-3` (12px)
- Section spacing: `--spacing-4` (16px)

**Tablet** (`600px - 899px`):

- Primary spacing: `--spacing-4` to `--spacing-6` (16-24px)
- Section spacing: `--spacing-6` to `--spacing-8` (24-32px)

**Desktop** (`≥ 900px`):

- Primary spacing: `--spacing-6` to `--spacing-8` (24-32px)
- Section spacing: `--spacing-8` to `--spacing-10` (32-40px)

## Typography Scale

### Responsive Type Sizing

**Mobile** (`< 600px`):

```css
--font-size-3xl: 1.625rem; /* 26px - Page titles */
--font-size-2xl: 1.5rem; /* 24px - Modal titles */
--font-size-xl: 1.375rem; /* 22px - Major headings */
--font-size-lg: 1.125rem; /* 18px - Section titles */
--font-size-md: 1rem; /* 16px - Subheadings */
```

**Tablet & Desktop** (default):

```css
--font-size-3xl: 2rem; /* 32px - Page titles */
--font-size-2xl: 1.75rem; /* 28px - Modal titles */
--font-size-xl: 1.5rem; /* 24px - Major headings */
--font-size-lg: 1.25rem; /* 20px - Section titles */
--font-size-md: 1.125rem; /* 18px - Subheadings */
--font-size-base: 1rem; /* 16px - Body text */
--font-size-sm: 0.875rem; /* 14px - Supporting text */
--font-size-xs: 0.75rem; /* 12px - Labels, badges */
```

### Line Heights

| Token                   | Value   | Use Case                     |
| ----------------------- | ------- | ---------------------------- |
| `--line-height-none`    | `1`     | Icons, badges                |
| `--line-height-tight`   | `1.25`  | Headings, buttons            |
| `--line-height-snug`    | `1.375` | Subheadings                  |
| `--line-height-normal`  | `1.5`   | Body text (WCAG recommended) |
| `--line-height-relaxed` | `1.625` | Long-form content            |
| `--line-height-loose`   | `2`     | Special emphasis             |

## Touch Targets

### Minimum Size: 44×44px (WCAG 2.1 Level AAA)

All interactive elements meet or exceed the minimum touch target size:

| Component                   | Minimum Size  | Notes                               |
| --------------------------- | ------------- | ----------------------------------- |
| Buttons (primary/secondary) | `44px height` | Minimum tappable area               |
| Icon buttons                | `44×44px`     | Square minimum                      |
| Accordion headers           | `44px height` | Full-width tap area                 |
| Color tile action buttons   | `44×44px`     | Absolute minimum                    |
| Modal close button          | `44×44px`     | Critical exit action                |
| Toast action buttons        | `36px height` | Acceptable for non-critical actions |

### Button Spacing (Mobile)

To prevent accidental taps on mobile:

```css
@media (max-width: 599px) {
  .header__actions {
    gap: var(--spacing-3); /* 12px minimum */
    flex-direction: column; /* Stack for easier tapping */
  }

  .color-tile__actions {
    gap: var(--spacing-3); /* 12px between favorite/hide */
  }
}
```

## Color System

### Semantic Color Tokens

| Token                       | Light Value          | Use Case                 |
| --------------------------- | -------------------- | ------------------------ |
| `--color-text-primary`      | `--neutral-900`      | Body text, headings      |
| `--color-text-secondary`    | `--neutral-600`      | Supporting text          |
| `--color-text-tertiary`     | `--neutral-500`      | Placeholders, disabled   |
| `--color-text-inverse`      | `--neutral-0`        | Text on dark backgrounds |
| `--color-surface-primary`   | `--neutral-0`        | Main background          |
| `--color-surface-secondary` | `--neutral-50`       | Cards, panels            |
| `--color-surface-tertiary`  | `--neutral-100`      | Subtle backgrounds       |
| `--color-surface-hover`     | `--neutral-100`      | Hover states             |
| `--color-surface-overlay`   | `rgba(0, 0, 0, 0.6)` | Modal overlays           |
| `--color-border-primary`    | `--neutral-300`      | Standard borders         |
| `--color-border-focus`      | `--blue-600`         | Focus outlines           |
| `--color-primary`           | `--neutral-1000`     | Primary actions          |
| `--color-danger`            | `--red-600`          | Destructive actions      |
| `--color-success`           | `--green-600`        | Success states           |

### Contrast Requirements (WCAG 2.1 Level AA)

- **Normal text (< 18px)**: 4.5:1 minimum contrast ratio
- **Large text (≥ 18px or ≥ 14px bold)**: 3:1 minimum contrast ratio
- **Interactive components**: 3:1 minimum contrast ratio

All color combinations in the system meet these requirements.

## Elevation System (Z-Index)

| Layer                | Z-Index Value | Use Case                    |
| -------------------- | ------------- | --------------------------- |
| `--z-base`           | `0`           | Default page content        |
| `--z-elevated`       | `10`          | Elevated cards, dropdowns   |
| `--z-dropdown`       | `100`         | Dropdown menus              |
| `--z-sticky`         | `200`         | Sticky header               |
| `--z-overlay`        | `500`         | General overlays            |
| `--z-modal-backdrop` | `900`         | Modal backdrop              |
| `--z-modal`          | `1000`        | Modal dialogs               |
| `--z-popover`        | `1500`        | Popovers, tooltips          |
| `--z-toast`          | `2000`        | Toast notifications         |
| `--z-tooltip`        | `3000`        | Tooltips (highest priority) |

**Confirmation modal**: `--z-modal-backdrop + 100` (1000) to appear above regular modals.

## Shadow System

| Token            | Use Case                | Elevation      |
| ---------------- | ----------------------- | -------------- |
| `--shadow-xs`    | Subtle borders          | 1px            |
| `--shadow-sm`    | Small cards, tiles      | 2-3px          |
| `--shadow-md`    | Standard cards          | 4-6px          |
| `--shadow-lg`    | Hover states, dropdowns | 10-15px        |
| `--shadow-xl`    | Modals, large panels    | 20-25px        |
| `--shadow-2xl`   | Full-screen modals      | 25-50px        |
| `--shadow-inner` | Inset effects           | Inward         |
| `--shadow-focus` | Focus indicators        | 0 + 3px spread |

## Border Radius

| Token           | Value    | Use Case                 |
| --------------- | -------- | ------------------------ |
| `--radius-none` | `0`      | Sharp corners            |
| `--radius-sm`   | `6px`    | Badges, small buttons    |
| `--radius-md`   | `8px`    | Cards, tiles, inputs     |
| `--radius-lg`   | `12px`   | Large containers, modals |
| `--radius-xl`   | `16px`   | Extra large containers   |
| `--radius-2xl`  | `24px`   | Hero elements            |
| `--radius-full` | `9999px` | Pills, avatars, circles  |

All values align to 2px increments for grid consistency.

## Transitions & Animations

### Duration Scale

| Token                 | Value   | Use Case                             |
| --------------------- | ------- | ------------------------------------ |
| `--transition-fast`   | `150ms` | Micro-interactions (hover, focus)    |
| `--transition-base`   | `200ms` | Standard transitions                 |
| `--transition-medium` | `300ms` | Modal open/close, accordions         |
| `--transition-slow`   | `500ms` | Page transitions, complex animations |

### Easing Functions

| Token           | Curve                          | Use Case                |
| --------------- | ------------------------------ | ----------------------- |
| `--ease-in`     | `cubic-bezier(0.4, 0, 1, 1)`   | Accelerating animations |
| `--ease-out`    | `cubic-bezier(0, 0, 0.2, 1)`   | Decelerating animations |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth both directions  |

### Animation Keyframes

```css
@keyframes fadeIn { opacity: 0 → 1 }
@keyframes fadeOut { opacity: 1 → 0 }
@keyframes scaleIn { transform: scale(0.9 → 1) }
@keyframes scaleOut { transform: scale(1 → 0.9) }
@keyframes toastSlideIn { translateY(100px → 0) }
@keyframes toastSlideOut { translateY(0 → 100px) }
```

**Reduced Motion**: All animations respect `prefers-reduced-motion: reduce` media query for accessibility.

## Accessibility

### Focus Indicators

All interactive elements have visible focus indicators:

```css
:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### ARIA Patterns

- **Accordion**: `aria-expanded`, `aria-controls`, `aria-labelledby`
- **Modal**: `aria-modal="true"`, `aria-labelledby`, focus trap
- **Buttons**: `aria-label` for icon-only buttons
- **Live Regions**: Toast notifications use implicit `role="status"`

## Component Patterns

### Button Variants

| Variant       | Background        | Border      | Text  | Use Case                |
| ------------- | ----------------- | ----------- | ----- | ----------------------- |
| **Primary**   | Black             | Black       | White | High emphasis actions   |
| **Secondary** | White             | Black       | Black | Medium emphasis actions |
| **Ghost**     | Transparent       | Transparent | Black | Low emphasis actions    |
| **Icon**      | `rgba(0,0,0,0.7)` | None        | White | Icon-only actions       |
| **Danger**    | Red-600           | Red-600     | White | Destructive actions     |

### Grid Layouts

**Color Tiles**:

```css
display: flex;
flex-wrap: wrap;
justify-content: center;
gap: var(--spacing-4);
```

**Modal Color Grid**:

```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
gap: var(--spacing-4);
```

**Responsive Grid Columns**:

- Mobile: 1-2 columns
- Tablet: 2-3 columns
- Desktop: 3-4 columns
- Large Desktop: 4+ columns

## Performance Considerations

### CSS Optimizations

- **GPU Acceleration**: `transform: translateZ(0)` for color tiles
- **Will-change**: Applied to animated elements
- **Backface-visibility**: Hidden for smooth transforms
- **Font Smoothing**: `-webkit-font-smoothing: antialiased`

### Image Optimization

- SVG icons inline in HTML (no HTTP requests)
- Data URIs for small images
- No external image dependencies

### Lazy Loading

- Accordion panels load on demand
- Progressive disclosure hides secondary information
- Modals lazy-load coordinating color data

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **CSS Features**: Custom properties, Grid, Flexbox, `min()`, `clamp()`
- **JavaScript**: ES6+ modules, async/await, Fetch API
- **Progressive Enhancement**: Core functionality works without JavaScript

## Future Considerations

### Potential Breakpoint Additions

- **Phablet** (`480px - 599px`): Between phone and tablet
- **4K/Retina** (`min-resolution: 2dppx`): High-DPI optimizations

### Dark Mode (Future)

Prepared semantic tokens can be overridden:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary: var(--neutral-0);
    --color-surface-primary: var(--neutral-900);
    /* ... */
  }
}
```

### Container Queries (Future)

When browser support improves, replace viewport breakpoints with container queries for true component-based responsive design.

## Testing & Validation

### Recommended Test Viewports

**Mobile Phones**:

- iPhone SE: 375×667px (portrait)
- iPhone 12/13: 390×844px (portrait)
- iPhone 14 Pro Max: 430×932px (portrait)
- Samsung Galaxy S21: 360×800px (portrait)
- Landscape: Rotate any of the above

**Tablets**:

- iPad Mini: 768×1024px (portrait)
- iPad Air: 820×1180px (portrait)
- iPad Pro 11": 834×1194px (portrait)

**Desktop**:

- Laptop: 1366×768px
- Desktop HD: 1920×1080px
- Desktop 4K: 2560×1440px

**Short Height**:

- Laptop (low res): 1366×768px
- Chromebook: 1280×720px

### DevTools Testing Workflow

Use Chrome DevTools Device Mode:

1. Open DevTools (F12)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M / Cmd+Shift+M)
3. Select preset devices or enter custom dimensions
4. Test in both portrait and landscape orientations
5. Verify touch target sizes (enable "Show device frame" + "Show rulers")
6. Test at different zoom levels (100%, 125%, 150%)

### Accessibility Checklist

- [ ] **Touch Targets**: All interactive elements ≥ 44×44px
- [ ] **Text Contrast**: WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
- [ ] **Font Sizes**: Minimum 14px for supporting text, 16px for body text
- [ ] **Tap Spacing**: Minimum 12px between interactive elements on mobile
- [ ] **Keyboard Navigation**: All interactive elements focusable with visible focus indicators
- [ ] **Focus Order**: Logical tab order throughout the interface
- [ ] **Screen Reader**: Proper ARIA labels and semantic HTML

## Technical Implementation

### Known Limitations

1. **Container Queries**: Not yet used due to limited browser support. When supported, will enable more granular component-based responsive design.

2. **Viewport Units on iOS Safari**: Older iOS Safari versions have issues with `vh` units in landscape. Implementation uses `max-height` with percentage fallbacks.

3. **Touch Device Detection**: Uses `@media (hover: none) and (pointer: coarse)` which is reliable but not perfect for hybrid devices (e.g., Surface Pro with detachable keyboard).

### Performance Optimizations

- **CSS-only responsive design**: No JavaScript resize listeners
- **GPU acceleration**: `transform: translateZ(0)` for animated elements
- **Will-change hints**: Applied to animated elements
- **Font loading**: Preconnect hints for Google Fonts
- **Efficient media queries**: Minimal repetition using mobile-first approach

### Browser Compatibility

**Supported Browsers**:

- Chrome 90+ (mobile & desktop)
- Safari 14+ (iOS & macOS)
- Firefox 88+ (mobile & desktop)
- Edge 90+ (desktop)
- Samsung Internet 14+

**CSS Features Used**:

- Custom properties (CSS variables)
- Grid layout
- Flexbox
- `min()`, `max()`, `clamp()` functions
- Media queries (including Level 4 features)

**JavaScript Features Used**:

- ES6+ modules
- Async/await
- Fetch API
- URLSearchParams
- Blob API

---

**Version**: 1.0  
**Last Updated**: November 10, 2025  
**Maintained By**: Development Team
