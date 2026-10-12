from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.api.v1.router import api_router
from app.api.v1.demo import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite/Postgres tables on startup
    await init_db()
    # Seed realistic demo data if fresh database
    async with AsyncSessionLocal() as session:
        try:
            await seed_demo_data(session)
        except Exception as e:
            print(f"Demo auto-seed note: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered Pull Request Risk Intelligence SaaS: Analyzes PRs for security risks, change impact, and recommended tests before merge.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "PR Risk Intelligence API",
        "version": "1.0.0"
    }


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "docs": "/docs",
        "status": "online",
        "api_version": "v1"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
