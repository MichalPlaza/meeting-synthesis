from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .apis.v1.endpoints_auth import router as auth_router
from .apis.v1.endpoints_meetings import router as meetings_router
from .apis.v1.endpoints_project import router as project_router
from .apis.v1.endpoints_users import router as users_router
from .db.mongodb_utils import close_mongo_connection, connect_to_mongo
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Meeting Synthesis API")

origins = [
    "http://localhost:5173",  
    "http://127.0.0.1:5173", 
    "http://localhost:3000",  
    "http://127.0.0.1:3000"
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


@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(project_router, prefix="/project", tags=["project"])
app.include_router(meetings_router, prefix="/meetings", tags=["meetings"])
app.include_router(users_router, prefix="/users", tags=["users"])