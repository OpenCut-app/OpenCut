# Contributing to OpenCut

Thank you for your interest in contributing to OpenCut! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [Bun](https://bun.sh/docs/installation)
  (for `npm` alternative)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

> **Note:** Docker is optional, but it's essential for running the local database and Redis services. If you're planning to contribute to frontend features, you can skip the Docker setup. If you have followed the steps below in [Setup](#setup), you're all set to go!

### Setup

1. Fork the repository
2. Clone your fork locally
3. Navigate to the web app directory: `cd apps/web`
4. Copy `.env.example` to `.env.local`:

   ```bash
   # Unix/Linux/Mac
   cp .env.example .env.local

   # Windows Command Prompt
   copy .env.example .env.local

   # Windows PowerShell
   Copy-Item .env.example .env.local
   ```

5. Install dependencies: `bun install`
6. Start the development server: `bun run dev`

> **Note:** If you see an error like `Unsupported URL Type "workspace:*"` when running `npm install`, you have two options:
>
> 1. Upgrade to a recent npm version (v9 or later), which has full workspace protocol support.
> 2. Use an alternative package manager such as **bun** or **pnpm**.

## What to Focus On

**🎯 Good Areas to Contribute:**

- Timeline functionality and UI improvements
- Project management features
- Performance optimizations
- Bug fixes in existing functionality
- UI/UX improvements
- Documentation and testing

**⚠️ Areas to Avoid:**

- Preview panel enhancements (text fonts, stickers, effects)
- Export functionality improvements
- Preview rendering optimizations

**Why?** We're currently planning a major refactor of the preview system. The current preview renders DOM elements (HTML), but we're moving to a binary rendering approach similar to CapCut. This new system will ensure consistency between preview and export, and provide much better performance and quality.

The current HTML-based preview is essentially a prototype - the binary approach will be the "real deal." To avoid wasted effort, please focus on other areas of the application until this refactor is complete.

If you're unsure whether your idea falls into the preview category, feel free to ask us [directly in discord](https://discord.gg/zmR9N35cjK) or create a GitHub issue!

## Development Setup

### Local Development

1. Start the database and Redis services:

   ```bash
   # From project root
   docker-compose up -d
   ```

2. Navigate to the web app directory:

   ```bash
   cd apps/web
   ```

3. Copy `.env.example` to `.env.local`:

   ```bash
   # Unix/Linux/Mac
   cp .env.example .env.local

   # Windows Command Prompt
   copy .env.example .env.local

   # Windows PowerShell
   Copy-Item .env.example .env.local
   ```

4. Configure required environment variables in `.env.local`:

   **Required Variables:**

   ```bash
   # Database (matches docker-compose.yaml)
   DATABASE_URL="postgresql://opencut:opencutthegoat@localhost:5432/opencut"

   # Generate a secure secret for Better Auth
   BETTER_AUTH_SECRET="Zc2qkQNNkpla1C+/FxVDy08T/isXKlECCkQMEOMOJWWDUqPxV+K3OI+daXg="
   NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

   # Redis (matches docker-compose.yaml)
   UPSTASH_REDIS_REST_URL="http://localhost:8079"
   UPSTASH_REDIS_REST_TOKEN="example_token"

   # Development
   NODE_ENV="development"
   ```

   **Generate BETTER_AUTH_SECRET:**

   ```bash
   # Unix/Linux/Mac
   openssl rand -base64 32

   # Windows PowerShell (simple method)
   [System.Web.Security.Membership]::GeneratePassword(32, 0)

   # Cross-platform (using Node.js)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

   # Or use an online generator: https://generate-secret.vercel.app/32
   ```

5. Run database migrations: `bun run db:migrate`
6. Start the development server: `bun run dev`

## How to Contribute

### Reporting Bugs

- Use the bug report template
- Include steps to reproduce
- Provide screenshots if applicable

### Suggesting Features

- Use the feature request template
- Explain the use case
- Consider implementation details

### Code Contributions

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Navigate to the web app directory: `cd apps/web`
4. Run the linter: `bun run lint`
5. Format your code: `bunx biome format --write .`
6. Commit your changes with a descriptive message
7. Push to your fork and create a pull request

## Code Style

- We use Biome for code formatting and linting
- Run `bunx biome format --write .` from the `apps/web` directory to format code
- Run `bun run lint` from the `apps/web` directory to check for linting issues
- Follow the existing code patterns

## Pull Request Process

1. Fill out the pull request template completely
2. Link any related issues
3. Ensure CI passes
4. Request review from maintainers
5. Address any feedback

## Community

- Be respectful and inclusive
- Follow our Code of Conduct
- Help others in discussions and issues

Thank you for contributing!
