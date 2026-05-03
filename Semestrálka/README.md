# Semestrálka Mission Briefing

This is a browser-based Mission Briefing app with a FastAPI backend and a Leaflet map frontend.
The app stores login users and POIs in Firebase and serves the frontend from the backend.

## Contents

- `backend/BEmain.py` - FastAPI app, login endpoint, POI CRUD API, Firebase proxy, static file serving
- `backend/middleware.py` - authentication middleware for `/api/*`
- `backend/sessions.py` - ephemeral session token store and validation
- `backend/icons/` - mission marker icons served by the backend
- `frontend/index.html` - main UI, login form, POI form, map container
- `frontend/app.js` - browser logic for login, POI listing, map rendering, add/edit/delete operations

## Requirements

- Python 3.11+ (or compatible Python 3)
- Install dependencies:
  ```bash
  pip install fastapi uvicorn
  ```
- Browser with internet access to load Leaflet from CDN

## Environment

Set these environment variables for the backend:

- `FIREBASE_URL` - Firebase Realtime Database base URL
- `FIREBASE_AUTH_TOKEN` - optional Firebase REST auth token if needed

## Firebase data shape

The backend expects Firebase data under these top-level paths:

- `users` - login credentials as objects with `username` and `password`
- `pois` - POI objects with `name`, `lat`, `lon`, and `affiliation`

Example structure:
```json
{
  "users": [
    {"username": "admin", "password": "1234"}
  ],
  "pois": {
    "poi1": {"name": "Alpha", "lat": 49.75, "lon": 15.33, "affiliation": "Friend"}
  }
}
```

## Running locally

From the `Semestrálka` folder:

```bash
uvicorn backend.BEmain:app --reload --port 8000
```

Then open:

```text
http://127.0.0.1:8000
```

## How it works

1. The browser loads `frontend/index.html` and `frontend/app.js`.
2. The user logs in using `/login`.
3. The backend fetches Firebase `users`, validates credentials, and returns a session token.
4. The browser includes `x-token` for requests to `/api/*`.
5. Middleware checks the token before allowing POI CRUD operations.
6. POI endpoints proxy `GET`, `POST`, `PUT`, and `DELETE` to Firebase under `pois`.
7. Icons are served from `/icons/{affiliation}/default.png`.

## Notes

- The app does not use a local SQLite database.
- Session tokens are stored in memory and expire after 24 hours.
- Unused legacy files were removed from the project.
