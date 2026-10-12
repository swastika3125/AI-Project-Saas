from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.repos import router as repos_router
from app.api.v1.pull_requests import router as pr_router
from app.api.v1.scans import router as scans_router
from app.api.v1.impact import router as impact_router
from app.api.v1.policies import router as policies_router
from app.api.v1.feedback import router as feedback_router
from app.api.v1.demo import router as demo_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(webhooks_router)
api_router.include_router(repos_router)
api_router.include_router(pr_router)
api_router.include_router(scans_router)
api_router.include_router(impact_router)
api_router.include_router(policies_router)
api_router.include_router(feedback_router)
api_router.include_router(demo_router)
