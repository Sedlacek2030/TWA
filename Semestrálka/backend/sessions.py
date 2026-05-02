import secrets
import time
from typing import Optional

SESSION_TTL = 60 * 60 * 24  # 24 hours
_active_sessions: dict[str, dict] = {}


def create_session(username: str) -> str:
    token = secrets.token_urlsafe(24)
    _active_sessions[token] = {
        "username": username,
        "created": time.time(),
    }
    return token


def validate_session(token: str) -> Optional[str]:
    if not token:
        return None

    session = _active_sessions.get(token)
    if not session:
        return None

    if time.time() - session["created"] > SESSION_TTL:
        _active_sessions.pop(token, None)
        return None

    return session["username"]


def delete_session(token: str) -> None:
    _active_sessions.pop(token, None)


def list_sessions() -> dict[str, dict]:
    return _active_sessions.copy()
