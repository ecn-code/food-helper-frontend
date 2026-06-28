# Agents Guide

This repository uses a single backend environment variable:

- `PUBLIC_BACKEND_BASE_URL`

Rules:

- Use `PUBLIC_BACKEND_BASE_URL` for any frontend code that runs in the browser.
- Use the same variable in Playwright and local scripts when they need the backend URL.
- Do not introduce `BACKEND_BASE_URL` back into the project.
- If a new environment variable is needed, document it here and in `.env.example`.

Default local value:

- `http://127.0.0.1:8080`

Notes:

- The app is static and can be served from S3.
- The backend must allow CORS from the frontend origin.
- Frontend agents must not modify the backend repository directly; if a backend change is needed, describe the required change and provide a plan for a backend agent to implement it.
- Load only what the current screen needs. Do not fetch the whole app catalog or unrelated endpoints when a view only requires one resource.
- If data is already loaded and still valid, prefer reusing it instead of refetching everything on each navigation or screen render.
