# Semestrálka Mission Briefing

This is the browser version of the Mission Briefing app. It loads and saves POIs through the backend API in `Semestrálka/backend`.

## Setup

1. Set `FIREBASE_URL` to your Firebase Realtime Database base URL in the backend environment.
2. Optionally set `FIREBASE_AUTH_TOKEN` if your database requires a REST auth token.
3. Store login users under `users` in Firebase and POIs under `pois`.
4. The backend then proxies login and POI operations through Firebase.

## Run locally

Start the backend and use it to serve the frontend.

Backend:

```bash
cd /workspaces/TWA/Semestrálka
uvicorn backend.BEmain:app --reload --port 8000
```

Then open this in your browser:

```
http://127.0.0.1:8000
```


## Using the app

- The browser page now requires login before you can view the map and add POIs.
- Login credentials are loaded from Firebase under the `users` path and validated by the backend `/login` endpoint.
- Successful login generates a session token.
- Middleware validates that token for all `/api/*` requests before allowing POI operations.
- Example Firebase users data:
  ```json
  {
    "users": [
      {"username": "admin", "password": "1234"}
    ],
    "pois": {}
  }
  ```
- After login, the map displays POIs from Firebase and shows markers on the map.
- Use the form to add a new POI.
- Existing POIs are shown in the list, and each list item supports Modify/Delete.

## Notes

- This implementation stores both users and POIs in Firebase and proxies them through the backend.
- The backend does not use local SQLite or local user files for login data.
- The current Python `main.py` is a desktop PyQt app and is not required for browser use.
