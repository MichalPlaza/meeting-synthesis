from fastapi import FastAPI
from .db.mongodb_utils import connect_to_mongo, close_mongo_connection
from .apis.v1.endpoints_auth import router as auth_router
from .apis.v1.endpoints_project import router as project_router
from .apis.v1.endpoints_meetings import router as meetings_router

app = FastAPI(title="Meeting Synthesis API")

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(project_router, prefix="/project", tags=["project"])
app.include_router(meetings_router, prefix="/meetings", tags=["meetings"])

