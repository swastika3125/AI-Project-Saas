from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.get("/github/url")
def get_github_auth_url():
    """Returns the GitHub OAuth login URL."""
    if not settings.GITHUB_CLIENT_ID:
        return {
            "url": "http://localhost:3000/dashboard?demo=true",
            "message": "Demo mode: GitHub OAuth not configured, direct login enabled."
        }
    redirect_uri = "http://localhost:3000/auth/callback"
    url = f"https://github.com/login/oauth/authorize?client_id={settings.GITHUB_CLIENT_ID}&scope=repo,read:org&redirect_uri={redirect_uri}"
    return {"url": url}


@router.post("/demo-login", response_model=AuthTokenResponse)
def demo_login():
    """Generates an instant session token for local/demo access."""
    user_payload = {
        "sub": "demo-user-1",
        "username": "alex-dev",
        "email": "alex@repomind.security",
        "avatar_url": "https://avatars.githubusercontent.com/u/583231?v=4"
    }
    token = create_access_token(user_payload)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_payload
    }
