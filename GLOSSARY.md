# Tracklist — Domain & Route Glossary

This document is the single source of truth for terminology, status values, and route URLs across Tracklist. All UI copy, components, comments, and API handlers must use these exact terms.

## 1. Core Product Vocabulary

| Canonical Term | Definition | Deprecated Terms (NEVER USE) |
| :--- | :--- | :--- |
| **Tracklist** | The application name. | Media Tracker |
| **Library** | A user's personal saved collection of movies, TV series, and games. | Shelf, Stash, Backlog, Watchlist, Collection |
| **Explore** | The catalog discovery, filtering, and similarity ("Related Titles") page. | Discover, Cosmos, Browse |
| **Calendar** | The monthly release schedule (Month Grid, Agenda List, and Day Panel). | Schedule, Releases |
| **Friends** | Other members on the instance whose public profiles and activity you can view. | Squad, Crew, Community, Following |
| **Public Profile** | A user profile (`users.isPublic = true`) visible to other authenticated members. | Squad Member Page |
| **Private Profile** | A user profile (`users.isPublic = false`) whose Library and activity are hidden from other members. | — |
| **Stealth Mode** | Cookie-backed toggle (`hide_posters=1`) that hides all poster/backdrop images and renders typographic fallback cards for discreet browsing. | Hide Posters |
| **Anchor** | A selected title on `/explore` used to fetch and display similar/related titles. | Seed, Pin |

---

## 2. Tracking Statuses (`media_status` Enum)

Database enum values in `user_media_entries.status` and their exact UI labels, semantic tokens, and Lucide icons:

| DB Enum Value | UI Label | Action Verb (Toasts/Feed) | CSS Token (`globals.css`) | Icon (`lucide-react`) |
| :--- | :--- | :--- | :--- | :--- |
| `want_to` | **Queue** | Added to Queue | `status-queue` (`#A1A5AD`) | `Bookmark` |
| `doing` | **In Progress** | Marked as In Progress | `status-doing` (`#E3A94B`) | `Play` |
| `done` | **Done** | Logged as Completed | `status-done` (`#4FB286`) | `Check` |
| `dropped` | **Dropped** | Marked as Dropped | `status-dropped` (`#6B6B76`) | `Ban` |

* **Rating Scale:** Integer `1` to `5` stars (`user_media_entries.rating`). Uses token `text-rating` (`#FFC94D`) and `Star` icon.
* **Review Note:** Optional short review (`user_media_entries.reviewNote`, max 280 characters).

---

## 3. Media Types (`media_type` Enum)

| DB Enum Value | UI Label (Singular) | UI Label (Plural) | External Source | `external_id` Format |Icon (`lucide-react`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `movie` | **Movie** | **Movies** | TMDB | `tmdb:movie:{id}` | `Film` |
| `tv` | **TV Series** | **TV Series** | TMDB | `tmdb:tv:{id}` | `Tv` |
| `game` | **Game** | **Games** | IGDB (Twitch) | `igdb:{id}` | `Gamepad2` |

---

## 4. Canonical Route Map

Every screen has **one** canonical URL. Never create duplicate alias routes or redirect stubs.

### App Routes (`src/app/(app)/`)
* `/` — **Home**: Personal dashboard (Overview stats pulse, *Continue* row, *Up Next in Queue* row, *Last Tracked* activity, and *Trending This Week*).
* `/library` — **Library**: Personal collection filtered by status (`want_to`, `doing`, `done`, `dropped`) and media type (`all`, `movie`, `tv`, `game`).
* `/explore` — **Explore**: Catalog browser with Media Type, Sort (`popular`, `top_rated`, `upcoming`), Genre, and Year filters + Related Titles Anchor exploration.
* `/calendar` — **Calendar**: Monthly release schedule with Month Grid view, Agenda List view, and slide-over Day Panel.
* `/friends` — **Friends Directory**: Overview of members, their stats, and what public friends are currently watching or playing.
* `/friends/[username]` — **Friend Profile**: A member's profile and Library (enforces `users.isPublic` privacy check).
* `/media/[type]/[id]` — **Media Detail**: Deep dive for `movie`, `tv`, or `game` (`[id]` is the raw numeric TMDB/IGDB ID with the `tmdb:movie:` or `igdb:` prefix stripped). Includes `MediaLogCard` and public *Friends' Activity*.
* `/person/[id]` — **Person Detail**: Cast/crew biography, *Known For* row, and filterable filmography (`[id]` is the numeric TMDB person ID).
* `/settings` — **Settings**: Appearance (Stealth Mode), Dashboard Sections (`home_hidden` cookie), Profile Display Name & Privacy (`isPublic`), Security (Password & Active Sessions), and Danger Zone.
* `/admin` — **Admin**: Member management, temporary password resets, and member removal (restricted via `isAdmin()`).

### Auth Routes (`src/app/(auth)/`)
* `/login` — **Auth**: Sign in with username/password and Create Account with invite code (`SQUAD_INVITE_CODE`).

### API Routes (`src/app/api/`)
* `GET /api/search?q=...` — Parallel search across TMDB (Movies & TV) and IGDB (Games).
* `GET / POST / DELETE /api/entries` — Read, upsert, or delete entries in `user_media_entries` + `media_items`.
* `GET /api/discover` — Paginated, filtered catalog discovery (`type`, `sort`, `genre`, `year`, `page`).
* `GET /api/discover/related?externalId=...` — Similar/recommended titles for a given `externalId`.
* `GET /api/calendar?month=YYYY-MM&type=...&lang=...&depth=...` — Monthly release dates across TMDB and IGDB.
* `GET /api/media/[type]/[id]` — Full normalized media details.
* `PATCH /api/users/profile` — Update current user's `displayName` and `isPublic` privacy setting.
* `POST /api/admin/reset-password` & `POST /api/admin/remove-member` — Admin actions.
* `GET / POST /api/auth/[...all]` — Better Auth handler.