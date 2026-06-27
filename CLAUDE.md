# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Flask web app for discovering, reviewing, and saving movies and TV shows. Media data comes from the TMDB API (called client-side from JavaScript); news comes from NewsAPI (called server-side). User accounts, reviews, and saved media are persisted in PostgreSQL. Deployed to an EC2 instance behind gunicorn — see Deployment. Live at https://movieshowsplat.com.

## Commands

```bash
# Set up environment (Windows venv is review_env/, git-ignored)
python -m venv review_env
review_env\Scripts\activate          # Windows
pip install -r requirements.txt

# Run locally (Flask dev server, port 5000, debug on)
python app.py

# Run via WSGI entrypoint (what gunicorn imports in production)
gunicorn wsgi:app
```

There is no test suite, linter, or build step configured.

## Architecture

The entire backend lives in **`app.py`** — models, forms, routes, and config are all defined in this one file. Key structure:

- **`database.py`** opens a module-level psycopg2 `conn`/`cursor` from `DATABASE_URL` at import time. `app.py` imports these *and also* defines `get_db_connection()` for per-request raw connections. The result is **two parallel database access patterns**:
  - **Raw psycopg2** (`get_db_connection()` + manual SQL) is used in `signup`, `login`, `get_reviews`.
  - **Flask-SQLAlchemy ORM** (models `Review`, `User`, `SavedMedia`) is used in `submit_review`, `save_media`, `delete_*`, `my_profile`.
  When changing data logic, check which pattern a route uses — they don't share a session.

- **Auth is split between two mechanisms.** Flask-Login (`login_manager`, `User(UserMixin)`, `load_user`) is initialized but the actual login flow stores `session["user_id"]` manually rather than calling `login_user()`. Routes gate access by checking `session.get("user_id")`, **not** `current_user`. Follow the `session["user_id"]` convention when adding protected routes.

- **CSRF**: Flask-WTF `CSRFProtect` is enabled globally. JSON POST endpoints (`submit_review`, `save_media`) expect a `csrf_token` field inside the JSON body and reject requests missing it.

- **Models / tables** (PostgreSQL, schema in `backup.sql`): `users`, `reviews` (unique on `media_id`+`user_id`, rating constrained 1–5), `saved_media`. `media_id` is an `Integer` on `reviews` but a `String` on `saved_media` — keep that in mind when joining or comparing.

- **Frontend**: server-rendered Jinja templates in `templates/` with per-page CSS/JS in `static/`. The browser calls TMDB directly (`static/script.js`, `static/upcomingScript.js`); reviews/saves are POSTed back to Flask as JSON.

## Routes worth knowing

- `/` and `/index` → landing page; `/main`, `/discover`, `/profile`, `/news`, `/upcoming`, `/search` → app pages (most check `session["user_id"]`).
- `/submit_review`, `/save_media` (JSON POST) and `/delete_review/<id>`, `/delete_saved_media/<id>` mutate user data.
- `/get_reviews/<media_id>` and `/get_news` are read APIs (`/get_news` proxies NewsAPI server-side).
- `/debug_session` dumps the session — debug-only, do not expose in production.

## Configuration & secrets

Environment variables are loaded from `.env` via python-dotenv: `DATABASE_URL`, `SECRET_KEY`, `CSRF_SECRET_KEY`.

Note: several API keys and DB credentials are currently **hardcoded** in source — the TMDB key in `static/*.js`, the NewsAPI `API_KEY` in `app.py`, and DB constants in `database.py` (these constants are unused; the live connection reads `DATABASE_URL`). Prefer moving new secrets to `.env` rather than extending this pattern.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which SSHes into the EC2 host, runs `git pull` in `/home/ubuntu/movieshowapp`, and restarts the `movieshowapp` systemd service. There is no staging branch — commits to `main` deploy to production.
