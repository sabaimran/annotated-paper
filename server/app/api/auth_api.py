import logging
import os
import secrets
from typing import Optional

from app.auth.dependencies import get_current_user, get_required_user
from app.auth.google import google_auth_client
from app.auth.utils import clear_session_cookie, set_session_cookie
from app.database.crud.user_crud import user as user_crud
from app.database.database import get_db
from app.schemas.user import CurrentUser, UserCreateWithProvider
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

auth_router = APIRouter()

client_domain = os.getenv("CLIENT_DOMAIN", "http://localhost:3000")
api_domain = os.getenv("API_DOMAIN", "http://localhost:8000")


class AuthResponse(BaseModel):
    """Response model for auth routes."""

    success: bool
    message: str
    user: Optional[CurrentUser] = None


@auth_router.get("/me", response_model=AuthResponse)
async def get_me(current_user: Optional[CurrentUser] = Depends(get_current_user)):
    """Get the current user."""
    if not current_user:
        return AuthResponse(success=False, message="Not authenticated")
    return AuthResponse(success=True, message="User found", user=current_user)


@auth_router.get("/logout")
async def logout(
    response: Response,
    current_user: CurrentUser = Depends(get_required_user),
    db: Session = Depends(get_db),
    all_devices: bool = Query(False),
):
    """Logout the current user."""
    if all_devices and current_user:
        # Revoke all user sessions
        user_crud.revoke_all_sessions(db=db, user_id=current_user.id)
    else:
        # Get token from cookie (handled in auth dependency)
        token = response.headers.get("Set-Cookie")
        if token:
            # Revoke this specific session
            user_crud.revoke_session(db=db, token=token)

    # Clear the session cookie
    clear_session_cookie(response)

    return AuthResponse(success=True, message="Logged out successfully")


@auth_router.get("/google/login")
async def google_login():
    """Start Google OAuth flow."""
    # Generate a random state for security
    state = secrets.token_urlsafe(32)

    # Get the authorization URL
    auth_url = google_auth_client.get_auth_url(state=state)

    return {"auth_url": auth_url}


@auth_router.get("/google/callback", response_class=RedirectResponse)
async def google_callback(
    request: Request,
    code: str = Query(...),
    db: Session = Depends(get_db),
):
    """Handle Google OAuth callback."""
    try:
        # Exchange the code for a token
        token_data = google_auth_client.get_token(code)
        if not token_data or "access_token" not in token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token",
            )

        # Get user info from Google
        user_info = google_auth_client.get_user_info(token_data["access_token"])
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info",
            )

        # Create or update user
        user_data = UserCreateWithProvider(
            email=user_info.email,
            name=user_info.name,
            picture=user_info.picture,
            locale=user_info.locale,
            auth_provider="google",
            provider_user_id=user_info.id,
        )

        db_user = user_crud.upsert_with_provider(db=db, obj_in=user_data)

        # Create a new session
        user_agent = request.headers.get("user-agent")
        client_host = request.client.host if request.client else None

        session = user_crud.create_session(
            db=db,
            user_id=db_user.id,
            user_agent=user_agent,
            ip_address=client_host,
        )

        # Create redirect response
        redirect_url = f"{client_domain}/auth/callback?success=true"
        redirect_response = RedirectResponse(
            url=redirect_url, status_code=status.HTTP_302_FOUND
        )

        # Set the session cookie on the redirect response
        set_session_cookie(
            redirect_response, token=session.token, expires_at=session.expires_at
        )

        # Set a header that the frontend can use to detect successful auth
        redirect_response.headers["X-Auth-Success"] = "true"

        return redirect_response
    except Exception as e:
        logger.error(f"Error during Google OAuth callback: {e}")
        # Redirect to frontend with failure status
        redirect_url = f"{client_domain}/auth/callback?success=false"
        redirect_response = RedirectResponse(
            url=redirect_url, status_code=status.HTTP_302_FOUND
        )
        return redirect_response
