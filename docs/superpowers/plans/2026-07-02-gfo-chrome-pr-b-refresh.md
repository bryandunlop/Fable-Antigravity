# GFO Chrome (PR B) — refresh addendum to the 2026-06-11 Phase-1 plan

> Execute `2026-06-11-gfo-redesign-phase-1-chrome.md` WITH these deltas. Everything not listed applies verbatim. Spec authority: `2026-07-02-nav-simplification-v2-gfo-chrome-design.md` §PR B.

**Branch:** `feat/gfo-chrome` off `main` @ `b0a035d` (nav v2 merged) — replaces the plan's Task 1.

## Deltas (world moved since 2026-06-11)

1. **Task 2 Step 2 (create `src/vite-env.d.ts`) — SKIP**, it exists.
2. **Navigation.tsx was rewritten by nav v2** (manifest-driven). The plan's intents map as:
   - Brand header block (Plane orb + "P&G Flight Ops") — same JSX, now ~line 306. After the lockup swap, `Plane` is fully unused (items get icons from the manifest) → REMOVE the import, contra the plan's "Plane stays" note.
   - Step 5 eyebrow classes go on the `SidebarGroupLabel asChild` **collapse button** (new structure); its chevrons: `text-muted-foreground` → `text-sidebar-foreground/70`.
   - Step 6 item block is now `renderEntry` (uses `item.label`, `to={item.href ?? item.path}`) — apply the plan's replacement classes there; the brand rule "no scale-on-hover" also deletes the `group-hover:scale-110` nav-v2 carried over.
   - NEW nav-v2 elements need the same treatment: the "More (n)/Less" row → `text-sidebar-foreground hover:bg-white/10 hover:text-white`.
   - Steps 4, 7, 8 anchors shifted but content unchanged — apply as written.
3. **Task 3 MobileBottomNav** gained a 5th "More" button + Sheet (nav v2): style the More button with the plan's item classes (`text-white/65 hover:text-white hover:bg-white/10`); the Sheet stays token-surfaced (it overlays content, not the bar).
4. **Verification model** (plan predates the test runner): per-task gates are `npx vitest run` (417+), `npx vite build`, and no NEW tsc errors vs a fresh baseline captured at branch time (`/tmp/gfo-b-baseline.txt`); Task 8 browser pass light+dark stands.
5. Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`; final branch/PR names: `feat/gfo-chrome`, PR title `feat(gfo-chrome): GFO Phase 1 chrome — Midnight sidebar, lockup, login showpiece, dashboard header`.
