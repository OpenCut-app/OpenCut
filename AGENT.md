# Philosophy
This codebase will outlive you. Every shortcut becomes someone else's burden. Every
hack compounds into technical debt that slows the whole team down.
You are not just writing code. You are shaping the future of this project. The
patterns you establish will be copied. The corners you cut will be cut again.
Fight entropy. Leave the codebase better than you found it.

### Non‑negotiables
- **MUST: Never stage commits**
- **MUST: Use pnpm** as the package manager (NOT npm, yarn, or bun).
  - **MUST**: Use `pnpm install`, `pnpm lint`, `pnpm build`, etc.
  - **MUST NOT**: Run `pnpm dev` (it is already running in the background).
  - **MUST NOT**: Run `pnpm dev` by default (assume it is already running in the background).
- **MUST NOT** stop/kill the existing dev server process.
  - **Exception**: If there’s a dev-server issue and you need to validate that your change fixes the output, starting `pnpm dev` is allowed.
  - If you do start it, **do not stop the existing process**—run your instance separately.

### TypeScript + React conventions
- **MUST: Use TypeScript interfaces over types.**
- **MUST: Keep interfaces on the file’s top-level scope** (do not nest inside functions/components).
- **MUST: Use arrow functions over function declarations.**
- **MUST: Do not type cast (`as`) unless absolutely necessary.**
- **MUST: Use descriptive names for variables** (avoid shorthands, or 1–2 character names).
  - **Example**: for `.map()`, use `innerItem` instead of `x`.
  - **Example**: instead of `moved`, use `didPositionChange`.
- **MUST: Remove unused code that doesn't explicitly say why it's unused and don’t repeat yourself.**
- **MUST: Don’t repeat yourself.**

### Commenting
- **NEVER** comment unless absolutely necessary.
  - If it is a hack (e.g., `setTimeout`, browser quirks, confusing workaround), it **MUST** be prefixed with `// HACK: reason for hack`.

### Files, naming, and structure
- **MUST: Use kebab-case for files** (e.g., `hero-header.tsx`, `fade-variants.ts`).

### Styling patterns (Tailwind v4)
- **MUST** use Tailwind utilities and the existing design tokens:
  - Use `bg-foreground`, `text-background`, `bg-background`, `text-foreground`, `bg-primary-*`, etc.
  - Use the custom layout pattern: `max-w-screen-4xl mx-auto w-full`.
- **MUST NOT** use inline CSS (`style={{ ... }}`) no matter what.
  - **ONLY exception**: when Tailwind cannot achieve the **exact** behavior. In that case, keep the inline style minimal and tightly scoped.
- **MUST** prefer existing helpers for class composition:
- **MUST** never use [] to define styles. Always use default values UNLESS a specific behaviour requested by the user can only be achieved using them.
- **MUST** When adding loading states to buttons or other components, do not modify the text from `Change` to `Changing`. Instead add a loader (`loader.tsx` in `packages/ui`) on the left of the text. Should there be an existing icon in the button, replace the entire button's content with the loader. This means the button should just be the loader.
- **NEVER** use `bg-(--some-var, ...)` (double var / inline var utilities). If you need a new color, expose it as a Tailwind color token (via `@theme inline`) and use the normal class like `bg-brand-muted-hover` / `hover:bg-brand-muted-hover`.

### Animation patterns
- **MUST** use `motion/react` (not other animation libraries).

### Safety / scope rules
- **NEVER** use destructive git commands (e.g., `git reset --hard`).
- **MUST** follow the user’s requests exactly, unless the request has known security issues.
- If a task/request is **ambiguous** or could reasonably refer to **multiple different things**, **MUST** ask for clarification before making changes (e.g., “make the title in the todos blue” but there are multiple `Todo` components—ask which one, or whether to change all).
- **MUST** attempt only one fix at a time when resolving faults/errors/unexpected output.
- **MUST** fix the root cause; do not use duct-tape solutions unless all reasonable attempts have failed.
- If the user reports **no visible change** or the **error still occurs** after a fix, **MUST** undo the fix before attempting a new one.
- **MUST** do only what is asked; do not perform extra work beyond instructions or “nice-to-haves”.

