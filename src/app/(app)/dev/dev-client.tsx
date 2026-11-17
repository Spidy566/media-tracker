"use client";

import {
  Activity,
  Copy,
  Database,
  ExternalLink,
  FileCode,
  Film,
  Layers,
  LayoutGrid,
  RefreshCw,
  Search,
  Send,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { MediaCard } from "@/components/media-card";
import { PosterImage } from "@/components/poster-image";
import { PosterToggle } from "@/components/poster-toggle";
import { usePosters } from "@/components/providers/poster-provider";
import type { MediaStatus } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";

export interface DbStats {
  users: {
    total: number;
  };
  mediaItems: {
    total: number;
    byType: {
      movie: number;
      tv: number;
      game: number;
    };
  };
  userMediaEntries: {
    total: number;
    byStatus: {
      want_to: number;
      doing: number;
      done: number;
      dropped: number;
    };
  };
}

interface DevClientProps {
  dbStats: DbStats;
  currentUser: CurrentUser | null;
}

// ---------------------------------------------------------------------------
// 1. ROUTE DEFINITIONS & PIPELINE DATA
// ---------------------------------------------------------------------------

interface PipelineStage {
  title: string;
  badge: string;
  file?: string;
  details: string[];
  codeSnippet?: string;
}

interface RoutePipeline {
  id: string;
  path: string;
  name: string;
  shortDesc: string;
  authLevel: "Authenticated" | "Public / Auth" | "Admin Only" | "Public";
  privacyRule?: string;
  stage1: PipelineStage;
  stage2: PipelineStage;
  stage3: PipelineStage;
  stage4: PipelineStage;
}

const ROUTE_PIPELINES: RoutePipeline[] = [
  {
    id: "home",
    path: "/",
    name: "Home Dashboard",
    shortDesc:
      "Personal dashboard with overview stats pulse, Continue watching, Up Next queue, and trending media.",
    authLevel: "Authenticated",
    stage1: {
      title: "URL & Gatekeeper",
      badge: "src/proxy.ts + layout.tsx",
      details: [
        "Proxy checks session cookie: 'tracklist.session_token'. Missing cookie triggers optimistic redirect to '/login'.",
        "Layout gatekeeper calls `await getCurrentUser()`. If null, redirects to '/login'.",
        "Reads 'home_hidden' cookie via cookies() to determine collapsed sections on initial render.",
      ],
      codeSnippet: `// src/proxy.ts
const hasSessionCookie = Boolean(request.cookies.get("tracklist.session_token")?.value);
if (!hasSessionCookie) return NextResponse.redirect(new URL("/login", request.url));`,
    },
    stage2: {
      title: "Server Data Loader",
      badge: "src/app/(app)/page.tsx",
      file: "src/app/(app)/page.tsx",
      details: [
        "Queries `user_media_entries` INNER JOIN `media_items` WHERE `userId = currentUser.id` ORDER BY `updatedAt DESC`.",
        "Executes `tmdbFetch('/trending/movie/week')` and `tmdbFetch('/trending/tv/week')` (cached for 3600s with unstable_cache).",
        "Executes `igdbFetch('/games', apicalypse)` for trending video games (cached 3600s).",
        "Calculates overview stats (total tracked, movie/tv/game counts, hours estimate, completion %).",
        "Serializes Date fields to ISO strings and passes structured props to `<DashboardClient />`.",
      ],
      codeSnippet: `const [movies, tv, games, entries] = await Promise.all([
  getTrendingMovies(),
  getTrendingTv(),
  getTrendingGames(),
  db.select().from(userMediaEntries).innerJoin(mediaItems, ...).where(eq(userMediaEntries.userId, currentUser.id))
]);`,
    },
    stage3: {
      title: "Browser Client Component",
      badge: "src/app/(app)/dashboard-client.tsx",
      file: "src/app/(app)/dashboard-client.tsx",
      details: [
        "`useState`: Manages trending media filter tabs ('all' | 'movie' | 'tv' | 'game') and section toggles.",
        "`useMutation`: Quick-status updates (`setQuickStatus`) via `logEntryApi` to switch Queue/Doing/Done without page navigation.",
        "`useRouter`: Invokes `router.refresh()` upon successful mutation to revalidate server-rendered shelf stats.",
      ],
      codeSnippet: `const { mutate: setQuickStatus } = useMutation({
  mutationFn: (args) => logEntryApi(args),
  onSuccess: () => { router.refresh(); toast.success("Status updated"); }
});`,
    },
    stage4: {
      title: "API Mutations & UI Bricks",
      badge: "Endpoints & Primitives",
      details: [
        "Endpoints called: `POST /api/entries` (quick status log), `DELETE /api/entries` (remove entry).",
        "Child UI Bricks: `<MediaCard />` (posters with quick-status overlays), `<ScrollRow />` (overflow-x carousel with chevron controls), `<PosterImage />` (handles stealth mode fallback).",
      ],
    },
  },
  {
    id: "library",
    path: "/library",
    name: "Library",
    shortDesc:
      "User's personal saved shelf filtered by status (Queue, In Progress, Done, Dropped) and media type.",
    authLevel: "Authenticated",
    stage1: {
      title: "URL & Gatekeeper",
      badge: "src/proxy.ts + page.tsx",
      details: [
        "Proxy middleware confirms session cookie exists.",
        "Server page checks `const currentUser = await getCurrentUser()`; redirects to '/login' if missing.",
        "Reads URL searchParam `status` ('want_to' | 'doing' | 'done' | 'dropped') to pre-select active shelf.",
      ],
      codeSnippet: `const searchParams = useSearchParams();
const statusParam = searchParams.get("status") as MediaStatus | null;`,
    },
    stage2: {
      title: "Server Data Loader",
      badge: "src/app/(app)/library/page.tsx",
      file: "src/app/(app)/library/page.tsx",
      details: [
        "Queries all entries for currentUser: `user_media_entries` INNER JOIN `users` INNER JOIN `media_items`.",
        "Filters by `where(eq(userMediaEntries.userId, currentUser.id))`.",
        "Sorts by `desc(userMediaEntries.updatedAt)`.",
        "Converts `updatedAt` Date to ISO string: `updatedAt: e.updatedAt.toISOString()`.",
        "Renders `<Suspense>` wrapper and passes `initialEntries: Entry[]` to `<LibraryClient />`.",
      ],
      codeSnippet: `const rawEntries = await db.select({...}).from(userMediaEntries)
  .innerJoin(users, eq(userMediaEntries.userId, users.id))
  .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
  .where(eq(userMediaEntries.userId, currentUser.id))
  .orderBy(desc(userMediaEntries.updatedAt));`,
    },
    stage3: {
      title: "Browser Client Component",
      badge: "src/app/(app)/library/library-client.tsx",
      file: "src/app/(app)/library/library-client.tsx",
      details: [
        "`useSearchParams`: Reads `status` query parameter to initialize active capsule tab.",
        "`useState`: `activeTab` ('want_to' | 'doing' | 'done' | 'dropped') and `mediaFilter` ('all' | 'movie' | 'tv' | 'game').",
        "`useEffect`: Synchronizes `activeTab` whenever `statusParam` in the URL changes.",
        "`useMutation`: Mutates entry status via `logEntryApi` and triggers `router.refresh()`.",
        "Calculates live badge counts for each status pill in real-time from `initialEntries`.",
      ],
      codeSnippet: `const filteredEntries = initialEntries.filter((e) => {
  if (e.status !== activeTab) return false;
  if (mediaFilter !== "all" && e.media.mediaType !== mediaFilter) return false;
  return true;
});`,
    },
    stage4: {
      title: "API Mutations & UI Bricks",
      badge: "Endpoints & Primitives",
      details: [
        "Endpoints called: `POST /api/entries` (updates status, rating, or review note).",
        "Child UI Bricks: `<MediaGrid />` (responsive CSS grid `minmax(150px, 1fr)`), `<MediaCard />`, `<PosterImage />`.",
      ],
    },
  },
  {
    id: "explore",
    path: "/explore",
    name: "Explore & Related Titles",
    shortDesc: "Catalog exploration wall with filters and interactive similarity anchor engine.",
    authLevel: "Authenticated",
    stage1: {
      title: "URL & Gatekeeper",
      badge: "Session Cookie & Params",
      details: [
        "Session verified via `src/proxy.ts`.",
        "`getCurrentUser()` protects page.tsx.",
        "Query params supported: `type` ('movie' | 'tv' | 'game'), `sort` ('popular' | 'top_rated' | 'upcoming'), `genre`, `year`.",
      ],
    },
    stage2: {
      title: "Server Data Loader",
      badge: "src/app/(app)/explore/page.tsx",
      file: "src/app/(app)/explore/page.tsx",
      details: [
        "Queries `getDiscoverMovies()`, `getDiscoverTv()`, `getDiscoverGames()` in parallel with `Promise.all`.",
        "Queries user's tracked entries to construct `initialTrackedMap` for instant checkmark badges.",
        "Interleaves movies, games, and TV shows into balanced initial wall `initialTitles`.",
        "Passes `initialTitles` and `initialTrackedMap` to `<ExploreClient />`.",
      ],
      codeSnippet: `const initialTrackedMap: Record<string, { id: string; status: MediaStatus }> = {};
for (const entry of userEntries) {
  initialTrackedMap[entry.externalId] = { id: entry.id, status: entry.status as MediaStatus };
}`,
    },
    stage3: {
      title: "Browser Client Component",
      badge: "src/app/(app)/explore/explore-client.tsx",
      file: "src/app/(app)/explore/explore-client.tsx",
      details: [
        "`useInfiniteQuery`: Fetches paginated catalog pages from `GET /api/discover` (28 titles per page).",
        "`useMutation`: `statusMutation` and `removeMutation` for fast tracking directly from cards.",
        "`useState`: Selected anchor title (`anchorTitle`) for similarity graph, filter states, and active tab ('discover' vs 'related').",
        "`useRouter`: Navigates to `/media/[type]/[id]` when card is clicked.",
      ],
      codeSnippet: `const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ["discover", mediaType, sort, genre, year],
  queryFn: ({ pageParam = 1 }) => fetchDiscoverPage({ page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextPage,
  initialPageParam: 1,
});`,
    },
    stage4: {
      title: "API Mutations & UI Bricks",
      badge: "Endpoints & Primitives",
      details: [
        "Endpoints called: `GET /api/discover`, `GET /api/discover/related?externalId=...`, `POST /api/entries`, `DELETE /api/entries`.",
        "Child UI Bricks: `<PosterCard />`, `<AnchorChip />` (displays active similarity anchor with dismiss button), `<MediaGrid />`.",
      ],
    },
  },
  {
    id: "calendar",
    path: "/calendar",
    name: "Release Calendar",
    shortDesc:
      "Monthly release schedule with Month Grid view, Agenda List view, and slide-over Day Panel.",
    authLevel: "Authenticated",
    stage1: {
      title: "URL & Gatekeeper",
      badge: "Next.js Dynamic Route",
      details: [
        "Protected by `src/proxy.ts` and `getCurrentUser()`.",
        "Reads URL query params: `month` (e.g. '2026-11'), `view` ('grid' | 'agenda'), `type` ('all' | 'movie' | 'tv' | 'game').",
      ],
    },
    stage2: {
      title: "Server Data Loader",
      badge: "src/app/(app)/calendar/page.tsx",
      file: "src/app/(app)/calendar/page.tsx",
      details: [
        "Runs `export const dynamic = 'force-dynamic'`.",
        "Queries `user_media_entries` INNER JOIN `media_items` for currentUser to compile `myStatus: Record<string, MediaStatus>`.",
        "Passes sanitized `currentUser` profile and `myStatus` lookup map to `<CalendarClient />`.",
      ],
      codeSnippet: `const userEntries = await db.select({
  externalId: mediaItems.externalId,
  status: userMediaEntries.status,
}).from(userMediaEntries).innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id)).where(...);`,
    },
    stage3: {
      title: "Browser Client Component",
      badge: "src/app/(app)/calendar/calendar-client.tsx",
      file: "src/app/(app)/calendar/calendar-client.tsx",
      details: [
        "`useQuery`: Calls `GET /api/calendar?month=YYYY-MM&type=...` with TanStack Query.",
        "`useSearchParams` & `useRouter`: Syncs selected month and view switches to browser history.",
        "`useMutation`: `setQuickStatus` to bookmark upcoming releases straight into Queue.",
        "`usePosters`: Respects stealth mode preference.",
        "`useState`: `selectedDate` and `isDayPanelOpen` for slide-over side drawer.",
      ],
      codeSnippet: `const { data, isLoading } = useQuery<CalendarApiResponse>({
  queryKey: ["calendar", currentMonth, mediaFilter],
  queryFn: () => fetchCalendarData(currentMonth, mediaFilter),
});`,
    },
    stage4: {
      title: "API Mutations & UI Bricks",
      badge: "Endpoints & Primitives",
      details: [
        "Endpoints called: `GET /api/calendar`, `POST /api/entries`.",
        "Child UI Bricks: `<CalendarRow />`, `<DayPanel />` (slide-over release inspector), `<PosterImage />`.",
      ],
    },
  },
  {
    id: "media-detail",
    path: "/media/[type]/[id]",
    name: "Media Detail",
    shortDesc:
      "Canonical media view with rating, synopsis, cast/crew, time-to-beat, watch providers, and squad activity.",
    authLevel: "Authenticated",
    privacyRule: "Squad activity checks `users.isPublic === true` unless viewing own entry.",
    stage1: {
      title: "URL & Gatekeeper",
      badge: "Next.js 16 Promise Params",
      details: [
        "Route params: `const { type, id } = await params;` (Promise in Next.js 16).",
        "Enforces `type === 'movie' | 'tv' | 'game'` and regex `/^\\d+$/` (numeric TMDB/IGDB ID). Calls `notFound()` on mismatch.",
        "Note: Route URL strictly strips prefix (`/media/movie/693134`, NOT `/media/movie/tmdb:movie:693134`).",
      ],
      codeSnippet: `const { type, id } = await params;
if (!["movie", "tv", "game"].includes(type) || !/^\\d+$/.test(id)) notFound();`,
    },
    stage2: {
      title: "Server Data Loader",
      badge: "src/lib/media-details.ts",
      file: "src/app/(app)/media/[type]/[id]/page.tsx",
      details: [
        "Calls `getMediaDetails(type, id, currentUser?.id)`.",
        "Fetches external TMDB or IGDB payload (credits, watch providers, trailers, time-to-beat).",
        "Queries Drizzle: `user_media_entries` INNER JOIN `users` WHERE `mediaItemId = item.id AND (users.isPublic = true OR users.id = currentUser.id)`.",
        "Separates `myEntry` from public `friendEntries`.",
      ],
      codeSnippet: `const [tmdbSettled, squadSettled] = await Promise.allSettled([
  tmdbFetch(\`/movie/\${id}?append_to_response=credits,videos,watch/providers,similar\`),
  db.select().from(userMediaEntries).innerJoin(users, ...).where(...)
]);`,
    },
    stage3: {
      title: "Browser Client Component",
      badge: "media-log-card.tsx",
      file: "src/app/(app)/media/[type]/[id]/media-log-card.tsx",
      details: [
        "`useMutation`: `updateEntry` (upserts status, rating 1-5, review note up to 280 chars) and `removeEntry`.",
        "`useRouter`: Re-runs Server Component via `router.refresh()` to update friends' activity feed.",
        "`useState`: Local rating star state, review text input, and editing mode.",
        "`usePosters`: Discreetly hides backdrop art when stealth mode is active.",
      ],
    },
    stage4: {
      title: "API Mutations & UI Bricks",
      badge: "Endpoints & Primitives",
      details: [
        "Endpoints called: `POST /api/entries`, `DELETE /api/entries`.",
        "Child UI Bricks: `<MediaLogCard />`, `<MediaDetailBanner />`, `<MediaFactsStrip />`, `<CastSection />`, `<CrewSection />`, `<WatchProvidersSection />`, `<MoreLikeThisSection />`, `<TrailerEmbed />`.",
      ],
    },
  },
  {
    id: "person-detail",
    path: "/person/[id]",
    name: "Person Detail",
    shortDesc: "Cast/crew biography, Known For carousel, and filterable filmography.",
    authLevel: "Authenticated",
    stage1: {
      title: "URL & Gatekeeper",
      badge: "Next.js 16 Promise Params",
      details: [
        "Reads `const { id } = await params;` and validates numeric ID `/^\\d+$/`.",
        "`getCurrentUser()` resolves logged-in member to highlight items already tracked in the user's shelf.",
      ],
    },
    stage2: {
      title: "Server Data Loader",
      badge: "src/lib/person-details.ts",
      file: "src/app/(app)/person/[id]/page.tsx",
      details: [
        "Fetches TMDB `/person/{id}` + `/person/{id}/combined_credits` in parallel.",
        "Normalizes cast & crew credits, removes duplicates, and sorts by popularity.",
        "Queries Drizzle `user_media_entries` for the current user matching credits' external IDs to populate status badges.",
        "Passes `person`, `currentUser`, and `userEntriesMap`.",
      ],
    },
    stage3: {
      title: "Browser Client Component",
      badge: "filmography.tsx",
      file: "src/app/(app)/person/[id]/filmography.tsx",
      details: [
        "`useState`: Active department tab ('Acting', 'Directing', 'Writing', etc.), release year sort direction, search query.",
        "`useMutation`: `setQuickStatus` via `logEntryApi` to track filmography titles directly.",
        "`useRouter`: `router.refresh()`.",
      ],
    },
    stage4: {
      title: "API Mutations & UI Bricks",
      badge: "Endpoints & Primitives",
      details: [
        "Endpoints called: `POST /api/entries`.",
        "Child UI Bricks: `<ScrollRow />` (Known For carousel), `<Filmography />`, `<BiographyToggle />`, `<MediaCard />`, `<PosterImage />`.",
      ],
    },
  },
  {
    id: "friends",
    path: "/friends & /friends/[username]",
    name: "Friends Directory & Profile",
    shortDesc: "Overview of instance members, live activity, and member public libraries.",
    authLevel: "Authenticated",
    privacyRule: "Strictly enforces `users.isPublic === true` unless viewing own profile.",
    stage1: {
      title: "URL & Gatekeeper",
      badge: "Privacy Check Enforced",
      details: [
        "Directory `/friends`: Authenticated member check (`getCurrentUser()`).",
        "Profile `/friends/[username]`: Next.js 16 `await params`. Privacy check: if `users.isPublic === false` and `target.id !== currentUser.id`, displays private profile screen.",
      ],
      codeSnippet: `if (!profileUser.isPublic && profileUser.id !== currentUser?.id) {
  return <PrivateProfileNotice user={profileUser} />;
}`,
    },
    stage2: {
      title: "Server Data Loader",
      badge: "src/app/(app)/friends/page.tsx",
      file: "src/app/(app)/friends/page.tsx",
      details: [
        "Directory queries: `users` WHERE `isPublic = true OR id = currentUser.id` ORDER BY `displayName ASC`.",
        "Batches all entries for visible users from `user_media_entries` INNER JOIN `media_items`.",
        "Extracts currently watching/playing feed (`status = 'doing'`) and leaderboards.",
        "Serializes Date fields to ISO strings for client rendering.",
      ],
    },
    stage3: {
      title: "Browser Client Component",
      badge: "squad-client.tsx",
      file: "src/app/(app)/friends/[username]/squad-client.tsx",
      details: [
        "`useState`: Filter tabs for friend's shelf ('want_to', 'doing', 'done', 'dropped') and media types.",
        "`useMutation`: `quickTrack` calling `logEntryApi` allowing 1-click cloning of any friend's title into your own library.",
        "`useRouter`: `router.refresh()`.",
      ],
    },
    stage4: {
      title: "API Mutations & UI Bricks",
      badge: "Endpoints & Primitives",
      details: [
        "Endpoints called: `POST /api/entries`.",
        "Child UI Bricks: Member directory cards, member stat badges, `<MediaGrid />`, `<MediaCard />`, `<PosterImage />`.",
      ],
    },
  },
  {
    id: "search",
    path: "⌘K Search Modal",
    name: "Universal Omnisearch Modal",
    shortDesc: "Global command palette overlay with instant debounced search across TMDB and IGDB.",
    authLevel: "Authenticated",
    stage1: {
      title: "URL & Gatekeeper",
      badge: "SearchContext + ⌘K",
      details: [
        "Mounted globally in `<AppLayout />` through `<SearchProvider>`.",
        "Window keyboard event listener catches `⌘K` / `Ctrl+K` and `Escape`.",
        "API gatekeeper `requireUser(request)` protects `/api/search` with 401 JSON guard.",
      ],
    },
    stage2: {
      title: "Server Data Loader",
      badge: "src/app/api/search/route.ts",
      file: "src/app/api/search/route.ts",
      details: [
        "Reads `q` from query string (`request.nextUrl.searchParams.get('q')`).",
        "Executes `Promise.allSettled` across 3 providers: TMDB Movies, TMDB TV Series, and IGDB Games.",
        "Normalizes heterogeneous schemas into unified structure: `UnifiedSearchResult[]`.",
        "Returns JSON array with Cache-Control headers.",
      ],
      codeSnippet: `const [moviesRes, tvRes, gamesRes] = await Promise.allSettled([
  tmdbFetch(\`/search/movie?query=\${query}\`),
  tmdbFetch(\`/search/tv?query=\${query}\`),
  igdbFetch("/games", apicalypse),
]);`,
    },
    stage3: {
      title: "Browser Client Component",
      badge: "src/components/search-modal.tsx",
      file: "src/components/search-modal.tsx",
      details: [
        "`useSearch`: Accesses `isOpen`, `query`, `setQuery`, `mediaFilter`, `closeSearch`.",
        "`useDebounce`: Debounces typing by 300ms (`useDebounce(query, 300)`).",
        "`useQuery`: TanStack Query fetches `/api/search?q=...` with automatic request cancellation.",
        "`useMutation`: `logMedia` via `logEntryApi` to track items straight from search dropdown without navigation.",
        "`useRouter`: Navigates to `/media/[type]/[id]` when Enter is pressed.",
      ],
    },
    stage4: {
      title: "API Mutations & UI Bricks",
      badge: "Endpoints & Primitives",
      details: [
        "Endpoints called: `GET /api/search?q=...`, `POST /api/entries`.",
        "Child UI Bricks: Command dialog surface, media type filter tabs, quick-log action buttons (`Bookmark`, `Play`, `Check`), `<PosterImage />`.",
      ],
    },
  },
  {
    id: "settings",
    path: "/settings",
    name: "Settings & Preferences",
    shortDesc:
      "Stealth Mode toggle, dashboard section preferences, profile privacy, active sessions, and security.",
    authLevel: "Authenticated",
    stage1: {
      title: "URL & Gatekeeper",
      badge: "src/proxy.ts + page.tsx",
      details: [
        "Requires authenticated session cookie.",
        "Server page checks `const currentUser = await getCurrentUser()`; redirects to '/login' if missing.",
      ],
    },
    stage2: {
      title: "Server Data Loader",
      badge: "src/app/(app)/settings/page.tsx",
      file: "src/app/(app)/settings/page.tsx",
      details: [
        "Queries Better Auth `session` table WHERE `userId = currentUser.id` to show active logins with IP and browser.",
        "Reads `cookies()` for `home_hidden` section preferences.",
        "Passes `currentUser`, `activeSessions`, `hiddenSections`.",
      ],
    },
    stage3: {
      title: "Browser Client Component",
      badge: "settings-client.tsx",
      file: "src/app/(app)/settings/settings-client.tsx",
      details: [
        "`usePosters`: `hidePosters` state and `togglePosters` function for Stealth Mode.",
        "`useMutation`: Updates profile name, toggles `isPublic` privacy, changes password, or revokes session.",
        "`useState`: Controlled inputs for display name and password forms.",
        "`useRouter`: Re-fetches server data after privacy updates.",
      ],
    },
    stage4: {
      title: "API Mutations & UI Bricks",
      badge: "Endpoints & Primitives",
      details: [
        "Endpoints called: `PATCH /api/users/profile`, Better Auth password and session endpoints.",
        "Child UI Bricks: Stealth mode switch, dashboard section checklist, public/private privacy badge, active session inspector.",
      ],
    },
  },
  {
    id: "auth-admin",
    path: "/login & /admin",
    name: "Auth & Admin Management",
    shortDesc: "Member login/signup with invite codes, and admin member roster management.",
    authLevel: "Admin Only",
    stage1: {
      title: "URL & Gatekeeper",
      badge: "Role & Proxy Guards",
      details: [
        "/login: Proxy redirects to '/' (or ?next=...) if session cookie is already present.",
        "/admin: Protected by `isAdmin(currentUser)` (verifies username against `ADMIN_USERNAME`). If false, redirects to '/'.",
      ],
      codeSnippet: `// src/app/(app)/admin/page.tsx
const currentUser = await getCurrentUser();
if (!currentUser || !isAdmin(currentUser)) redirect("/");`,
    },
    stage2: {
      title: "Server Data Loader",
      badge: "src/app/(app)/admin/page.tsx",
      file: "src/app/(app)/admin/page.tsx",
      details: [
        "Queries all records from `users` table joined with session counts and entry counts.",
        "Passes sanitized roster `members: MemberRow[]` to `<AdminClient />`.",
      ],
    },
    stage3: {
      title: "Browser Client Component",
      badge: "login-client.tsx + admin-client.tsx",
      file: "src/app/(app)/admin/admin-client.tsx",
      details: [
        "Login Client: `useState` for credentials/mode (sign in vs register with invite code `SQUAD_INVITE_CODE`), `useSearchParams` for `next` redirect target.",
        "Admin Client: `useState` for member search, password reset modal; `useMutation` for `/api/admin/reset-password` and `/api/admin/remove-member`; `useRouter` for `router.refresh()`.",
      ],
    },
    stage4: {
      title: "API Mutations & UI Bricks",
      badge: "Endpoints & Primitives",
      details: [
        "Endpoints called: `/api/auth/sign-in/username`, `/api/auth/sign-up/username`, `POST /api/admin/reset-password`, `POST /api/admin/remove-member`.",
        "Child UI Bricks: Member roster table, temporary password modal dialog, confirmation modals.",
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// 2. DESIGN TOKENS DATA
// ---------------------------------------------------------------------------

interface DesignToken {
  name: string;
  variable: string;
  hex: string;
  cssClass: string;
  role: string;
  textColor?: string;
}

const DESIGN_TOKENS: DesignToken[] = [
  {
    name: "App Canvas",
    variable: "--background",
    hex: "#0B0B0E",
    cssClass: "bg-background",
    role: "Deepest dark canvas; Letterboxd/OTT cinema backdrop.",
  },
  {
    name: "Card Surface",
    variable: "--card",
    hex: "#121216",
    cssClass: "bg-card",
    role: "Elevated panels, media grids, and floating dialogs.",
  },
  {
    name: "Muted / Hover",
    variable: "--muted",
    hex: "#1B1B21",
    cssClass: "bg-muted",
    role: "Hover states, search inputs, and inactive segmented buttons.",
  },
  {
    name: "Border",
    variable: "--border",
    hex: "#26262E",
    cssClass: "border-border",
    role: "Quiet, crisp borders separating content containers.",
  },
  {
    name: "Brand Primary",
    variable: "--brand",
    hex: "#C8F135",
    cssClass: "bg-brand text-brand-foreground",
    role: "Acid Lime brand accent. Used for key CTAs and highlights.",
    textColor: "#0B0B0E",
  },
  {
    name: "Queue (want_to)",
    variable: "--status-queue",
    hex: "#7DA7FF",
    cssClass: "bg-status-queue text-background",
    role: "Media marked as Want to Watch / Play (Queue).",
    textColor: "#0B0B0E",
  },
  {
    name: "In Progress (doing)",
    variable: "--status-doing",
    hex: "#FF8A3D",
    cssClass: "bg-status-doing text-background",
    role: "Media currently being watched or played.",
    textColor: "#0B0B0E",
  },
  {
    name: "Done (done)",
    variable: "--status-done",
    hex: "#5ED6A0",
    cssClass: "bg-status-done text-background",
    role: "Media finished and logged into library.",
    textColor: "#0B0B0E",
  },
  {
    name: "Dropped (dropped)",
    variable: "--status-dropped",
    hex: "#6B6B76",
    cssClass: "bg-status-dropped text-white",
    role: "Media abandoned or dropped by the member.",
  },
  {
    name: "Rating Gold",
    variable: "--rating",
    hex: "#FFC94D",
    cssClass: "bg-rating text-background",
    role: "1-5 star ratings and score badges.",
    textColor: "#0B0B0E",
  },
  {
    name: "Destructive",
    variable: "--destructive",
    hex: "#E5484D",
    cssClass: "bg-destructive text-white",
    role: "Delete entry, remove member, or danger zone actions.",
  },
];

// ---------------------------------------------------------------------------
// 3. HOOKS & FUNCTIONS CHEAT SHEET DATA
// ---------------------------------------------------------------------------

interface CheatSheetItem {
  name: string;
  category:
    | "React Hooks"
    | "Next.js Navigation"
    | "TanStack Query"
    | "Tracklist Hooks"
    | "Server & DB Helpers";
  importSource: string;
  explanation: string;
  codeSnippet: string;
  usedInFiles: string[];
}

const CHEAT_SHEET: CheatSheetItem[] = [
  {
    name: "useState",
    category: "React Hooks",
    importSource: "react",
    explanation:
      "Manages local reactive UI state like active filter pills, slide-over open status, and controlled inputs.",
    codeSnippet: `const [activeTab, setActiveTab] = useState<MediaStatus>(initialTab);
const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv" | "game">("all");`,
    usedInFiles: [
      "src/app/(app)/library/library-client.tsx",
      "src/app/(app)/dashboard-client.tsx",
      "src/components/poster-image.tsx",
      "src/app/(app)/explore/explore-client.tsx",
    ],
  },
  {
    name: "useEffect",
    category: "React Hooks",
    importSource: "react",
    explanation:
      "Synchronizes component state with browser events (e.g. ⌘K shortcut) or URL search parameters.",
    codeSnippet: `useEffect(() => {
  if (statusParam && ["want_to", "doing", "done", "dropped"].includes(statusParam)) {
    setActiveTab(statusParam);
  }
}, [statusParam]);`,
    usedInFiles: [
      "src/app/(app)/library/library-client.tsx",
      "src/components/search-modal.tsx",
      "src/components/navbar/search-context.tsx",
    ],
  },
  {
    name: "useRouter",
    category: "Next.js Navigation",
    importSource: "next/navigation",
    explanation:
      "Provides programmatic navigation and triggers router.refresh() to revalidate server components after mutations.",
    codeSnippet: `const router = useRouter();
// Inside mutation onSuccess:
router.refresh();
toast.success("Status updated");`,
    usedInFiles: [
      "src/app/(app)/library/library-client.tsx",
      "src/app/(app)/calendar/calendar-client.tsx",
      "src/app/(app)/settings/settings-client.tsx",
    ],
  },
  {
    name: "useSearchParams",
    category: "Next.js Navigation",
    importSource: "next/navigation",
    explanation:
      "Reads the current browser URL query parameters reactively inside Client Components.",
    codeSnippet: `const searchParams = useSearchParams();
const statusParam = searchParams.get("status") as MediaStatus | null;`,
    usedInFiles: [
      "src/app/(app)/library/library-client.tsx",
      "src/app/(app)/calendar/calendar-client.tsx",
      "src/app/(auth)/login/login-client.tsx",
    ],
  },
  {
    name: "usePathname",
    category: "Next.js Navigation",
    importSource: "next/navigation",
    explanation:
      "Returns the current pathname string, used by desktop and mobile navigation bars to highlight active links.",
    codeSnippet: `const pathname = usePathname();
const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);`,
    usedInFiles: ["src/components/navbar/nav-tabs.tsx", "src/components/navbar/mobile-nav.tsx"],
  },
  {
    name: "useQuery",
    category: "TanStack Query",
    importSource: "@tanstack/react-query",
    explanation:
      "Fetches and caches server API data with automatic background revalidation, loading states, and deduplication.",
    codeSnippet: `const { data, isLoading, isError, refetch } = useQuery<UnifiedSearchResult[]>({
  queryKey: ["search", debouncedQuery, mediaFilter],
  queryFn: () => fetchSearchResults(debouncedQuery, mediaFilter),
  enabled: debouncedQuery.trim().length > 0,
});`,
    usedInFiles: ["src/components/search-modal.tsx", "src/app/(app)/calendar/calendar-client.tsx"],
  },
  {
    name: "useInfiniteQuery",
    category: "TanStack Query",
    importSource: "@tanstack/react-query",
    explanation:
      "Handles paginated catalog browsing on /explore with infinite scroll and automatic cursor management.",
    codeSnippet: `const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ["discover", mediaType, sort, genre, year],
  queryFn: ({ pageParam = 1 }) => fetchDiscoverPage({ page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextPage,
  initialPageParam: 1,
});`,
    usedInFiles: ["src/app/(app)/explore/explore-client.tsx"],
  },
  {
    name: "useMutation",
    category: "TanStack Query",
    importSource: "@tanstack/react-query",
    explanation:
      "Executes asynchronous mutations (creating, updating, deleting entries) with onSuccess hooks and sonner toasts.",
    codeSnippet: `const { mutate: setQuickStatus, isPending } = useMutation({
  mutationFn: async ({ media, status }: { media: Entry["media"]; status: MediaStatus }) => {
    return logEntryApi({ media, status });
  },
  onSuccess: () => {
    router.refresh();
    toast.success("Status updated");
  },
});`,
    usedInFiles: [
      "src/app/(app)/dashboard-client.tsx",
      "src/app/(app)/library/library-client.tsx",
      "src/app/(app)/media/[type]/[id]/media-log-card.tsx",
      "src/app/(app)/settings/settings-client.tsx",
    ],
  },
  {
    name: "usePosters",
    category: "Tracklist Hooks",
    importSource: "@/components/providers/poster-provider",
    explanation:
      "Reads and toggles the cookie-backed Stealth Mode preference ('hide_posters=1') to swap posters for typography.",
    codeSnippet: `const { hidePosters, togglePosters } = usePosters();
const showFallback = !src || hasError || hidePosters;`,
    usedInFiles: [
      "src/components/poster-image.tsx",
      "src/components/poster-toggle.tsx",
      "src/app/(app)/settings/settings-client.tsx",
      "src/app/(app)/calendar/calendar-client.tsx",
    ],
  },
  {
    name: "useSearch",
    category: "Tracklist Hooks",
    importSource: "@/components/navbar/search-context",
    explanation:
      "Consumes the global SearchContext to control opening the ⌘K search modal, setting query text, and media filtering.",
    codeSnippet: `const { isOpen, openSearch, closeSearch, query, setQuery } = useSearch();`,
    usedInFiles: [
      "src/components/search-modal.tsx",
      "src/components/navbar/search-trigger.tsx",
      "src/components/navbar/search-manager.tsx",
    ],
  },
  {
    name: "useDebounce",
    category: "Tracklist Hooks",
    importSource: "@/hooks/use-debounce",
    explanation:
      "Delays state updates until a specified delay passes, preventing rapid API calls while typing in search boxes.",
    codeSnippet: `const [query, setQuery] = useState("");
const debouncedQuery = useDebounce(query, 300);`,
    usedInFiles: ["src/components/search-modal.tsx", "src/hooks/use-debounce.ts"],
  },
  {
    name: "getCurrentUser",
    category: "Server & DB Helpers",
    importSource: "@/lib/auth",
    explanation:
      "Server-only helper that inspects the request session cookie and returns the authenticated user with roles.",
    codeSnippet: `const currentUser = await getCurrentUser();
if (!currentUser) redirect("/login");`,
    usedInFiles: [
      "src/app/(app)/layout.tsx",
      "src/app/(app)/page.tsx",
      "src/app/(app)/library/page.tsx",
      "src/app/(app)/media/[type]/[id]/page.tsx",
    ],
  },
  {
    name: "requireUser",
    category: "Server & DB Helpers",
    importSource: "@/lib/auth",
    explanation:
      "API Route helper that authenticates the incoming HTTP request and returns 401 JSON if unauthorized.",
    codeSnippet: `const authResult = await requireUser(request);
if ("errorResponse" in authResult) return authResult.errorResponse;
const { user } = authResult;`,
    usedInFiles: [
      "src/app/api/search/route.ts",
      "src/app/api/entries/route.ts",
      "src/app/api/discover/route.ts",
      "src/app/api/users/profile/route.ts",
    ],
  },
  {
    name: "db.transaction",
    category: "Server & DB Helpers",
    importSource: "@/lib/db",
    explanation:
      "Wraps multiple Drizzle SQL operations in an atomic PostgreSQL transaction so both succeed or fail together.",
    codeSnippet: `const { savedItem, entry } = await db.transaction(async (tx) => {
  const [item] = await tx.insert(mediaItems).values(mediaData).onConflictDoUpdate(...).returning();
  const [userEntry] = await tx.insert(userMediaEntries).values({ ... }).onConflictDoUpdate(...).returning();
  return { savedItem: item, entry: userEntry };
});`,
    usedInFiles: ["src/app/api/entries/route.ts", "src/db/seed.ts"],
  },
  {
    name: "Promise.allSettled",
    category: "Server & DB Helpers",
    importSource: "ES2020 Builtin",
    explanation:
      "Fetches multiple 3rd-party services concurrently without aborting if one source (e.g. IGDB or TMDB) errors out.",
    codeSnippet: `const [moviesRes, tvRes, gamesRes] = await Promise.allSettled([
  tmdbFetch("/search/movie?query=" + query),
  tmdbFetch("/search/tv?query=" + query),
  igdbFetch("/games", apicalypse),
]);`,
    usedInFiles: [
      "src/app/api/search/route.ts",
      "src/app/api/discover/related/route.ts",
      "src/lib/media-details.ts",
    ],
  },
];

// ---------------------------------------------------------------------------
// MAIN DEV CLIENT WORKBENCH COMPONENT
// ---------------------------------------------------------------------------

export function DevClient({ dbStats, currentUser }: DevClientProps) {
  const [activeTab, setActiveTab] = useState<"routes" | "components" | "db" | "cheatsheet">(
    "routes",
  );

  // Tab 1 state
  const [selectedRouteId, setSelectedRouteId] = useState<string>("home");
  const selectedRoute = ROUTE_PIPELINES.find((r) => r.id === selectedRouteId) || ROUTE_PIPELINES[0];

  // Tab 2 state
  const [demoStatus, setDemoStatus] = useState<MediaStatus>("doing");
  const [demoRating, setDemoRating] = useState<number | null>(4);
  const [demoMediaType, setDemoMediaType] = useState<"movie" | "tv" | "game">("movie");
  const [idInput, setIdInput] = useState<string>("tmdb:movie:693134");
  const { hidePosters } = usePosters();

  // Tab 3 state (API Tester)
  const [pingUrl, setPingUrl] = useState<string>("/api/search?q=batman");
  const [pingLoading, setPingLoading] = useState<boolean>(false);
  const [pingResponse, setPingResponse] = useState<{
    status?: number;
    statusText?: string;
    durationMs?: number;
    sizeBytes?: number;
    data?: unknown;
    error?: string;
  } | null>(null);

  // Tab 4 state (Search filter)
  const [cheatSearch, setCheatSearch] = useState<string>("");
  const [cheatCategory, setCheatCategory] = useState<string>("All");

  // Helper: Copy to clipboard
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  // Helper: Parse ID Normalization
  const parseExternalId = (val: string) => {
    const trimmed = val.trim();
    const parts = trimmed.split(":");
    let provider = "Unknown";
    let mediaType = "movie";
    let rawId = "";

    if (trimmed.startsWith("tmdb:movie:")) {
      provider = "TMDB";
      mediaType = "movie";
      rawId = parts[2] || "";
    } else if (trimmed.startsWith("tmdb:tv:")) {
      provider = "TMDB";
      mediaType = "tv";
      rawId = parts[2] || "";
    } else if (trimmed.startsWith("igdb:")) {
      provider = "IGDB";
      mediaType = "game";
      rawId = parts[1] || "";
    } else {
      rawId = parts[parts.length - 1] || "";
    }

    const routeUrl = rawId ? `/media/${mediaType}/${rawId}` : "/media/...";
    const externalApi =
      provider === "TMDB"
        ? `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${rawId}`
        : provider === "IGDB"
          ? `https://api.igdb.com/v4/games (where id = ${rawId})`
          : "N/A";

    return { provider, mediaType, rawId, routeUrl, externalApi };
  };

  const idParsed = parseExternalId(idInput);

  // Helper: Execute live API Ping
  const handleExecutePing = async (urlToFetch?: string) => {
    const target = urlToFetch || pingUrl;
    setPingLoading(true);
    setPingResponse(null);
    const start = performance.now();

    try {
      const res = await fetch(target);
      const end = performance.now();
      const text = await res.text();
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(text);
      } catch {
        parsedData = text;
      }

      setPingResponse({
        status: res.status,
        statusText: res.statusText,
        durationMs: Math.round(end - start),
        sizeBytes: new Blob([text]).size,
        data: parsedData,
      });
    } catch (err: unknown) {
      const end = performance.now();
      setPingResponse({
        error: err instanceof Error ? err.message : "Network error",
        durationMs: Math.round(end - start),
      });
    } finally {
      setPingLoading(false);
    }
  };

  // Filtered cheat sheet
  const filteredCheatSheet = CHEAT_SHEET.filter((item) => {
    const matchesCat = cheatCategory === "All" || item.category === cheatCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(cheatSearch.toLowerCase()) ||
      item.explanation.toLowerCase().includes(cheatSearch.toLowerCase()) ||
      item.usedInFiles.some((f) => f.toLowerCase().includes(cheatSearch.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* ----------------- TOP BANNER & BREADCRUMB ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 font-semibold">
              Dev Workbench
            </span>
            <span className="font-mono text-xs text-status-done flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-done animate-pulse" />
              NODE_ENV: development
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Architecture, Codeflow & Component Playground
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Interactive routing pipeline inspector, design tokens, live DB telemetry, and Tracklist
            code patterns.
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-card border border-border text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-brand" />
            <span>
              Signed in as <strong className="text-foreground">{currentUser.displayName}</strong> (@
              {currentUser.username})
            </span>
          </div>
        )}
      </div>

      {/* ----------------- WORKBENCH TAB CONTROLS ----------------- */}
      <div className="flex items-center gap-1.5 p-1 bg-card border border-border rounded-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("routes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap ${
            activeTab === "routes"
              ? "bg-brand text-brand-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Route & Dataflow Explorer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("components")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap ${
            activeTab === "components"
              ? "bg-brand text-brand-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>2. Component & Design Sandbox</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("db")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap ${
            activeTab === "db"
              ? "bg-brand text-brand-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>3. Live Database & API Pulse</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cheatsheet")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap ${
            activeTab === "cheatsheet"
              ? "bg-brand text-brand-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>4. Hooks & Functions Cheat Sheet</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: INTERACTIVE ROUTE & DATAFLOW EXPLORER
      ========================================================================= */}
      {activeTab === "routes" && (
        <div className="space-y-6">
          {/* Top route selector pills */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Select Route to Trace (All 10 Routes)
            </span>
            <div className="flex flex-wrap gap-2">
              {ROUTE_PIPELINES.map((r, index) => {
                const isSelected = r.id === selectedRouteId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRouteId(r.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-brand text-brand-foreground font-semibold shadow-xs"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className="opacity-60">{index + 1}.</span>
                    <span>{r.path}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Route Header Card */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-bold font-mono text-brand">
                    {selectedRoute.path}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-muted text-muted-foreground border border-border">
                    {selectedRoute.authLevel}
                  </span>
                  {selectedRoute.privacyRule && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-status-queue/10 text-status-queue border border-status-queue/20">
                      Privacy Aware
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-foreground">{selectedRoute.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedRoute.shortDesc}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={
                    selectedRoute.path.startsWith("/")
                      ? selectedRoute.path
                          .split(" ")[0]
                          .replace("[type]", "movie")
                          .replace("[id]", "693134")
                          .replace("[username]", currentUser?.username || "demo")
                      : "/"
                  }
                  target="_blank"
                  className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-medium border border-border flex items-center gap-1.5 transition"
                >
                  <span>Open Route</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => copyText(selectedRoute.path, "Route path")}
                  className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition cursor-pointer"
                  title="Copy Route Path"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 4-Stage Horizontal/Vertical Pipeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted-foreground">
                <span>4-Stage Execution Pipeline</span>
                <span className="text-brand">
                  Gatekeeper → Server Loader → Client Component → Mutations & UI
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 relative">
                {/* STAGE 1 */}
                <div className="p-4 rounded-2xl bg-background border border-border flex flex-col justify-between space-y-3 relative group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-status-queue font-semibold">
                        STAGE 01
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        Gatekeeper
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {selectedRoute.stage1.title}
                    </h4>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {selectedRoute.stage1.badge}
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                      {selectedRoute.stage1.details.map((item) => (
                        <li key={item} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedRoute.stage1.codeSnippet && (
                    <div className="mt-2 p-2 rounded-lg bg-card border border-border overflow-x-auto">
                      <pre className="text-[10px] font-mono text-foreground/80 whitespace-pre">
                        {selectedRoute.stage1.codeSnippet}
                      </pre>
                    </div>
                  )}
                </div>

                {/* STAGE 2 */}
                <div className="p-4 rounded-2xl bg-background border border-border flex flex-col justify-between space-y-3 relative group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-brand font-semibold">STAGE 02</span>
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        Server Loader
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {selectedRoute.stage2.title}
                    </h4>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {selectedRoute.stage2.badge}
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                      {selectedRoute.stage2.details.map((item) => (
                        <li key={item} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedRoute.stage2.codeSnippet && (
                    <div className="mt-2 p-2 rounded-lg bg-card border border-border overflow-x-auto">
                      <pre className="text-[10px] font-mono text-foreground/80 whitespace-pre">
                        {selectedRoute.stage2.codeSnippet}
                      </pre>
                    </div>
                  )}
                </div>

                {/* STAGE 3 */}
                <div className="p-4 rounded-2xl bg-background border border-border flex flex-col justify-between space-y-3 relative group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-status-doing font-semibold">
                        STAGE 03
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        Client Hook
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {selectedRoute.stage3.title}
                    </h4>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {selectedRoute.stage3.badge}
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                      {selectedRoute.stage3.details.map((item) => (
                        <li key={item} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedRoute.stage3.codeSnippet && (
                    <div className="mt-2 p-2 rounded-lg bg-card border border-border overflow-x-auto">
                      <pre className="text-[10px] font-mono text-foreground/80 whitespace-pre">
                        {selectedRoute.stage3.codeSnippet}
                      </pre>
                    </div>
                  )}
                </div>

                {/* STAGE 4 */}
                <div className="p-4 rounded-2xl bg-background border border-border flex flex-col justify-between space-y-3 relative group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-status-done font-semibold">
                        STAGE 04
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        Mutations & UI
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-foreground">
                      {selectedRoute.stage4.title}
                    </h4>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {selectedRoute.stage4.badge}
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                      {selectedRoute.stage4.details.map((item) => (
                        <li key={item} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-2 p-2 rounded-lg bg-card/60 border border-border text-[11px] font-mono text-muted-foreground">
                    ✓ Verified architectural contract
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: LIVE COMPONENT & DESIGN SYSTEM SANDBOX
      ========================================================================= */}
      {activeTab === "components" && (
        <div className="space-y-8">
          {/* SECTION A: COLOR & STATUS TOKENS */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Color & Status Tokens (src/app/globals.css)
                </h3>
                <p className="text-xs text-muted-foreground">
                  100% Dark Mode tokens. Click any card to copy its Tailwind class.
                </p>
              </div>
              <span className="text-xs font-mono text-brand">Dark Mode Locked</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {DESIGN_TOKENS.map((token) => (
                <button
                  key={token.variable}
                  type="button"
                  onClick={() => copyText(token.cssClass.split(" ")[0], token.name)}
                  className="p-3 rounded-2xl bg-background border border-border hover:border-brand/50 transition cursor-pointer text-left space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-7 h-7 rounded-xl border border-white/10 shadow-xs inline-block"
                      style={{ backgroundColor: token.hex }}
                    />
                    <span className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
                      {token.hex}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{token.name}</h4>
                    <p className="font-mono text-[10px] text-brand truncate">{token.variable}</p>
                    <p className="font-mono text-[10px] text-muted-foreground truncate">
                      {token.cssClass}
                    </p>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                    {token.role}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION B: STEALTH MODE LIVE TEST */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Stealth Mode Live Test (&lt;PosterToggle /&gt; + &lt;PosterImage /&gt; +
                  &lt;MediaCard /&gt;)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Click the button below to toggle hidePosters across the entire app via
                  PosterProvider.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-background px-4 py-2 rounded-2xl border border-border">
                <span className="text-xs text-muted-foreground">Live Stealth Mode:</span>
                <span
                  className={`text-xs font-mono font-semibold ${hidePosters ? "text-status-doing" : "text-status-done"}`}
                >
                  {hidePosters ? "ACTIVE (Hidden)" : "OFF (Art Visible)"}
                </span>
                <PosterToggle />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Standalone PosterImage */}
              <div className="p-4 rounded-2xl bg-background border border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    &lt;PosterImage /&gt; Primitive
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">Standalone</span>
                </div>
                <div className="relative aspect-2/3 w-full max-w-50 mx-auto rounded-2xl overflow-hidden bg-muted border border-border shadow-md">
                  <PosterImage
                    src="https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"
                    title="Dune: Part Two"
                    mediaType="movie"
                    releaseYear={2024}
                    sizes="200px"
                    className="object-cover"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Swaps between high-res artwork and typographic fallback card when Stealth Mode
                  toggles.
                </p>
              </div>

              {/* Interactive MediaCard */}
              <div className="p-4 rounded-2xl bg-background border border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    &lt;MediaCard /&gt; Live Brick
                  </span>
                  <span className="font-mono text-[10px] text-brand">Interactive</span>
                </div>

                <div className="w-full max-w-50 mx-auto">
                  <MediaCard
                    title="Dune: Part Two"
                    mediaType={demoMediaType}
                    releaseYear={2024}
                    posterUrl="https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"
                    currentStatus={demoStatus}
                    rating={demoRating}
                    onQuickStatus={(status) => {
                      setDemoStatus(status);
                      toast.success(`Demo status changed to ${status}`);
                    }}
                    onClick={() => toast.info("Clicked Dune: Part Two MediaCard")}
                  />
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Hover over the poster to test interactive quick status actions (Bookmark, Play,
                  Check).
                </p>
              </div>

              {/* Live Sandbox Controls */}
              <div className="p-4 rounded-2xl bg-background border border-border space-y-4">
                <span className="text-xs font-semibold text-foreground">
                  Interactive Card Controls
                </span>

                {/* Media Type Switcher */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-muted-foreground">Media Type:</span>
                  <div className="flex items-center gap-1.5">
                    {(["movie", "tv", "game"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDemoMediaType(t)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono capitalize transition cursor-pointer ${
                          demoMediaType === t
                            ? "bg-brand text-brand-foreground font-semibold"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Switcher */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Active Tracking Status:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(["want_to", "doing", "done", "dropped"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDemoStatus(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                          demoStatus === s
                            ? "bg-foreground text-background font-semibold"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Switcher */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Star Rating (1–5):
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setDemoRating(demoRating === star ? null : star)}
                        className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                          demoRating && demoRating >= star
                            ? "text-rating"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    ))}
                    {demoRating && (
                      <button
                        type="button"
                        onClick={() => setDemoRating(null)}
                        className="text-[10px] text-muted-foreground hover:text-destructive underline ml-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Rendered Props JSON */}
                <div className="space-y-1 pt-2 border-t border-border">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Active React Props:
                  </span>
                  <pre className="p-2 rounded-lg bg-card text-[10px] font-mono text-foreground/80 overflow-x-auto">
                    {JSON.stringify(
                      {
                        title: "Dune: Part Two",
                        mediaType: demoMediaType,
                        currentStatus: demoStatus,
                        rating: demoRating,
                        hidePostersActive: hidePosters,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION C: ID NORMALIZATION TESTER */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  ID Normalization & URL Transformer
                </h3>
                <p className="text-xs text-muted-foreground">
                  Database stores prefixed external IDs (tmdb:movie:... or igdb:...). Routes
                  strictly strip the prefix.
                </p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">getMediaHref()</span>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">Sample External IDs:</span>
              {["tmdb:movie:693134", "tmdb:tv:95396", "igdb:119133", "tmdb:movie:157336"].map(
                (sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setIdInput(sample)}
                    className={`px-2.5 py-1 rounded-full text-xs font-mono transition cursor-pointer ${
                      idInput === sample
                        ? "bg-brand text-brand-foreground font-semibold"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sample}
                  </button>
                ),
              )}
            </div>

            {/* Interactive Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="external-id-input"
                className="text-xs font-mono text-muted-foreground"
              >
                Type External ID (e.g. tmdb:movie:..., tmdb:tv:..., igdb:...):
              </label>
              <input
                id="external-id-input"
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                placeholder="tmdb:movie:693134"
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground font-mono text-sm focus:outline-none focus:border-brand"
              />
            </div>

            {/* Visual Transformation Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  1. In Database (media_items)
                </span>
                <p className="text-xs font-mono text-status-queue font-semibold break-all">
                  {idInput || "empty"}
                </p>
                <p className="text-[10px] text-muted-foreground">Unique column `external_id`</p>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  2. Upstream Provider
                </span>
                <p className="text-xs font-mono text-brand font-semibold">
                  {idParsed.provider} ({idParsed.mediaType})
                </p>
                <p className="text-[10px] text-muted-foreground">Extracted from prefix</p>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  3. Stripped Raw ID
                </span>
                <p className="text-xs font-mono text-status-doing font-semibold">
                  {idParsed.rawId || "invalid"}
                </p>
                <p className="text-[10px] text-muted-foreground">Numeric ID without prefix</p>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  4. Canonical Route URL
                </span>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-mono text-status-done font-semibold truncate">
                    {idParsed.routeUrl}
                  </p>
                  {idParsed.rawId && (
                    <Link
                      href={idParsed.routeUrl}
                      target="_blank"
                      className="text-brand hover:underline p-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">Result of getMediaHref()</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LIVE DATABASE & API PULSE
      ========================================================================= */}
      {activeTab === "db" && (
        <div className="space-y-8">
          {/* LIVE ROW COUNTS SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-card border border-border space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-mono uppercase tracking-wider">Table: users</span>
                <Users className="w-4 h-4 text-brand" />
              </div>
              <div className="text-3xl font-bold font-mono text-foreground">
                {dbStats.users.total}
              </div>
              <p className="text-xs text-muted-foreground">Registered members on instance</p>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-mono uppercase tracking-wider">
                  Table: media_items
                </span>
                <Film className="w-4 h-4 text-status-queue" />
              </div>
              <div className="text-3xl font-bold font-mono text-foreground">
                {dbStats.mediaItems.total}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>{dbStats.mediaItems.byType.movie} movies</span>
                <span>•</span>
                <span>{dbStats.mediaItems.byType.tv} tv</span>
                <span>•</span>
                <span>{dbStats.mediaItems.byType.game} games</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-card border border-border space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-mono uppercase tracking-wider">
                  Table: user_media_entries
                </span>
                <Activity className="w-4 h-4 text-status-done" />
              </div>
              <div className="text-3xl font-bold font-mono text-foreground">
                {dbStats.userMediaEntries.total}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="text-status-queue">
                  {dbStats.userMediaEntries.byStatus.want_to} queue
                </span>
                <span>•</span>
                <span className="text-status-doing">
                  {dbStats.userMediaEntries.byStatus.doing} doing
                </span>
                <span>•</span>
                <span className="text-status-done">
                  {dbStats.userMediaEntries.byStatus.done} done
                </span>
              </div>
            </div>
          </div>

          {/* SCHEMA INSPECTOR CARDS */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Core PostgreSQL Schema Inspector (Drizzle ORM)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Primary keys, unique constraints, foreign keys, and indexes for the 3 core tables.
                </p>
              </div>
              <span className="text-xs font-mono text-status-done">Live PostgreSQL Connection</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Table 1: users */}
              <div className="p-4 rounded-2xl bg-background border border-border space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-bold text-brand">users</span>
                    <p className="text-[11px] text-muted-foreground">Instance accounts & privacy</p>
                  </div>
                  <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded-full">
                    {dbStats.users.total} rows
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Primary Key
                    </span>
                    <span className="text-status-queue">id: uuid (gen_random_uuid)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Unique Constraints
                    </span>
                    <span className="text-foreground">username (unique), email (unique)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Columns & Defaults
                    </span>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
                      <li>• displayName: text (notNull)</li>
                      <li>• isPublic: boolean (default: true)</li>
                      <li>• passwordHash: text</li>
                      <li>• avatarUrl: text</li>
                      <li>• createdAt, updatedAt: timestamp</li>
                    </ul>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Relations
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      entries (1:N), sessions (1:N)
                    </span>
                  </div>
                </div>
              </div>

              {/* Table 2: media_items */}
              <div className="p-4 rounded-2xl bg-background border border-border space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-bold text-status-queue">
                      media_items
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Universal TMDB/IGDB metadata cache
                    </p>
                  </div>
                  <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded-full">
                    {dbStats.mediaItems.total} rows
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Primary Key
                    </span>
                    <span className="text-status-queue">id: uuid (gen_random_uuid)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Unique Constraint
                    </span>
                    <span className="text-foreground">externalId: text (unique)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Indexes
                    </span>
                    <span className="text-foreground">idx_media_items_media_type</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Columns
                    </span>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
                      <li>• mediaType: enum('movie','tv','game')</li>
                      <li>• title: text, releaseYear: integer</li>
                      <li>• posterUrl, backdropUrl: text</li>
                      <li>• summary: text, genres: text[]</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Table 3: user_media_entries */}
              <div className="p-4 rounded-2xl bg-background border border-border space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-bold text-status-done">
                      user_media_entries
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Tracking bridge between user & media
                    </p>
                  </div>
                  <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded-full">
                    {dbStats.userMediaEntries.total} rows
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Primary Key
                    </span>
                    <span className="text-status-queue">id: uuid (gen_random_uuid)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Foreign Keys
                    </span>
                    <ul className="text-[11px] text-foreground space-y-0.5 font-mono">
                      <li>• userId → users.id (CASCADE)</li>
                      <li>• mediaItemId → media_items.id (CASCADE)</li>
                    </ul>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Unique & Indexes
                    </span>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
                      <li>• UNIQUE(userId, mediaItemId)</li>
                      <li>• idx_user_entries_user_status</li>
                      <li>• idx_user_entries_updated_at</li>
                    </ul>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Columns
                    </span>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
                      <li>• status: enum('want_to','doing','done','dropped')</li>
                      <li>• rating: smallint (1–5)</li>
                      <li>• reviewNote: text (max 280)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LIVE API PING TESTER */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-foreground">Live API Ping Tester</h3>
                <p className="text-xs text-muted-foreground">
                  Dispatch requests to internal endpoints and inspect formatted responses with
                  latency.
                </p>
              </div>
              <span className="text-xs font-mono text-brand">Real-Time Fetch</span>
            </div>

            {/* Quick preset endpoints */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">Presets:</span>
              {[
                "/api/search?q=batman",
                "/api/entries",
                "/api/discover?type=movie&sort=popular",
                "/api/calendar?month=2026-11",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setPingUrl(preset);
                    handleExecutePing(preset);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition cursor-pointer ${
                    pingUrl === preset
                      ? "bg-brand text-brand-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom URL Input & Ping button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-brand font-semibold">
                  GET
                </span>
                <input
                  type="text"
                  value={pingUrl}
                  onChange={(e) => setPingUrl(e.target.value)}
                  placeholder="/api/search?q=..."
                  className="w-full pl-14 pr-4 py-2 rounded-xl bg-background border border-border text-foreground font-mono text-xs sm:text-sm focus:outline-none focus:border-brand"
                />
              </div>

              <button
                type="button"
                onClick={() => handleExecutePing()}
                disabled={pingLoading}
                className="px-4 py-2 rounded-xl bg-brand text-brand-foreground font-semibold text-xs sm:text-sm flex items-center gap-2 hover:opacity-90 transition cursor-pointer disabled:opacity-50"
              >
                {pingLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Send</span>
              </button>
            </div>

            {/* Response Area */}
            {pingResponse && (
              <div className="p-4 rounded-2xl bg-background border border-border space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-xs font-semibold ${
                        pingResponse.status === 200
                          ? "bg-status-done/20 text-status-done border border-status-done/30"
                          : "bg-destructive/20 text-destructive border border-destructive/30"
                      }`}
                    >
                      {pingResponse.status || "ERR"} {pingResponse.statusText || pingResponse.error}
                    </span>
                    {pingResponse.durationMs !== undefined && (
                      <span className="font-mono text-xs text-muted-foreground">
                        Latency: {pingResponse.durationMs}ms
                      </span>
                    )}
                    {pingResponse.sizeBytes !== undefined && (
                      <span className="font-mono text-xs text-muted-foreground">
                        Size: {Math.round((pingResponse.sizeBytes / 1024) * 10) / 10} KB
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      copyText(JSON.stringify(pingResponse.data, null, 2), "API response JSON")
                    }
                    className="p-1.5 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </button>
                </div>

                <pre className="p-3 rounded-xl bg-card border border-border text-[11px] font-mono text-foreground overflow-x-auto max-h-96">
                  {JSON.stringify(pingResponse.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: HOOKS & FUNCTIONS CHEAT SHEET
      ========================================================================= */}
      {activeTab === "cheatsheet" && (
        <div className="space-y-6">
          {/* Controls: Search + Categories */}
          <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cheatSearch}
                  onChange={(e) => setCheatSearch(e.target.value)}
                  placeholder="Filter hooks, functions, or file paths..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border text-foreground text-xs sm:text-sm focus:outline-none focus:border-brand"
                />
              </div>

              <span className="text-xs font-mono text-muted-foreground">
                Showing {filteredCheatSheet.length} of {CHEAT_SHEET.length} patterns
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "All",
                "React Hooks",
                "Next.js Navigation",
                "TanStack Query",
                "Tracklist Hooks",
                "Server & DB Helpers",
              ].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCheatCategory(category)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition cursor-pointer ${
                    cheatCategory === category
                      ? "bg-brand text-brand-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCheatSheet.map((item) => (
              <div
                key={item.name}
                className="p-5 rounded-3xl bg-card border border-border flex flex-col justify-between space-y-4 hover:border-brand/40 transition group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold font-mono text-brand">{item.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                      {item.category}
                    </span>
                  </div>

                  <p className="font-mono text-[11px] text-muted-foreground">
                    import &#123; {item.name} &#125; from &quot;{item.importSource}&quot;;
                  </p>

                  <p className="text-xs text-foreground leading-relaxed">{item.explanation}</p>
                </div>

                {/* Code Snippet */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Codebase Snippet</span>
                    <button
                      type="button"
                      onClick={() => copyText(item.codeSnippet, item.name)}
                      className="hover:text-brand flex items-center gap-1 transition cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-background border border-border text-[11px] font-mono text-foreground/90 overflow-x-auto whitespace-pre">
                    {item.codeSnippet}
                  </pre>
                </div>

                {/* Used In Files */}
                <div className="space-y-1 pt-2 border-t border-border">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Used In:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.usedInFiles.map((file) => (
                      <span
                        key={file}
                        className="px-2 py-0.5 rounded-lg bg-background border border-border text-[10px] font-mono text-muted-foreground"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
