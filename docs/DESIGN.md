# Design system, landing page and motion: plan and decisions

This document records what was inspected, what was decided and why, and what is still open. Read it before changing the landing page or the design tokens.

## 1. What existed before this change

| Area | Finding | Kept / changed |
|---|---|---|
| Stack | Vite 6, React 18, TypeScript, Tailwind 3.4, React Query 5, React Router 6, cmdk, sonner, recharts, lucide | Kept. Added `motion`, `gsap`, `canvas-confetti`. |
| Routing | Logged out: every path → `LoginPage`. Logged in: `AppShell` with role guards. | Logged out: `/` landing page, `/login` sign-in. Logged in: `/welcome` also shows the landing page. |
| Tokens | Purple accent `#635BDB`, neutral greys, Inter | Replaced by the Prosperr palette (section 2). Token **names** are unchanged, so no screen had to be rewritten. |
| Components | `components/ui/ui.tsx` (Button, Input, Select, Field, Card, Badge, Tabs, Segmented, Stat, Skeleton…), `overlay.tsx` (Modal, Drawer, Confirm), `status.tsx`, sonner toasts, cmdk search, kanban in `PipelinePage` | Reused. Added `Tooltip`, `AnimatedNumber`, `Logo`. |
| API | `lib/api.ts` fetch wrapper, `useAction` (mutation + toast + invalidate) | Unchanged. The landing page makes no API calls. |

The existing app was not rebuilt. Each change is a token swap or an addition.

## 2. Brand tokens (`tailwind.config.js`)

| Token | Hex | Use |
|---|---|---|
| `brand.forest` / `accent` | `#063F1A` | Primary buttons, active nav, links, logo tile |
| `brand.forest-700` / `accent.hover` | `#0A5124` | Hover state |
| `brand.forest-50` / `accent.soft` | `#E9F2EC` | Selected rows, soft highlights |
| `brand.navy` | `#22366F` | Secondary data series, stage badges, info |
| `brand.lime` | `#8BC34A` | Accent only: primary CTA on dark backgrounds, progress ends, focus glow, logo letter. **Never body text on white** (contrast too low). |
| `canvas` | `#F3F3F5` | App background |
| `ink` / `brand.charcoal` | `#151B19` | Text, dark sections |
| `success`, `warning`, `danger` | green / amber / red | Status only |

Decisions:
- **No purple or violet anywhere.** Avatar colours, stage dots and chart colours were moved to forest, navy, lime, amber, rose and slate. The blue for "Cold" temperature stays, because it carries meaning.
- The accent is forest, not lime, because lime on white fails WCAG contrast for text and buttons. Lime is used where it sits on forest or charcoal.
- Inter is kept for both surfaces. The landing page gets character from size and tracking (`-0.035em` on display type), not from a second typeface, which would add a font download.

**Logo:** the official Prosperr mark (from prosperr.io's CDN) is at `src/assets/brand/prosperr-mark.png` and `public/favicon.png`. `src/components/brand/Logo.tsx` pairs it with the PROSPERR.IO wordmark in navy. Every screen uses this one component. The logo appears only in the header (landing nav, app sidebar, sign-in form) and the footer.

**Palette (taken from prosperr.io's stylesheet):** forest `#053F1A` for primary CTAs and the one big block per page, ink `#0D0D0D` for text and the footer, canvas `#F3F3F5`, hairlines `#DCDCDE`, paper `#EFEFEF` for text on dark, mint `#23B24A` for small status accents. Lime is no longer used on the landing page. Headlines are two-tone: the second phrase uses `.dim` / `.dim-dark`. Section labels use the outlined `.eyebrow` pill.

**Display type:** Bricolage Grotesque (prosperr.io's headline face) is the `font-display` family, used for landing headings, the sign-in page and `PageHeader` titles. Body text stays Inter.

**prosperr.io patterns reused:** forest announcement strip and light header with a forest pill CTA (`LandingNav`), the three-card "managed in one place" block with contour backgrounds and chip tags (`Pillars.tsx`), and the dark corner card in the hero.

## 3. Two motion personalities

| | Landing page | CRM app |
|---|---|---|
| Purpose | Storytelling | Feedback only |
| Duration | 0.6–1.2 s, `ease.out` | 150–260 ms |
| Library | Motion for React, plus GSAP ScrollTrigger for the one pinned story | CSS keyframes and Tailwind (no animation library in the app bundle) |
| Continuous movement | A few slow ambient loops (background drift, card float, particles) | None |
| Reduced motion | Static layouts, no pinning, no playback | Already minimal. Confetti is skipped. |

Shared tokens: `src/lib/animations/index.ts` (eases, durations, variants). Shared components: `src/lib/animations/components.tsx` (`WordReveal`, `Reveal`, `StaggerGroup`, `CountUp`, `Magnetic`).

### Reduced motion, enforced three ways
1. `<MotionConfig reducedMotion="user">` wraps the landing page.
2. GSAP runs only inside `gsap.matchMedia('(min-width:1024px) and (prefers-reduced-motion: no-preference)')`. Otherwise a stacked static version renders.
3. A global CSS rule in `index.css` shortens every CSS animation and transition.

### Avoided on purpose
- No scroll hijacking or smooth-scroll libraries. Native scrolling is untouched. Long sections use `position: sticky` (and one GSAP pin), so the user always controls the scroll.
- No animation blocks reading or clicking. Navigation links and CTAs work at once.
- Only `transform`, `opacity` and `clip-path` are animated, so there are no layout shifts.
- Heavy blur appears only on a few static background glows, never animated.

## 4. Landing page (`src/pages/LandingPage.tsx`, `src/components/landing/*`)

The landing page is lazy-loaded as its own chunk (about 126 KB gzip), so Motion and GSAP never load with the CRM screens.

| # | Section | File | Techniques |
|---|---|---|---|
| 1 | Cinematic hero | `Hero.tsx` | Background reveal (scale and fade), scroll parallax, word-by-word headline, staggered CTAs, magnetic and glow buttons, three floating real-UI cards with pointer parallax, animated scroll cue |
| 2 | Problem → solution | `ProblemSolution.tsx` | GSAP ScrollTrigger pin and scrub: SVG lines draw in, five problem cards converge, the unified account panel appears, particles. Stacked version on mobile and with reduced motion. |
| 3 | Product showcase | `Showcase.tsx` | Sticky scroll-controlled switching across 7 screens, perspective tilt, animated bars and count-ups. The list is clickable and tabs work on mobile. |
| 4 | Sales workflow | `Workflow.tsx` | Scroll-driven progress line, stage activation, moving lead card, hover explanations, lime burst at Closed Won. Vertical timeline on mobile. |
| 5 | Roles | `Roles.tsx` | Staggered entrance, hover elevation and glow, animated icon, expandable details |
| 6 | Video showcase | `VideoShowcase.tsx` | Bento grid with clip-path mask reveal and zoom-out. Uses `CinematicMedia`. |
| 7 | Features | `Features.tsx` | Product facts with count-up, icon swap on hover, underline sweep |
| 8 | Final CTA | `FinalCta.tsx` | Animated forest gradient, rising particles, word reveal, glowing CTA with animated arrow, footer |

Content decisions:
- **Product previews are React components** in `previews.tsx`, styled with the app's tokens and terms. Each is labelled "Sample data". Company names are fictional.
- **No customer claims.** The only counters are facts about the product itself (7 stages, 4 ICP checks, 5 roles, 56 mapped designations). No testimonials or customer logos.
- **"Book a Demo"** goes to `VITE_DEMO_URL` when set (a Calendly or mailto link, for example). Otherwise it scrolls to the final CTA. No demo-booking backend was invented.

## 5. Video

See `docs/MEDIA-PLAN.md` for each clip's filename, purpose, duration, aspect, prompt, poster, desktop/mobile use and export settings.

No footage was generated in this change: generating video needs a tool such as Sora outside this codebase. Until clips exist, `CinematicMedia` draws abstract, text-free scenes in brand colours (glass facade, screen glow, meeting light, data lines, rising bars). Dropping in a clip means editing `src/lib/media/manifest.ts`. No component changes.

## 6. CRM feedback patterns

| Interaction | Behaviour |
|---|---|
| Complete a task (`TasksPage`) | Spinner in the checkbox while saving. **Only after the server confirms**: check-pop, strike-through sweep, counters roll (`AnimatedNumber`), success toast, then the row slides out and the list refreshes. Confetti when the last overdue/today task is cleared. |
| Deal marked Won (`OpportunityPanel`) | Success toast, then brand confetti |
| Forms (`useAction`) | Button shows loading. The success toast and close happen only in `onSuccess`. Errors keep the form open with the server message. |
| Tooltip | `Tooltip` in `ui.tsx`, CSS only, shows on hover and keyboard focus |

Confetti (`lib/celebrate.ts`) is loaded on demand and skipped for reduced motion.

## 7. Not done yet (next increments)

- The actual video clips (section 5).
- A dedicated date-picker component. The app still uses native date and datetime inputs, which are accessible and work on mobile.
- A route-level page transition inside the app. It was left out deliberately to keep navigation instant. Add a 150 ms fade on `Outlet` if wanted.
- Lighthouse and axe audits on a production build, run against the deployed site.

## 8. Landing layout rule (light page, dark bookends and stages)

- **Bookends:** the hero opens full-width on the dark contour surface (`TopoSurface`); the black footer closes the page.
- **Page:** every section in between sits on one light canvas (`bg-canvas`, `#F3F3F5`). No white-vs-grey alternation.
- **Stages:** dark appears mid-page only as inset rounded boxes on that canvas (`rounded-[40px]`, `max-w-7xl`, contour surface + soft mint glow): the Pillars banner, "In the field" and the closing CTA.
- **Cards:** dark glass cards mean live product/data (hero cards, field tiles, feature cards); white cards explain (Pillars, Roles).
- **Green:** `#23B24A`/`#1FA645` for the second phrase of headlines and live data; forest `#053F1A` for primary buttons and the top strip.
- **Rhythm:** light sections use `py-16 lg:py-20`; a section that follows another light section drops its top padding so gaps stay even.
