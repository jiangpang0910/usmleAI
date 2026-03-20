# Coding Conventions

**Analysis Date:** 2026-03-20

## Naming Patterns

**Files:**
- React components: PascalCase matching the component name, e.g., `Dashboard.tsx`, `RootLayout`
- Utility/library modules: camelCase, e.g., `api.ts`, `utils.ts`
- UI primitives: lowercase, e.g., `button.tsx`, `card.tsx`
- Python modules: snake_case, e.g., `knowledge.py`, `database.py`, `config.py`

**Functions (TypeScript):**
- Exported React components: PascalCase default exports, e.g., `export default function Dashboard()`
- Utility functions: camelCase named exports, e.g., `export async function apiFetch<T>()`, `export function cn()`
- Event handlers: inline arrow functions with descriptive context, e.g., `onClick={() => alert(...)}`

**Functions (Python):**
- Route handlers and helpers: snake_case, e.g., `def health_check()`, `def get_db()`
- Async handlers: `async def lifespan(app: FastAPI)`

**Variables (TypeScript):**
- Constants at module level: camelCase, e.g., `const API_BASE_URL`, `const inter`, `const buttonVariants`
- Typed data arrays: camelCase with descriptive names, e.g., `const quickStartActions`, `const usmleSteps`
- Component props: destructured with type annotations inline

**Variables (Python):**
- Module-level constants: UPPER_SNAKE_CASE for settings fields, e.g., `DATABASE_URL`, `ANTHROPIC_API_KEY`
- Module-level instances: lowercase, e.g., `engine`, `SessionLocal`, `Base`, `settings`

**Types/Interfaces (TypeScript):**
- Interfaces: PascalCase, e.g., `interface QuickStartAction`, `interface USMLEStep`, `interface ButtonProps`
- Type aliases: PascalCase, e.g., `type ClassValue`
- Generic type parameters: single uppercase letter, e.g., `<T>`

**Python Classes:**
- ORM models: PascalCase matching table concept, e.g., `class Topic`, `class Subtopic`, `class Question`, `class AnswerOption`
- Settings class: PascalCase, e.g., `class Settings(BaseSettings)`

## Code Style

**Formatting (TypeScript/TSX):**
- No explicit Prettier config file present; Next.js default formatting inferred
- Trailing commas in multi-line function args and objects
- Double quotes for JSX props and string literals, e.g., `"Content-Type": "application/json"`
- Template literals for string interpolation, e.g., `` `${API_BASE_URL}${endpoint}` ``
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)

**Formatting (Python):**
- Standard Python indentation (4 spaces)
- Module-level docstrings using triple-quoted strings at the top of every file
- Class docstrings immediately after the class declaration line
- Method docstrings immediately after the `def` line

**Linting:**
- TypeScript: `next lint` (ESLint via Next.js config) — run with `npm run lint`
- Python: No linting config detected; `noqa: F401` used for intentional unused imports in `main.py`

## Import Organization

**TypeScript/TSX order:**
1. React and Next.js imports (e.g., `import * as React from "react"`, `import type { Metadata } from "next"`)
2. Third-party library imports (e.g., `import { Slot } from "@radix-ui/react-slot"`, `import { cva } from "class-variance-authority"`)
3. Internal path-aliased imports using `@/` prefix (e.g., `import { cn } from "@/lib/utils"`, `import { Button } from "@/components/ui/button"`)

**Python order:**
1. Standard library imports (e.g., `from contextlib import asynccontextmanager`, `import uuid`, `from datetime import datetime, timezone`)
2. Third-party imports (e.g., `from fastapi import FastAPI`, `from sqlalchemy import ...`, `from pydantic_settings import BaseSettings`)
3. Internal app imports (e.g., `from app.database import Base, engine`, `from app.config import settings`)

**Path Aliases (TypeScript):**
- `@/*` maps to project root `./*` — configured in `tsconfig.json`
- Used consistently for all internal imports: `@/lib/utils`, `@/components/ui/button`

## Error Handling

**TypeScript:**
- In `apiFetch`, non-2xx responses throw an `Error` with a descriptive message: `throw new Error(\`API error: ${response.status} ${response.statusText}\`)`
- No try/catch at the call site in current code — error propagation left to callers
- No global error boundary component detected yet

**Python:**
- Database session management uses try/finally in `get_db()` to guarantee session close
- FastAPI's default exception handling used for route errors (no custom exception handlers yet)
- `noqa: F401` suppresses the intentional unused-import warning for model registration side effects

## Comments

**TypeScript/TSX — Mandatory JSDoc pattern:**
Every exported function, interface, constant array, and component has a JSDoc block comment (`/** ... */`) above it explaining:
- What it is/does
- Its parameters (`@param`) and return type (`@returns`) for utility functions
- Template type parameters (`@template`) for generics
- Inline comments for non-obvious logic choices (`// Use Slot for polymorphic rendering`)
- Section separator comments in JSX using `{/* ===== Section Name ===== */}` style

Example from `api.ts`:
```typescript
/**
 * Generic fetch wrapper that handles JSON responses and errors.
 * @template T - The expected response type
 * @param endpoint - The API path (e.g., "/api/questions")
 * @param options - Optional fetch configuration
 * @returns Parsed JSON response of type T
 * @throws Error if the response status is not OK (2xx)
 */
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T>
```

**Python — Module + class + method docstrings:**
Every Python file has a module-level triple-quoted docstring. Every class and function has a docstring. Inline `#` comments explain individual assignments that aren't self-evident.

Example from `database.py`:
```python
# autocommit=False: transactions must be explicitly committed
# autoflush=False: prevents automatic flushing before queries for better control
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

**Rule:** Every significant code point — functions, classes, constants, non-obvious logic — must have a comment or docstring.

## Function Design

**TypeScript:**
- Functions are small and single-purpose (e.g., `apiFetch` wraps fetch; `cn` wraps clsx/twMerge; `checkHealth` calls `apiFetch`)
- Generics used to preserve type safety without overloading, e.g., `apiFetch<T>`
- `React.forwardRef` used for all UI primitive components to expose DOM refs
- Default parameters used over overloads, e.g., `asChild = false`

**Python:**
- Functions are small and single-purpose (e.g., `get_db` only manages session lifecycle; `health_check` only returns status dict)
- Generator pattern (`yield`) used in `get_db` for FastAPI dependency injection
- Async context manager (`@asynccontextmanager`) used for lifespan management

## Module Design

**TypeScript Exports:**
- Named exports for utilities and component sub-parts, e.g., `export { Button, buttonVariants }`
- Default exports for page and component modules, e.g., `export default function Dashboard()`
- No barrel `index.ts` files — direct path imports used throughout

**Python Exports:**
- `__all__` defined in `models/__init__.py` to control public API: `["Topic", "Subtopic", "Question", "AnswerOption"]`
- Module-level singleton instances exported by convention, e.g., `settings`, `engine`, `Base`, `SessionLocal`

## Component Patterns (React)

- `"use client"` directive required at top of interactive components (e.g., `Dashboard.tsx`)
- Server components (no directive) used for layout and static pages (e.g., `layout.tsx`, `page.tsx`)
- Props interfaces defined directly above the component that uses them
- Data arrays extracted as module-level constants rather than defined inside render
- CVA (class-variance-authority) used to define variant-based component styles, e.g., `buttonVariants`
- `displayName` set on all `forwardRef` components, e.g., `Button.displayName = "Button"`
- Tailwind class merging via `cn()` from `@/lib/utils` for all conditional className logic

---

*Convention analysis: 2026-03-20*
