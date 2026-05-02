# Semestrálka Mission Briefing

This is the browser version of the Mission Briefing app. It loads and saves POIs using a Firebase Realtime Database.

## Setup

1. Open `Semestrálka/frontend/app.js`.
2. Replace `https://YOUR_FIREBASE_DATABASE_URL/` with the base URL of your Firebase Realtime Database. Example:
   ```js
   const firebaseUrl = "https://your-project-id-default-rtdb.europe-west1.firebasedatabase.app/";
   ```
3. If your Firebase rules require authentication, also set `firebaseAuthToken` in `app.js`.
4. Save the file.

## Run locally

From the `Semestrálka/frontend` directory, start a simple static server:

```bash
cd /workspaces/TWA/Semestrálka/frontend
python3 -m http.server 8000
```

Then open this in your browser:

```
http://127.0.0.1:8000
```

## Using the app

- The browser page now requires login before you can view the map and add POIs.
- Default credentials are:
  - username: `admin`
  - password: `1234`
- After login, the map displays POIs and shows markers on the map.
- Use the form to add a new POI.
- Existing POIs are shown in the list.

## Notes

- This implementation uses the Firebase Realtime Database REST API.
- If your Firebase rules require authentication, you may need to permit read/write access during development or add auth headers.
- The current Python `main.py` is a desktop PyQt app and is not required for browser use.
