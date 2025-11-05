import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .apis.v1 import (
    endpoints_auth,
    endpoints_meetings,
    endpoints_project,
    endpoints_users,
    endpoints_knowledge_base,
    endpoints_comments,
    endpoints_admin
)
from .db.mongodb_utils import close_mongo_connection, connect_to_mongo
from .core.logging_config import setup_logging

PYTHON_ENV = os.getenv("PYTHON_ENV", "production")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    await connect_to_mongo()
    setup_logging()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(title="Meeting Synthesis API", lifespan=lifespan)

if PYTHON_ENV == "development":
    origins = ["*"]
else:
    allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
    origins = [
        origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/media", StaticFiles(directory="uploads"), name="media")


app.include_router(endpoints_auth.router, prefix="/auth", tags=["auth"])
app.include_router(endpoints_project.router, prefix="/project", tags=["project"])
app.include_router(endpoints_meetings.admin_router, prefix="/meetings", tags=["meetings-admin"])
app.include_router(endpoints_meetings.router, prefix="/meetings", tags=["meetings"])
app.include_router(endpoints_users.router, prefix="/users", tags=["users"])
app.include_router(endpoints_knowledge_base.router, prefix="/api/v1", tags=["knowledge-base"])
app.include_router(endpoints_comments.router, prefix="/comments", tags=["comments"])
app.include_router(endpoints_admin.router, prefix="/admin", tags=["admin"])
