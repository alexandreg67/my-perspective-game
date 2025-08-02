# CRUSH.md

Project: Next.js 14 + TypeScript canvas racing game

Build/Lint/Test
- Dev: npm run dev
- Build: npm run build
- Start (prod): npm run start
- Lint: npm run lint
- Typecheck: npx tsc -p tsconfig.json --noEmit
- Tests: no test runner configured; if adding Vitest or Jest, document single-test command here

Repo Conventions
- Package manager: npm
- Node: use LTS; do not commit node version managers files
- Ignore: add .crush directory to .gitignore for local agent data

Code Style
- Language: TypeScript strict mode (tsconfig strict: true)
- Imports: use path alias @/* from tsconfig; prefer type-only imports (import type { X } from '...')
- Formatting: 2 spaces, semicolons, single quotes where possible; keep lines <= 100 chars
- Components: colocate in app/components; keep render-pure logic in utils/*
- Types: define interfaces/types near usage; avoid any; use readonly where applicable
- Naming: camelCase for vars/functions, PascalCase for components/types, UPPER_SNAKE for consts
- Errors: never swallow; throw Error with message or return Result-like union; no console logs in prod
- Async: prefer async/await; handle rejections; no floating promises
- React: client components only when needed ('use client'); keep side effects in useEffect
- Canvas: rendering functions are pure given ctx + state; no DOM access inside utils
- Perspective: all drawing transforms via app/utils/perspective.ts helpers

Linting/CI
- ESLint extends next/core-web-vitals, next/typescript; fix warnings locally before commit
- Run: npm run lint && npx tsc -p tsconfig.json --noEmit before PRs

Notes
- No Cursor or Copilot rules detected
- See CLAUDE.md for high-level architecture overview