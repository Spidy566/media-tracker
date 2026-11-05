# Tracklist — Architecture, Design System & Engineering Rules

Always read `GLOSSARY.md` first for canonical terminology, status names, and route URLs.

---

## 1. Skill Integration Rules (`design-taste-frontend` & `impeccable`)

When `design-taste-frontend` or `impeccable` skills are active:
1. **App / Dashboard Mode Only:** Tracklist is a logged-in consumer web app and dashboard (`--app`), **not** a marketing landing page.
   - Do **not** deal random art directions or replace the app's locked dark theme.
   - Do **not** fetch stock photos from Wikimedia/Openverse/Unsplash. All media imagery comes strictly from TMDB and IGDB via `<PosterImage />`.
   - Do **not** run multi-round headless browser screenshot loops on backend, routing, or database tasks.
2. **Visual Discipline:**
   - Spend color strictly on **posters** and **semantic status/rating tokens** (`status-queue`, `status-doing`, `status-done`, `status-dropped`, `rating`, `brand`).
   - Keep panels quiet (`bg-card`, `border-border`), align numeric figures (`font-mono tabular-nums`), and maintain consistent spacing rhythm.

---

## 2. Fixed Design System (100% Dark Mode Only)

Tracklist is **100% Dark Mode Only** (OTT / Letterboxd / Linear dark aesthetic). Never add light-mode styles, theme switchers, or hardcoded hex colors in components when semantic tokens exist in `src/app/globals.css`.

### Surface & Border Tokens
* **App Canvas:** `bg-background` (`#0B0B0E`)
* **Primary Text:** `text-foreground` (`#F2F2F5`)
* **Secondary / Muted Text:** `text-muted-foreground` (`#8B8B97`)
* **Card / Panel Surface:** `bg-card` (`#121216`) with `border border-border` (`#26262E`)
* **Elevated / Input / Hover Surface:** `bg-muted` or `bg-secondary` (`#1B1B21`)
* **Glass / Floating Overlays (Navbar, Modals, Popovers):** `bg-popover/90 backdrop-blur-xl border border-border`
* **Primary Brand Accent:** `bg-brand` / `text-brand` (`#C8F135` Acid Lime) with `text-brand-foreground` (`#0B0B0E`)
* **Destructive:** `text-destructive` / `bg-destructive` (`#E5484D`)

### Semantic Status & Rating Tokens
* **Queue (`want_to`):** `text-status-queue` / `bg-status-queue` (`#7DA7FF`)
* **In Progress (`doing`):** `text-status-doing` / `bg-status-doing` (`#FF8A3D`)
* **Done (`done`):** `text-status-done` / `bg-status-done` (`#5ED6A0`)
* **Dropped (`dropped`):** `text-status-dropped` / `bg-status-dropped` (`#6B6B76`)
* **Star Rating (`1–5`):** `text-rating` / `fill-rating` (`#FFC94D`)

### Typography (`src/app/layout.tsx` & `globals.css`)
* **Display (`font-display` — Barlow Condensed):** Used **only** for uppercase hero titles on `/media/[type]/[id]`.
* **Sans (`font-sans` — Host Grotesk):** Used for all UI, navigation, page titles (`text-2xl sm:text-3xl font-semibold tracking-tight`), card titles (`text-xs sm:text-sm font-semibold`), and body text.
* **Mono (`font-mono` — Geist Mono):** Used for release years (`2024`), ratings (`4 / 5`), external scores (`8.4`), runtimes (`2h 14m`, `45h`), counts, and keyboard shortcuts (`⌘K`).

### Border Radius Scale
* **Modals, Hero Banners & Major Containers:** `rounded-3xl`
* **Cards & Posters:** `rounded-2xl` (posters always use `aspect-2/3`)
* **Inputs, Buttons & Sub-panels:** `rounded-xl`
* **Filter Pills & Status Badges:** `rounded-full`

---

## 3. Shared Component Reuse (Anti-Spaghetti Rules)

Never duplicate UI primitives inline inside page files:
1. **`<PosterImage />` (`src/components/poster-image.tsx`):**
   - **Mandatory** for every poster and backdrop image across the entire app. It automatically handles Stealth Mode (`usePosters()`), missing image fallbacks, and error states.
2. **`<MediaCard />` (`src/components/media-card.tsx`):**
   - Standard poster card with quick-status hover actions (`Queue`, `In Progress`, `Done`), rating badge, and `PosterImage`.
3. **`<MediaGrid />` (`src/components/media-grid.tsx`):**
   - Standard responsive CSS grid (`grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 sm:gap-5`) for poster collections.
4. **`<ScrollRow />` (`src/components/scroll-row.tsx`):**
   - Standard horizontal carousel row with edge fades and hover chevron controls.
5. **Navigation (`src/components/nav-bar.tsx`):**
   - Desktop top bar (`NavTabs`, `SearchTrigger`, `NavActions`) + Mobile bottom bar (`MobileNav`). Never add secondary hamburger drawers or floating "Island Mode" gimmicks.

---

## 4. Engineering & Stack Rules

### Next.js 16 + React 19 (`reactCompiler: true`)
* **Server Components (`page.tsx`):**
  - Fetch initial page data directly on the server using Drizzle (`db`) or server lib functions (`getMediaDetails`, `getPersonDetails`).
  - `params` and `searchParams` are **Promises** in Next.js 16—always `await params` and `await searchParams`.
  - Pass serialized data (convert `Date` to `.toISOString()`) to `*-client.tsx`.
* **Client Components (`*-client.tsx`):**
  - Keep client state minimal. Sync filter/tab/month state to URL search params where appropriate.
  - Use `@tanstack/react-query` (`useMutation` with `logEntryApi` / `deleteEntryApi` from `src/lib/api-entries.ts`) for status updates, followed by `router.refresh()` and `toast.success()`.
  - Because `reactCompiler: true` is enabled in `next.config.ts`, avoid unnecessary manual `useMemo`/`useCallback` wrappers unless required for effect dependencies.

### Database & Auth (Drizzle ORM + Better Auth)
* Schema lives in `src/db/schema.ts`.
* Protect all Server Components with `const currentUser = await getCurrentUser()` and all API routes with `const authResult = await requireUser(request)`.
* **Privacy Rule:** Whenever querying another user's profile or entries (on `/friends`, `/friends/[username]`, or `/media/[type]/[id]`), always check `users.isPublic === true` (unless viewing one's own profile).

### External IDs vs. Page Links
* Database and API `externalId` values are prefixed: `"tmdb:movie:693134"`, `"tmdb:tv:95396"`, `"igdb:119133"`.
* **Route URLs must strip the prefix:** `/media/movie/693134`, `/media/tv/95396`, `/media/game/119133`.
  ```ts
  function getMediaHref(media: { externalId: string; mediaType: string }) {
    const rawId = media.externalId.split(":").pop();
    return `/media/${media.mediaType}/${rawId}`;
  }