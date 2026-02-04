# CLAUDE.md - Tab Organizer Ultra

## Project Overview

Tab Organizer Ultra is a PWA for organizing, managing, and tracking links with cloud synchronization. Features multi-library organization, video focus mode with 4-state progress tracking, and smart metadata extraction.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Tailwind CSS (CDN)
- **Backend**: Supabase (auth, database, real-time sync)
- **APIs**: Microlink API (metadata), YouTube Embed API
- **No build tools** - runs directly in browser

## Directory Structure

```
tab-organizer/
├── index.html          # Single-page app entry point
├── manifest.json       # PWA manifest
├── css/
│   └── styles.css      # All styling (theme system, glass-morphism, animations)
└── js/
    ├── config.js       # Supabase initialization
    ├── main.js         # App bootstrap
    ├── data.js         # Global state (DATA object) & migration
    ├── auth.js         # Authentication (Google OAuth, email, guest)
    ├── storage.js      # localStorage + Supabase sync
    ├── metadata.js     # URL metadata auto-fetch
    ├── libraries.js    # Library CRUD
    ├── categories.js   # Category CRUD
    ├── links.js        # Link CRUD & status tracking
    ├── focus-mode.js   # Video player & notes
    ├── export-import.js # Data portability with conflict resolution
    └── ui.js           # Rendering, drag/drop, theme toggle
```

## Development Commands

```bash
# No build step required - use any HTTP server:
python -m http.server 8000
# or
npx http-server
# or
npx live-server
```

## Architecture Patterns

### Data Structure
```javascript
DATA = {
  libraries: {
    "lib_key": {
      name: string,
      icon: emoji,
      categories: {
        "cat_key": {
          name: string,
          links: [{ url, title, status: { watching, watched, understood, applied } }]
        }
      }
    }
  },
  currentLibrary: "lib_key"
}
```

### Key Patterns
- **Event-driven rendering**: Single `render()` regenerates UI from DATA
- **Modal-based forms**: All CRUD operations use modals
- **Drag & drop**: 4 functionalities (reorder links, move links, reorder categories, organize mode)
- **Storage hierarchy**: localStorage (always) + Supabase (if authenticated)
- **Theme system**: `data-theme="light"` attribute on `<html>`, persisted in localStorage

### Global State Variables
```javascript
DATA, currentUser, isGuest, openSections, organizeMode, focusLibrary, focusCategory, draggedData, dragType
```

## Coding Conventions

- **Functions**: camelCase (`saveLink`, `toggleTheme`)
- **Constants**: UPPER_SNAKE_CASE (`ICONS`, `COLORS`)
- **CSS classes**: kebab-case (`.glass-card`, `.search-hidden`)
- **Data keys**: `lib_*` and `cat_*` prefixes with timestamps
- **File headers**: Purpose and dependencies commented
- **Section dividers**: `// ===== SECTION NAME =====`

## Common Workflows

### Adding a new feature
1. Identify which JS module handles the feature area
2. Add functions to appropriate module
3. Update `render()` in ui.js if UI changes needed
4. Call `save()` then `render()` after data mutations

### Modifying UI
1. Update HTML in index.html or generated in ui.js
2. Add styles to css/styles.css
3. For theme support, add `:is([data-theme="light"])` selectors

### Testing
- No automated tests - manual testing in browser
- Use DevTools for debugging
- Check localStorage for data inspection

## Important Notes

- All mutations must call `save()` then `render()`
- Supabase credentials in config.js are public (anon key)
- 4-state video tracking: Watching (yellow) → Watched (blue) → Understood (green) → Applied (amber)
- Import/export includes conflict resolution for duplicate categories
- Focus mode is a dedicated full-screen video player with notes
