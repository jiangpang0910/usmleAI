# Testing Patterns

**Analysis Date:** 2026-03-20

## Test Framework

**Runner:**
- Not yet configured — no test framework detected in the codebase
- Frontend: no `jest.config.*`, `vitest.config.*`, or test script in `package.json`
- Backend: no `pytest.ini`, `conftest.py`, or `setup.cfg` detected
- No `*.test.*` or `*.spec.*` files exist anywhere in the project

**Assertion Library:**
- Not yet configured

**Run Commands:**
```bash
# No test commands configured yet
# Frontend lint only:
cd frontend && npm run lint    # ESLint via Next.js

# Recommended future setup — Frontend:
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom

# Recommended future setup — Backend:
pip install pytest pytest-asyncio httpx
```

## Test File Organization

**Current State:**
- No test files exist in the codebase
- No test directory structure established

**Recommended Conventions (based on project structure):**

Frontend — co-located with source files:
```
frontend/
├── components/
│   └── dashboard/
│       ├── Dashboard.tsx
│       └── Dashboard.test.tsx      # co-located unit test
├── lib/
│   ├── api.ts
│   └── api.test.ts                 # co-located unit test
```

Backend — separate `tests/` directory:
```
backend/
├── app/
│   └── ...
└── tests/
    ├── conftest.py                 # shared fixtures
    ├── test_main.py                # route/integration tests
    └── models/
        └── test_knowledge.py       # model unit tests
```

## Test Structure

**Suite Organization (recommended patterns matching project style):**

TypeScript/React — mirror JSDoc comment style:
```typescript
// Co-located with Dashboard.tsx
import { render, screen } from "@testing-library/react";
import Dashboard from "./Dashboard";

/**
 * Tests for Dashboard component.
 * Verifies rendering of quick-start actions and USMLE step cards.
 */
describe("Dashboard", () => {
  it("renders the app title", () => {
    render(<Dashboard />);
    expect(screen.getByText("usmleAI")).toBeInTheDocument();
  });

  it("renders all three quick-start action cards", () => {
    render(<Dashboard />);
    expect(screen.getByText("Pick a Topic")).toBeInTheDocument();
    expect(screen.getByText("Adaptive Session")).toBeInTheDocument();
    expect(screen.getByText("Exam Simulation")).toBeInTheDocument();
  });
});
```

Python — mirror module docstring style:
```python
"""
Tests for the FastAPI health check and core routes.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Health check endpoint returns healthy status."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "app": "usmleAI"}
```

## Mocking

**Framework (recommended):**
- TypeScript: `jest.fn()` / `jest.spyOn()` for function mocking, `msw` for API mocking
- Python: `pytest-mock` / `unittest.mock` for dependency injection mocking

**Key areas to mock (based on current codebase):**

TypeScript — `apiFetch` in `lib/api.ts`:
```typescript
// Mock the fetch API for unit tests of apiFetch
jest.mock("global", () => ({
  fetch: jest.fn(),
}));

// Or mock the whole api module when testing components
jest.mock("@/lib/api", () => ({
  checkHealth: jest.fn().mockResolvedValue({ status: "healthy", app: "usmleAI" }),
}));
```

Python — database session in `app/database.py`:
```python
# Override get_db dependency for route tests
from app.database import get_db

def override_get_db():
    """Provide a test database session."""
    # Use in-memory SQLite for tests
    ...

app.dependency_overrides[get_db] = override_get_db
```

**What to Mock:**
- External HTTP calls (the `fetch` function in `lib/api.ts`)
- Database sessions (the `get_db` dependency in FastAPI routes)
- Anthropic API client calls (once AI integration is added)
- `process.env` values for environment-specific tests

**What NOT to Mock:**
- Internal pure utility functions (`cn()` in `lib/utils.ts`, `apiFetch` itself when testing it)
- SQLAlchemy model definitions
- React component rendering (use `@testing-library/react` with real DOM)

## Fixtures and Factories

**Test Data (recommended pattern matching Python model style):**
```python
# backend/tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Topic

# Use in-memory SQLite for test isolation
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    """
    Provide a clean database session for each test.
    Rolls back all changes after each test for isolation.
    """
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)

@pytest.fixture
def sample_topic(db_session):
    """A minimal Topic fixture for tests that need a parent topic."""
    topic = Topic(name="Cardiology", discipline="clinical_science")
    db_session.add(topic)
    db_session.commit()
    return topic
```

**Location:**
- Python fixtures: `backend/tests/conftest.py` (pytest auto-discovery)
- TypeScript factories: `frontend/lib/test-utils.ts` or inline in test files

## Coverage

**Requirements:** None enforced (no coverage config detected)

**Recommended configuration for future setup:**

```bash
# Backend — pytest with coverage
pip install pytest-cov
pytest --cov=app --cov-report=html backend/tests/

# Frontend — jest coverage
npx jest --coverage
```

**Priority coverage targets (based on current code):**
- `frontend/lib/api.ts` — `apiFetch` error handling branch (non-2xx response)
- `backend/app/main.py` — health check endpoint
- `backend/app/database.py` — `get_db` session cleanup in finally block
- `backend/app/models/knowledge.py` — model relationships and cascade deletes

## Test Types

**Unit Tests:**
- Scope: Individual functions and components in isolation
- Frontend targets: `cn()` utility, `apiFetch()` error handling, `Button` variants, `Card` sub-components
- Backend targets: `get_db()` session lifecycle, `Settings` config loading, individual model field constraints

**Integration Tests:**
- Scope: Full request/response cycle for FastAPI routes
- Backend targets: `GET /` health check; future CRUD endpoints for Topics, Questions
- Use `fastapi.testclient.TestClient` for synchronous integration testing

**E2E Tests:**
- Not configured; Playwright or Cypress would be appropriate given Next.js frontend
- Not required until UI flows are complete

## Common Patterns

**Async Testing (Python):**
```python
# For async FastAPI routes, use TestClient (synchronous wrapper)
from fastapi.testclient import TestClient
from app.main import app

def test_health_check():
    """TestClient handles async routes synchronously."""
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
```

**Async Testing (TypeScript):**
```typescript
// For apiFetch which is async
it("throws on non-OK response", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 404,
    statusText: "Not Found",
  });

  await expect(apiFetch("/missing")).rejects.toThrow("API error: 404 Not Found");
});
```

**Error Testing (Python):**
```python
def test_missing_route_returns_404():
    """FastAPI returns 404 for undefined routes."""
    client = TestClient(app)
    response = client.get("/does-not-exist")
    assert response.status_code == 404
```

---

*Testing analysis: 2026-03-20*
