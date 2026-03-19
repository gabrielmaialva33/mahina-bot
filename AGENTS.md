# Repository Guidelines

## Project Structure & Module Organization

Core application code lives in `src/`. Use `src/commands/` for Discord command handlers, `src/events/` for client/player/node event listeners, `src/services/` for AI, Lavalink, and integration services, and `src/common/` plus `src/utils/` for shared infrastructure and helpers. Database schema files live in `prisma/`. Runtime and deployment assets are in `scripts/`, `docker-compose.yml`, `lavalink-compose.yml`, `application.yml`, and `nginx.conf`. Locale files are stored in `src/locales/` and `locales/`.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies; Node `>=22.11.0` is required.
- `pnpm start:dev`: rebuilds with `tsup` and runs the bot through `nodemon` while watching `src/`.
- `pnpm build`: creates the production bundle in `dist/`.
- `pnpm start` or `pnpm start:max`: run the compiled bot.
- `pnpm lint`: run ESLint across the repository.
- `pnpm format`: apply Prettier formatting.
- `pnpm db:push` / `pnpm db:migrate`: sync or migrate the Prisma schema.
- `docker-compose up -d`: start local infrastructure such as the database and supporting services.

## Coding Style & Naming Conventions

This is a strict TypeScript ESM project. Follow the existing 2-space indentation and keep imports grouped and minimal. Use `camelCase` for variables/functions, `PascalCase` for classes, and lowercase snake-style filenames for commands and events such as `src/commands/music/play.ts` or `src/events/client/message_create.ts`. Prefer the configured path aliases (`#src/*`, `#common/*`, `#commands/*`, `#utils/*`) over deep relative imports. Format with Prettier and lint with the AdonisJS ESLint config before opening a PR.

## Testing Guidelines

There is no committed automated test suite yet. Treat `pnpm lint` and `pnpm build` as the minimum pre-PR checks, then manually verify the affected bot flow locally. If you add tests, place them as `*.spec.ts`; `nodemon` already ignores that pattern during development.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commits, for example `feat(service): ...`, `fix(config): ...`, and `chore: ...`. Keep commits scoped and imperative. PRs should include a short description, linked issue when applicable, environment or schema changes, and screenshots or command examples for user-facing behavior.

## Security & Configuration Tips

Copy `.env.example` to `.env` and never commit secrets. Validate changes to AI keys, database settings, Lavalink nodes, and Docker configuration together so local and production environments stay aligned.
