# PropertyLink

Next.js App Router + React 19 + TypeScript + Tailwind CSS, with Prisma 5/PostgreSQL.

## Working on this repository

- Read README.md for setup and PROJECT_STATUS.md for unfinished work. Language/Settings work is partial; do not claim full verification.
- Start with task-relevant files in src/app, src/components, src/context and src/lib.
- Use npm and the committed package-lock.json. Start npm run dev only if a suitable server is not already running. Default port: 3000.
- Keep secrets in local .env files; commit only .env.example placeholders. Never commit uploads, database contents, build output or personal tool configuration.
- Run npm run typecheck and npm run lint. Run build and relevant workflow checks when needed. Never run mutation tests against production.
- Add migrations rather than rewriting applied migrations. Do not execute prisma/migration-archive against the current database. Preserve the database-only uq_user_single_role unique index.
- Prisma 5 uses prisma/schema.prisma, not prisma.config.ts. npm ci generates Prisma Client automatically.
- Use PreferencesContext translation and formatting hooks. Preserve user content, API enums and URLs.
- Keep changes focused and report actual validation in pull requests.
