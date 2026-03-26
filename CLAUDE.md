# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OpenCut is a privacy-first browser-based video editor. Bun monorepo with Turborepo.

## Commands

```bash
bun install                    # Install dependencies
bun dev:web                    # Dev server (Next.js + Turbopack, port 3000)
bun build:web                  # Production build
bun lint:web                   # Lint with Biome
bun lint:web:fix               # Lint and auto-fix
bun test                       # Run tests (bun test)
bun dev:ws-bridge              # WebSocket bridge server (port 3001)
bun dev:mcp                    # MCP server

# Database (requires Docker services running)
docker compose up -d db redis serverless-redis-http
cd apps/web && bun db:generate  # Generate Drizzle migrations
cd apps/web && bun db:migrate   # Run migrations
cd apps/web && bun db:push:local # Push schema to local DB
```

## Monorepo Structure

- `apps/web/` - Next.js 16 app (main editor)
- `packages/ui/` - Shared UI components (Iconify icons)
- `packages/env/` - Zod-validated environment variables
- `packages/ws-bridge/` - WebSocket bridge between MCP and browser
- `packages/mcp-server/` - MCP server for AI assistant integration

## Code Style

- **Formatter/Linter:** Biome - tabs, double quotes, 80 char line width
- **Comments:** Explain WHY, not WHAT. No obvious or changelog-style comments.
- **File organization:** One file, one responsibility. Extract shared logic when a file exceeds ~500 lines or has multiple distinct concerns.
- `lib/` is domain logic (specific to this app), `utils/` is generic helpers (portable to any project)

## Architecture

### EditorCore Singleton

All editor state flows through a singleton `EditorCore` with specialized managers (playback, timeline, scene, project, media, renderer, command, save, audio, selection).

- **In React components:** use the `useEditor()` hook from `@/hooks/use-editor` (subscribes to state changes, auto re-renders)
- **Outside React:** use `EditorCore.getInstance()` directly

### Actions System

User-triggered operations go through the actions system. Source of truth: `@/lib/actions/definitions.ts`. Handlers registered in `@/hooks/use-editor-actions.ts`.

In components, use `invokeAction("action-name")` rather than calling `editor.xxx()` directly (the action layer adds toasts, validation, etc.). Direct editor calls are for internal use (commands, tests, multi-step operations).

### Commands (Undo/Redo)

Commands in `@/lib/commands/` (organized by domain: timeline, media, scene, project). Each extends `Command` from `base-command.ts` with `execute()` and `undo()`.

Pattern: Actions trigger Commands. Actions = "what triggered this", Commands = "how to do it and undo it".

### State Management

Zustand stores in `src/stores/` for UI state (editor, timeline, preview, panels, sounds, stickers, keybindings, assets-panel).

## Tech Stack

Next.js 16 (App Router + Turbopack), React 19, Tailwind CSS 4, Radix UI / shadcn, Drizzle ORM + PostgreSQL 17, Better Auth, Upstash Redis, Zustand, FFmpeg.js, WaveSurfer.js, Biome, Bun 1.2.18, Turborepo.

## Database

PostgreSQL 17 + Drizzle ORM. Schema at `apps/web/src/lib/db/schema.ts`. Docker Compose provides local Postgres, Redis, and serverless-redis-http.
