# Project Folder Structure Guide

This document explains the main folders in the ShareMyRide project and what each one is responsible for.

## Root Level

- `backend/` — Node.js/Express backend server, API routes, controllers, models, and services.
- `frontend/` — React/Vite frontend application, pages, components, hooks, and UI assets.
- `docs/` — Project documentation, architecture notes, and reference content.
- `scripts/` — Utility scripts for maintenance, data cleanup, and automation tasks.
- `README.md` — Main project overview and setup instructions.
- `package.json` — Root workspace scripts and project-level configuration.

## Backend

- `backend/config/` — Configuration files for database, payments, email, and other integrations.
- `backend/controllers/` — Request handlers for API endpoints.
- `backend/middleware/` — Authentication, uploads, and request processing middleware.
- `backend/models/` — Mongoose schemas and database models.
- `backend/routes/` — Express route definitions grouped by feature.
- `backend/services/` — Business logic and reusable backend services.
- `backend/utils/` — Helper utilities and shared backend functions.
- `backend/server.js` — Main backend entry point.
- `backend/package.json` — Backend-specific dependencies and scripts.

## Frontend

- `frontend/src/` — Main source code for the app.
- `frontend/src/components/` — Reusable UI components.
- `frontend/src/pages/` — Route-level pages and feature screens.
- `frontend/src/hooks/` — Custom React hooks.
- `frontend/src/services/` — API integration and frontend service modules.
- `frontend/src/routes/` — Routing configuration.
- `frontend/src/utils/` — Shared frontend helper functions.
- `frontend/public/` — Static assets and public files.
- `frontend/index.html` — Main HTML entry file.
- `frontend/package.json` — Frontend dependencies and scripts.
- `frontend/vite.config.js` — Vite configuration.

## Docs and Project Notes

- `BACKEND_SETUP_GUIDE.md` — Backend setup instructions.
- `EMAIL_SETUP_GUIDE.md` — Email service setup.
- `ENV_QUICK_REFERENCE.md` — Environment variable quick reference.
- `IMPLEMENTATION_STATUS.md` — Current implementation progress.
- `PRODUCTION_READY_CHECKLIST.md` — Production readiness checklist.
- `PRODUCTION_SETUP.md` — Production deployment notes.
- `QUICK_REFERENCE.md` — Short reference guide.
- `SESSION_SUMMARY.md` — Session progress summary.
- `SHAREMYRIDE_COMPLETE_GUIDE.md` — End-to-end project guide.
- `UI.MD` — UI-related notes and design references.

## Suggested Mental Model

- Use `backend/` for server-side logic.
- Use `frontend/src/pages/` for pages.
- Use `frontend/src/components/` for reusable UI pieces.
- Use `frontend/src/services/` for data/API communication.
- Use `docs/` and the root markdown files for workflows and setup context.
