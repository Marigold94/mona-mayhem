# Repository instructions

## Commands

- Install dependencies with `npm ci`.
- Start the Astro development server with `npm run dev` (normally at `http://localhost:4321`).
- Build the Astro app with `npm run build`; inspect the production build with `npm run preview`.
- There are currently no configured test or lint scripts and no test runner. For a one-off API smoke check, start the dev server and run `curl -i http://localhost:4321/api/contributions/octocat`.

## Architecture

This repository contains both workshop materials and the app those materials guide contributors through; they are not currently built or deployed together.

- `src/` is the Astro app. `astro.config.mjs` configures server output with the standalone `@astrojs/node` adapter. The home page is `src/pages/index.astro`; the dynamic contribution endpoint is `src/pages/api/contributions/[username].ts` and is intended to proxy GitHub contribution data. API routes need runtime execution rather than prerendering.
- `docs/` is a separate, static HTML/CSS/JS workshop site. The GitHub Pages workflow copies `docs/` and `workshop/` directly into its artifact; it does not build or deploy the Astro app.
- `workshop/` contains the English workshop guide. Its localized copies are under `workshop/es/`, `workshop/pt_BR/`, and `workshop/ko/`. The corresponding README translations are `README.es.md`, `README.pt_BR.md`, and `README.ko.md`; localized static pages are under `docs/es/`, `docs/pt_BR/`, and `docs/ko/`.
- The localization sync workflow processes canonical English `README.md`, workshop Markdown, and `docs/index.html` / `docs/step.html` changes. `.github/skills/localizations/SKILL.md` and its locale rules define translation and reconciliation requirements; `localizations/<locale>/.localization-state.json` stores synchronization metadata, not translated content.

## Repository-specific conventions

- Keep app changes in `src/` distinct from static workshop-site changes in `docs/` and `workshop/`. Changes to the Astro app alone do not alter the GitHub Pages deployment.
- TypeScript is checked using Astro's strict config in `tsconfig.json`; the project uses ES modules.
- When changing a canonical localization source, update its mapped localized outputs and preserve the existing directory layout and locale codes (`es`, `pt_BR`, `ko`). Follow the localization skill for translated content, HTML structure, links/assets, and state metadata; do not treat files under `localizations/` as source content.
- The Pages workflow publishes the static site from the `main` branch. The localization workflow also runs on `main` for changes to its specified English sources.
