from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from .sessions import validate_session

class AuthMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        # allow preflight requests for CORS
        if request.method == "OPTIONS":
            return await call_next(request)

        # only protect API endpoints
        if not request.url.path.startswith("/api"):
            return await call_next(request)

        token = request.headers.get("x-token")
        username = validate_session(token)
        if not username:
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized"}
            )

        request.state.user = username
        return await call_next(request)