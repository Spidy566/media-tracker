# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Cross-medium entertainment enthusiasts and close friend groups managing active backlogs, current progress, and release dates across movies, TV series, and video games in one shared space.

## Product Purpose

Provide a unified, clutter-free media tracking and backlog management hub that lets individuals catalog what they want to watch or play, record progress and ratings, and stay aware of their friends' current activity without the social bloat of public networks. Success means effortless logging, zero cross-platform medium fragmentation, and clear squad visibility.

## Positioning

A consolidated multi-medium tracker (film, television, and gaming) centered on private squad feeds for close friends, avoiding public algorithmic feeds, vanity metrics, or fragmented single-medium trackers (e.g. Letterboxd for movies or Backloggd for games).

## Operating Context

- Responsive desktop dashboard and mobile web dock.
- Quick search and logging via global ⌘K shortcut.
- Viewing upcoming drops in the release Calendar.
- Browsing media details and personal/squad shelves in the Library and Explore tabs.
- Checking friends' updates via Squad profiles.

## Capabilities and Constraints

- Unified cataloging for movies, TV shows, and video games (`want_to`, `doing`, `done`, `dropped` statuses with numerical ratings and review notes).
- Server-side integration with external metadata sources (TMDB for movies/TV and external game metadata).
- Squad feed and member profile pages (`/squad/[username]`).
- Release calendar and multi-genre exploration surfaces (`/calendar`, `/explore`).
- Postgres database with Drizzle ORM; authentication via secure session cookies.

## Brand Commitments

- Name: Tracklist (internal repo `media-tracker`).
- Tone: Clean, modern, focused, and utilitarian.
- Dark mode native with theme toggle support.

## Evidence on Hand

- Committed schema and relational models in `src/db/schema.ts`.
- Working routes: Dashboard (`/`), Explore (`/explore`), Calendar (`/calendar`), Library (`/library`), Media Detail (`/media/[type]`), and Squad (`/squad/[username]`).
- Seed dataset with sample users and media items in `src/db/seed.ts`.

## Product Principles

1. **Cross-medium unity**: Movies, TV series, and video games coexist seamlessly without forcing users across fragmented apps.
2. **Squad-first, not public clout**: Activity sharing is tuned for small circles of trusted friends, prioritizing authentic notes and shared tastes over viral vanity metrics.
3. **Speed of logging**: Finding, queuing, updating status, and rating media must take seconds with low friction.
4. **Focused utility**: Provide clear personal progress tracking and release calendars without distracting algorithmic noise.
