"""
Auth router using Supabase Auth.
"""
from fastapi import APIRouter, HTTPException
from models import LoginRequest, Token
from database import get_supabase

router = APIRouter()


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest):
    """
    Authenticate using Supabase Auth.
    Returns a session token for protected API calls.
    """
    try:
        sb = get_supabase()
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Authentication service not configured: {e}. "
                "The frontend operates in demo mode with localStorage auth."
            )
        )

    try:
        response = sb.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password,
        })

        if not response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user = response.user
        session = response.session

        return Token(
            access_token=session.access_token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            role=user.user_metadata.get("role", "engineer"),
        )

    except Exception as e:
        if "Invalid login credentials" in str(e):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(status_code=500, detail=f"Authentication error: {e}")


@router.post("/logout")
def logout(token: str):
    """Sign out from Supabase Auth."""
    try:
        sb = get_supabase()
        sb.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception:
        return {"message": "Logged out"}
