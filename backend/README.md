# F1 Telemetry Backend

FastAPI backend for Formula 1 telemetry analytics built with FastF1.

## What this first version does

- Loads a single qualifying session for one driver
- Returns fastest-lap telemetry
- Normalizes X/Y track position coordinates to the range 0-1
- Returns speed, throttle, brake, gear, and RPM data
- Caches loaded FastF1 sessions in memory

## Run locally

From `backend/`:

1. Activate the workspace virtual environment:

```powershell
..\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Start the API:

```powershell
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

## Endpoint

`GET /api/v1/telemetry`

Query parameters:

- `year` - season year
- `grand_prix` - event name, for example `Monaco`
- `session` - session code, defaults to `Q`
- `driver` - driver code, for example `VER`

## Notes

- FastF1 cache is enabled automatically on startup and stored in `backend/.fastf1_cache` unless overridden with `FASTF1_CACHE_DIR`.
- The current implementation is intentionally structured for future multi-driver, race replay, and live telemetry features.
