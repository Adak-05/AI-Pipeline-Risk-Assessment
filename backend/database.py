from supabase import create_client, Client
from config import settings
from typing import Optional

_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    """Return a singleton Supabase service-role client."""
    global _supabase_client
    if _supabase_client is None:
        url = settings.supabase_url or settings.vite_supabase_url
        if not url or not settings.supabase_service_role_key:
            raise RuntimeError(
                "Supabase credentials not configured. "
                "Copy backend/.env.example to backend/.env and fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
            )
        _supabase_client = create_client(
            url,
            settings.supabase_service_role_key
        )
    return _supabase_client
