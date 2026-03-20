# usmleAI

AI-powered USMLE question generator and teaching platform. Practice every question format across Steps 1, 2 CK, and 3 with Claude-powered explanations and Socratic teaching.

## Features

- **All USMLE question formats** — Single best answer, sequential item sets, drag-and-drop, abstract/research, and free-response
- **AI teaching modes** — Toggle between detailed explanations and Socratic dialogue
- **Study modes** — Topic-based quizzes, adaptive sessions (targets weak areas), and timed exam simulations
- **Knowledge bank** — 16 medical disciplines seeded across all 3 USMLE Steps
- **Progress tracking** — Score history, flagging, and end-of-session review

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend | Python FastAPI |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| AI | OpenRouter (Claude, Gemini, etc.) |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- Docker & Docker Compose

### Setup

```bash
# Clone the repo
git clone https://github.com/jiangpang0910/usmleAI.git
cd usmleAI

# Start PostgreSQL and Redis
docker compose up -d

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY

# Seed the knowledge bank
python -c "from app.seed.loader import seed_database; seed_database()"

# Start the backend
uvicorn app.main:app --reload --port 8000
```

```bash
# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Environment Variables

Create `backend/.env` from `backend/.env.example`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENROUTER_API_KEY` | Your OpenRouter API key ([get one here](https://openrouter.ai/keys)) |
| `OPENROUTER_MODEL` | AI model for teaching (default: `anthropic/claude-sonnet-4`) |

## Project Structure

```
usmleAI/
├── frontend/          # Next.js 14 app
│   ├── app/           # App router pages
│   ├── components/    # React components (quiz, dashboard, ui)
│   └── lib/           # API client, types, utilities
├── backend/           # FastAPI server
│   ├── app/
│   │   ├── models/    # SQLAlchemy ORM models
│   │   ├── routers/   # API endpoints (topics, questions, claude)
│   │   ├── schemas/   # Pydantic request/response schemas
│   │   ├── seed/      # Knowledge bank seed data (JSON)
│   │   └── cache.py   # Redis caching utility
│   └── requirements.txt
└── docker-compose.yml # PostgreSQL + Redis
```

## API Docs

With the backend running, visit http://localhost:8000/docs for interactive Swagger UI.

## License

MIT
