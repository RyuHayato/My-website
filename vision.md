# Vision

A portfolio of polished, fast, accessible websites: the **Sublevel Studio** site (React 19 + Vite + TypeScript, repo root) and the config-driven **site-template** (`site-template/`, Python build with JSON config and themes). The factory scores every piece of work against this file. The overarching goal is a **better UI/UX across both sites**.

## Goals
- Make each site feel premium and cohesive: consistent design tokens (colour, type, spacing, motion) per site, with no one-off magic values.
- Improve usability: clear navigation, obvious calls to action, readable hierarchy, helpful empty/error/loading states, and forms with inline validation.
- Reach WCAG 2.2 AA: text contrast of at least 4.5:1, visible focus states, full keyboard access, semantic landmarks, alt text, and a working `prefers-reduced-motion` path.
- Be fast: Lighthouse performance and accessibility of at least 90 on mobile, self-hosted fonts, optimised images (WebP/SVG), no layout shift, and a small JS bundle.
- Be responsive from 360px to 1920px with no horizontal overflow, and with touch targets of at least 44px.
- Keep motion purposeful: easing and duration tokens in one place, subtle hover, press and reveal feedback, and a calm, optional ambient audio dock that fails soft.
- Keep shared patterns (header, footer, buttons, cards, filters) consistent where it matters, while each site keeps its own identity (Sublevel: dark and cinematic; template: warm editorial/brass).
- Make the template easy to re-skin: new content and palettes come from `config/*.json` only, validated by `build.py --check`.

## Target users
- Visitors and prospective clients on phones and laptops, who need to understand the offer within seconds and reach contact in one or two clicks.
- Users of assistive technology (screen readers, keyboard-only, low vision, reduced motion), who need the full experience without barriers.
- The site owner, who needs to edit content, swap themes, and ship updates without breaking the design.

## Principles
- Small, well-tested changes: one UX improvement per change, with before and after screenshots in `shots/`.
- Design tokens first: change a token rather than overriding styles in many places.
- Progressive enhancement: content and navigation work without JS. Motion and audio are extras.
- Accessibility is a feature, not a polish step. Never trade away contrast, focus or reduced-motion support for looks.
- Performance budget: no new runtime dependency or CDN request without a clear UX payoff.
- Keep the public surface stable: existing URLs, page filenames, config schema keys, `build.py` CLI, and `npm` scripts (`dev`, `build`, `preview`).
- Copy is part of UX: concise, honest, and specific.

## Out of scope
- Full rebrands, or swapping the frameworks or build tools of either site.
- Adding backends, analytics or tracking, third-party widgets, or cookie-setting scripts.
- Autoplaying audio or video that ignores browser policy or user choice, or embedding media the owner is not entitled to use.
- Dark patterns, fake urgency, or invented testimonials and metrics.
- Editing generated output (`dist/`, `site-template/dist/`, `dist-alt/`) by hand. Change the source and rebuild instead.
- Reintroducing the removed DeployVera site or its assets.
- Changes to `node_modules/`, `.hermes/`, or `.workbuddy-ai/` tooling and notes.

## Quality bar
- Every behaviour change comes with tests. Use the `unittest` suite and `build.py --check` for the template, and for the React site `npm run build` (type-check plus build) must pass.
- Every visual change is checked at 1440, 768 and 390px with zero horizontal overflow, with screenshots saved to `shots/`.
- A contrast audit of the palette shows 0 failures, and `prefers-reduced-motion` is verified.
- No console errors, and no broken links or missing assets.
- Generated output is rebuilt and in sync with the source before merge.
- CI is green before merge.

## Protected areas
Paths (globs in backticks) and topics that always need a human. The factory never merges
changes that touch them; they go to your inbox.
- `**/auth/**`
- `**/migrations/**`
- `.github/workflows/**`
- `LICENSE`
- `**/LICENSE`
- `package.json` and `package-lock.json` (dependency changes)
- `site-template/config/site.json` (live site content and identity)
- payments
- licensing
- third-party media and font licensing
