# Sharkfit Dashboard Workspace

This workspace contains the Sharkfit dashboard frontend, Django backend, landing page, and the EVO data intake service, plus documentation and Docker files.

## What is here
- backend/: Django REST API (legacy SQLite / local DB)
- frontend/: React + Vite dashboard
- landing/: React marketing site
- backend-data-intake/: Node.js EVO intake and proxy tools
- docs/: technical and delivery documentation
- docker-compose.yml: local containers

## Quick start (Docker)
1) Copy environment file: copy .env.example to .env
2) Run: docker-compose up --build

## Local dev (no Docker)
- Backend: cd backend, create venv, install requirements, run Django
- Frontend: cd frontend, npm install, npm run dev
- Landing: cd landing, npm install, npm run dev

## Documentation
Start with docs/documentado/README.md and backend/OPTIMIZACION_QUICK_START.md for database performance notes.
