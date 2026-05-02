from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from Semestrálka.backend.auth import ADMIN_TOKEN

class AuthMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        # allow login without token
        if request.url.path == "/login":
            return await call_next(request)

        # allow docs
        if request.url.path.startswith("/docs"):
            return await call_next(request)

        token = request.headers.get("x-token")

        if token != ADMIN_TOKEN:
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized"}
            )

        return await call_next(request)