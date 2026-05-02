import json
import os
import urllib.request
import urllib.error
from urllib.parse import quote_plus
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from .middleware import AuthMiddleware
from .sessions import create_session

FIREBASE_URL = os.environ.get(
    "FIREBASE_URL",
    "https://semestralka-9a2bd-default-rtdb.europe-west1.firebasedatabase.app"
)
FIREBASE_AUTH_TOKEN = os.environ.get("FIREBASE_AUTH_TOKEN", "")

if FIREBASE_URL.endswith("/"):
    FIREBASE_URL = FIREBASE_URL[:-1]


def build_firebase_url(path: str) -> str:
    trimmed = path.lstrip("/")
    url = f"{FIREBASE_URL}/{trimmed}.json"
    if FIREBASE_AUTH_TOKEN:
        url += f"?auth={quote_plus(FIREBASE_AUTH_TOKEN)}"
    return url


def firebase_request(path: str, method: str = "GET", data=None):
    url = build_firebase_url(path)
    body = None
    headers = {"Content-Type": "application/json"} if data is not None else {}
    if data is not None:
        body = json.dumps(data).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status == 204:
                return None
            return json.load(response)
    except urllib.error.HTTPError as http_err:
        if http_err.code == 404:
            return None
        raise
    except urllib.error.URLError as url_err:
        raise RuntimeError(f"Firebase request failed: {url_err}") from url_err


def parse_users(data):
    users = {}
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and "username" in item and "password" in item:
                users[item["username"]] = item["password"]
    elif isinstance(data, dict):
        for item in data.values():
            if isinstance(item, dict) and "username" in item and "password" in item:
                users[item["username"]] = item["password"]
    return users


def parse_pois(data):
    if data is None:
        return []
    if isinstance(data, list):
        return [dict(poi, id=index) for index, poi in enumerate(data) if isinstance(poi, dict)]
    if isinstance(data, dict):
        result = []
        for key, poi in data.items():
            if isinstance(poi, dict):
                result.append({**poi, "id": key})
        return result
    return []


app = FastAPI()
app.add_middleware(AuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- LOGIN ----------------
@app.post("/login")
def login(data: dict):
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return JSONResponse(status_code=400, content={"error": "username and password are required"})

    raw_users = firebase_request("users", method="GET")
    users = parse_users(raw_users)
    if users.get(username) == password:
        token = create_session(username)
        return {"token": token}

    return JSONResponse(status_code=401, content={"error": "invalid credentials"})


# ---------------- DTO ----------------
class POISchema(BaseModel):
    name: str
    lat: float
    lon: float
    affiliation: str


# ---------------- CREATE ----------------
@app.post("/api/pois")
def create_poi(poi: POISchema):
    created = firebase_request("pois", method="POST", data=poi.dict())
    return {"status": "created", "id": created.get("name") if isinstance(created, dict) else None}


# ---------------- READ ----------------
@app.get("/api/pois")
def get_pois():
    data = firebase_request("pois", method="GET")
    return parse_pois(data)


# ---------------- UPDATE ----------------
@app.put("/api/pois/{poi_id}")
def update_poi(poi_id: str, poi: POISchema):
    firebase_request(f"pois/{poi_id}", method="PUT", data=poi.dict())
    return {"status": "updated"}


# ---------------- DELETE ----------------
@app.delete("/api/pois/{poi_id}")
def delete_poi(poi_id: str):
    firebase_request(f"pois/{poi_id}", method="DELETE")
    return {"status": "deleted"}


icons_dir = Path(__file__).resolve().parent / "icons"
app.mount(
    "/icons",
    StaticFiles(directory=str(icons_dir)),
    name="icons"
)

frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
app.mount(
    "/",
    StaticFiles(directory=str(frontend_dir), html=True),
    name="frontend"
)
