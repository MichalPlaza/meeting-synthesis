# Meeting Synthesis - Agent Instructions

## Project overview

Meeting Synthesis is an AI-powered meeting assistant that transcribes audio files and extracts structured insights using ML models. The system runs locally for privacy or connects to OpenAI for cloud processing.

**Architecture**: Microservices (FastAPI backend, React frontend, Celery workers, MongoDB, Redis, Ollama, WebSocket notifications)

**Key features**:

- Audio upload and transcription (Whisper)
- AI analysis: summaries, action items, decisions, key topics, mentioned dates
- Project and meeting management with multi-user support
- Real-time processing status via WebSocket
- Local LLM support (Ollama) or OpenAI integration

**Tech stack**:

- Backend: Python 3.11+, FastAPI, Motor (MongoDB), Celery, Redis, Whisper, Ollama
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router
- DevOps: Docker Compose, Poetry (backend), PNPM (frontend)
- Testing: Pytest (backend), Vitest (frontend)

**Project structure**:

```
meeting-syntesis/
├── backend/              # FastAPI app, Celery workers, tests
│   ├── app/
│   │   ├── apis/v1/     # REST endpoints
│   │   ├── crud/        # Database operations
│   │   ├── services/    # Business logic
│   │   ├── models/      # MongoDB models
│   │   ├── schemas/     # Pydantic schemas
│   │   └── worker/      # Celery tasks
│   └── tests/           # Pytest unit & integration tests
├── frontend/            # React SPA
│   └── src/
│       ├── pages/       # Route components
│       ├── components/  # Reusable UI components
│       └── types/       # TypeScript types
├── notification_service/ # WebSocket server
├── mongo-init/          # Database seed data
└── docker-compose.yml   # Multi-container orchestration
```

---

## Dev environment tips

### Quick start

- Clone repo: `git clone https://github.com/mplazax/meeting-syntesis.git && cd meeting-syntesis`
- Copy env file: `cp .env.example .env` and fill in `SECRET_KEY` and optional `OPENAI_API_KEY`
- Start everything: `docker-compose up --build -d`
- Check status: `docker-compose ps`
- View logs: `docker-compose logs -f backend` or `docker-compose logs -f frontend`

### Access points

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs (Swagger UI)
- WebSocket: ws://localhost:8001

### Working with services

- Stop all: `docker-compose down`
- Reset database: `docker-compose down -v && docker-compose up --build -d`
- Restart one service: `docker-compose restart backend`
- Exec into container: `docker-compose exec backend bash`

### Local development (without Docker)

**Backend**:

```bash
cd backend
poetry install
docker-compose up -d mongo redis  # Start dependencies only
PYTHON_ENV=development poetry run uvicorn app.main:app --reload --port 8000
# In separate terminal:
poetry run celery -A app.worker.celery_app worker --loglevel=info
```

**Frontend**:

```bash
cd frontend
pnpm install
pnpm dev  # Runs on http://localhost:5173
```

### Useful commands

- Jump to backend: `cd backend`
- Jump to frontend: `cd frontend`
- Check backend deps: `cd backend && poetry show`
- Check frontend deps: `cd frontend && pnpm list`
- Add backend package: `cd backend && poetry add <package>`
- Add frontend package: `cd frontend && pnpm add <package>`

---

## Testing instructions

### Test-Driven Development (TDD)

This project follows TDD. Write tests before implementation:

1. **Red**: Write a failing test that defines expected behavior
2. **Green**: Write minimal code to pass the test
3. **Refactor**: Improve code while keeping tests green

### Backend testing

**Run all tests**:

```bash
docker-compose exec backend pytest
```

**Run with coverage**:

```bash
docker-compose exec backend pytest --cov=app tests/
docker-compose exec backend pytest --cov=app --cov-report=html  # HTML report
```

**Run specific test file**:

```bash
docker-compose exec backend pytest tests/unit/services/test_meeting_service.py
```

**Run specific test**:

```bash
docker-compose exec backend pytest tests/unit/services/test_meeting_service.py::test_create_meeting
```

**Run with verbose output**:

```bash
docker-compose exec backend pytest -v
```

**Stop on first failure**:

```bash
docker-compose exec backend pytest -x
```

**Watch mode** (local dev):

```bash
cd backend
poetry run pytest-watch
```

**Test structure**:

```
backend/tests/
├── unit/
│   ├── apis/v1/          # Endpoint tests
│   ├── crud/             # Database operation tests
│   ├── services/         # Business logic tests
│   └── schemas/          # Validation tests
├── integration/          # Multi-component tests
└── conftest.py           # Shared fixtures
```

### Frontend testing

**Run all tests**:

```bash
docker-compose exec frontend pnpm test
```

**Watch mode**:

```bash
docker-compose exec frontend pnpm test:watch
```

**Coverage**:

```bash
docker-compose exec frontend pnpm test:coverage
```

**Run specific test**:

```bash
docker-compose exec frontend pnpm vitest run -t "MeetingCard"
```

### Linting and type checking

**Backend**:

```bash
docker-compose exec backend poetry run ruff check .        # Lint
docker-compose exec backend poetry run ruff format .       # Format
docker-compose exec backend poetry run mypy app/           # Type check
```

**Frontend**:

```bash
docker-compose exec frontend pnpm lint           # ESLint
docker-compose exec frontend pnpm type-check     # TypeScript
```

### Coverage goals

- Critical paths (auth, data integrity): 100%
- Business logic (services, CRUD): >90%
- API endpoints: >85%
- Utilities: >80%
- UI components: >70%

### Before committing

Run all checks:

```bash
# Backend
docker-compose exec backend pytest
docker-compose exec backend poetry run ruff check .
docker-compose exec backend poetry run mypy app/

# Frontend
docker-compose exec frontend pnpm test
docker-compose exec frontend pnpm lint
docker-compose exec frontend pnpm type-check
```

---

## Code standards

### Python (Backend)

**Style**: PEP 8, Google-style docstrings, type hints everywhere, 88 char line length

**Example**:

```python
from typing import Optional
from app.schemas.meeting_schema import MeetingCreate

async def create_meeting(
    meeting_data: MeetingCreate,
    user_id: str
) -> dict:
    """Create a new meeting.

    Args:
        meeting_data: Meeting creation data
        user_id: ID of the user creating the meeting

    Returns:
        Created meeting document

    Raises:
        ValueError: If project_id is invalid
    """
    # Implementation
    pass
```

**Naming**:

- Files: `snake_case.py`
- Classes: `PascalCase`
- Functions/variables: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- Private: `_leading_underscore`

### TypeScript/React (Frontend)

**Style**: ESLint + Prettier, functional components, strict TypeScript, props interfaces

**Example**:

```typescript
interface MeetingCardProps {
  meeting: Meeting;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  onEdit,
  onDelete,
}) => {
  const handleEdit = useCallback(() => {
    onEdit(meeting.id);
  }, [meeting.id, onEdit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meeting.title}</CardTitle>
      </CardHeader>
    </Card>
  );
};
```

**Naming**:

- Component files: `PascalCase.tsx`
- Utility files: `camelCase.ts`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Git commits

Use Conventional Commits: `<type>(<scope>): <subject>`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:

```bash
feat(meetings): add drag-and-drop audio upload
fix(auth): resolve JWT token expiration bug
test(api): add unit tests for meeting CRUD operations
docs(readme): update Docker setup instructions
refactor(ui): extract MeetingCard component
```

### Branching

Use GitHub Flow:

- `main` - production-ready
- `feature/<name>` - new features
- `fix/<name>` - bug fixes
- `test/<name>` - test additions
- `docs/<name>` - documentation
- `refactor/<name>` - code refactoring

**Examples**:

```bash
feature/speaker-diarization
fix/websocket-reconnection
test/meeting-service-coverage
docs/api-endpoints
refactor/cleanup-crud-layer
```

---

## PR instructions

### Before opening PR

1. **Write tests first** (TDD approach)
2. **Implement feature** to pass tests
3. **Run all tests**: Backend and frontend must pass
4. **Check linting**: `ruff check` and `pnpm lint` must pass
5. **Check types**: `mypy` and `pnpm type-check` must pass
6. **Update docs** if needed
7. **Commit with conventional format**

### PR checklist

- [ ] Tests written before implementation (TDD)
- [ ] All tests passing (`pytest` and `pnpm test`)
- [ ] Linting passing (Ruff, ESLint)
- [ ] Type checking passing (Mypy, TypeScript)
- [ ] Test coverage maintained or improved
- [ ] Documentation updated
- [ ] Commit messages follow Conventional Commits
- [ ] No `.env` or sensitive files committed
- [ ] Branch is up to date with `main`

### PR title format

```
<type>(<scope>): <description>

Examples:
feat(meetings): add speaker diarization support
fix(auth): resolve token refresh race condition
test(crud): increase meeting service coverage to 95%
docs(contributing): add TDD workflow examples
```

### PR description template

```markdown
## Description

Brief description of what this PR does.

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- Describe tests added/modified
- List manual testing steps if applicable

## Checklist

- [ ] Tests pass locally
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Test coverage maintained/improved
```

### Review process

1. **Automated checks**: CI runs tests and linting
2. **Code review**: Maintainer reviews code
3. **Feedback**: Address review comments
4. **Approval**: PR merged after approval
5. **Cleanup**: Delete feature branch

---

## Common tasks

### Add new API endpoint

1. **Write test first** in `backend/tests/unit/apis/v1/test_<resource>_endpoints.py`:

```python
@pytest.mark.asyncio
async def test_create_resource(client: AsyncClient, auth_headers: dict):
    response = await client.post("/resource/", headers=auth_headers, json={...})
    assert response.status_code == 201
```

2. **Run test** (should fail): `docker-compose exec backend pytest tests/unit/apis/v1/test_<resource>_endpoints.py`

3. **Create schema** in `backend/app/schemas/<resource>_schema.py`:

```python
class ResourceCreate(BaseModel):
    name: str
    description: Optional[str] = None
```

4. **Create CRUD** in `backend/app/crud/crud_<resource>.py`:

```python
async def create_resource(resource_data: ResourceCreate) -> dict:
    # Implementation
    pass
```

5. **Create endpoint** in `backend/app/apis/v1/endpoints_<resource>.py`:

```python
@router.post("/", status_code=201)
async def create_resource(resource: ResourceCreate, user=Depends(get_current_user)):
    return await crud_resource.create_resource(resource)
```

6. **Run test again** (should pass): `docker-compose exec backend pytest`

7. **Test manually**: Check http://localhost:8000/docs

### Add new React component

1. **Write test first** in `frontend/src/components/<Component>.test.tsx`:

```typescript
describe("ResourceCard", () => {
  it("renders resource name", () => {
    render(<ResourceCard resource={mockResource} />);
    expect(screen.getByText("Resource Name")).toBeInTheDocument();
  });
});
```

2. **Run test** (should fail): `docker-compose exec frontend pnpm test`

3. **Create component** in `frontend/src/components/<Component>.tsx`:

```typescript
interface ResourceCardProps {
  resource: Resource;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  return <Card>{resource.name}</Card>;
};
```

4. **Run test again** (should pass): `docker-compose exec frontend pnpm test`

### Add Celery task

1. **Write test** in `backend/tests/unit/worker/test_tasks.py`
2. **Define task** in `backend/app/worker/tasks.py`:

```python
@celery_app.task(name="process_resource")
def process_resource(resource_id: str) -> dict:
    # Implementation
    return {"status": "completed"}
```

3. **Trigger from endpoint**:

```python
from app.worker.tasks import process_resource

@router.post("/{resource_id}/process")
async def trigger_processing(resource_id: str):
    task = process_resource.delay(resource_id)
    return {"task_id": task.id}
```

### Debug issues

**Check logs**:

```bash
docker-compose logs -f backend
docker-compose logs -f celery_worker
docker-compose logs -f frontend
```

**Exec into container**:

```bash
docker-compose exec backend bash
docker-compose exec frontend sh
```

**Check database**:

```bash
docker-compose exec mongo mongosh meeting_synthesis_db
# In mongo shell:
db.meetings.find()
db.users.find()
```

**Check Redis**:

```bash
docker-compose exec redis redis-cli
# In redis-cli:
KEYS *
GET <key>
```

**Restart service**:

```bash
docker-compose restart backend
docker-compose restart celery_worker
```

---

## Database operations

### Seed data

Database auto-seeds on first run with:

- Test user: `test@example.com` / `testpassword`
- 2 sample projects
- 3 sample meetings

### Reset database

```bash
docker-compose down -v  # Remove volumes
docker-compose up --build -d  # Restart with fresh data
```

### Manual seed (local MongoDB)

```bash
mongoimport --db meeting_synthesis_db --collection users --file ./mongo-init/meeting_synthesis_db.users.json --jsonArray
mongoimport --db meeting_synthesis_db --collection projects --file ./mongo-init/meeting_synthesis_db.projects.json --jsonArray
mongoimport --db meeting_synthesis_db --collection meetings --file ./mongo-init/meeting_synthesis_db.meetings.json --jsonArray
```

### Access MongoDB

```bash
docker-compose exec mongo mongosh meeting_synthesis_db
```

**Useful queries**:

```javascript
// List all collections
show collections

// Find all meetings
db.meetings.find().pretty()

// Find meetings by project
db.meetings.find({ project_id: "project_id_here" })

// Count documents
db.meetings.countDocuments()

// Delete all meetings
db.meetings.deleteMany({})
```

---

## Deployment

### Production build

```bash
# Set production env
export PYTHON_ENV=production

# Build and start
docker-compose -f docker-compose.yml build
docker-compose up -d
```

### Environment variables (production)

```env
PYTHON_ENV=production
SECRET_KEY=<strong-random-secret-min-32-chars>
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
MONGO_DETAILS=mongodb://mongo:27017/meeting_synthesis_db
OPENAI_API_KEY=<your-key-if-using-openai>
VITE_BACKEND_API_BASE_URL=https://api.yourdomain.com
```

### Health checks

```bash
# Check all services
docker-compose ps

# Check API health
curl http://localhost:8000/docs

# Check logs
docker-compose logs -f

# Resource usage
docker stats
```

### Backup database

```bash
# Backup
docker-compose exec mongo mongodump --db meeting_synthesis_db --out /data/backup

# Restore
docker-compose exec mongo mongorestore --db meeting_synthesis_db /data/backup/meeting_synthesis_db
```

---

## Troubleshooting

### Backend won't start

- Check logs: `docker-compose logs backend`
- Verify MongoDB is running: `docker-compose ps mongo`
- Check env vars: `docker-compose exec backend env | grep MONGO`
- Restart: `docker-compose restart backend`

### Frontend build fails

- Check Node version: `docker-compose exec frontend node --version` (should be 18+)
- Clear cache: `docker-compose exec frontend rm -rf node_modules && pnpm install`
- Check env vars: Ensure `VITE_BACKEND_API_BASE_URL` is set

### Tests failing

- Run single test to isolate: `pytest tests/path/to/test.py::test_name`
- Check fixtures in `conftest.py`
- Verify test database is clean
- Check for async issues: Ensure `@pytest.mark.asyncio` is present

### Celery tasks not running

- Check worker logs: `docker-compose logs celery_worker`
- Verify Redis: `docker-compose exec redis redis-cli ping` (should return PONG)
- Check task registration: `docker-compose exec celery_worker celery -A app.worker.celery_app inspect registered`
- Restart worker: `docker-compose restart celery_worker`

### WebSocket not connecting

- Check notification service: `docker-compose logs notification_service`
- Verify Redis pub/sub: `docker-compose exec redis redis-cli`
- Check CORS settings in backend
- Test connection: `wscat -c ws://localhost:8001/ws/<user_id>`

---

## Project conventions

### File organization

**Backend**:

- Endpoints: `backend/app/apis/v1/endpoints_<resource>.py`
- CRUD: `backend/app/crud/crud_<resource>.py`
- Services: `backend/app/services/<resource>_service.py`
- Models: `backend/app/models/<resource>.py`
- Schemas: `backend/app/schemas/<resource>_schema.py`
- Tests: `backend/tests/unit/<layer>/test_<resource>.py`

**Frontend**:

- Pages: `frontend/src/pages/<PageName>Page.tsx`
- Components: `frontend/src/components/<ComponentName>.tsx`
- Types: `frontend/src/types/<resource>.ts`
- Tests: `frontend/src/components/<ComponentName>.test.tsx`

### Import order

**Python**:

1. Standard library
2. Third-party packages
3. Local imports

```python
import os
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.crud import crud_meetings
from app.schemas.meeting_schema import MeetingCreate
```

**TypeScript**:

1. React imports
2. Third-party packages
3. Local imports
4. Styles

```typescript
import React, { useState, useCallback } from "react";

import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Meeting } from "@/types/meeting";
import { useMeetings } from "@/hooks/useMeetings";
```

---

## Resources

### Documentation

- FastAPI docs: https://fastapi.tiangolo.com/
- React docs: https://react.dev/
- shadcn/ui: https://ui.shadcn.com/
- Celery docs: https://docs.celeryq.dev/
- MongoDB docs: https://www.mongodb.com/docs/

### Project links

- Repository: https://github.com/mplazax/meeting-syntesis
- Issues: https://github.com/mplazax/meeting-syntesis/issues
- API Docs (local): http://localhost:8000/docs

### Contact

- Maintainer: Michał Plaza ([@mplazax](https://github.com/mplazax))
- Email: michalplaza9@gmail.com

---

## Quick reference

### Most used commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f backend

# Run backend tests
docker-compose exec backend pytest

# Run frontend tests
docker-compose exec frontend pnpm test

# Lint backend
docker-compose exec backend poetry run ruff check .

# Lint frontend
docker-compose exec frontend pnpm lint

# Reset database
docker-compose down -v && docker-compose up -d

# Exec into backend
docker-compose exec backend bash

# Check API docs
open http://localhost:8000/docs
```

### Port reference

- 3000: Frontend (React)
- 8000: Backend API (FastAPI)
- 8001: Notification Service (WebSocket)
- 27017: MongoDB
- 6379: Redis
- 11434: Ollama

### Test data

- Email: `michal@example.com`
- Password: `password`
