"""Telemetry endpoint for FastF1-powered lap analysis."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.telemetry_schema import (
    DriverTelemetryResponse,
    FastestLapResponse,
    MetricSeriesResponse,
    PositionSeriesResponse,
    RaceReplayResponse,
    TireSeriesResponse,
)
from app.services.fastf1_service import (
    DriverNotFoundError,
    SessionLoadError,
    TelemetryDataError,
    FastF1Service,
    get_fastf1_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["telemetry"])

LOCKED_SEASON_YEAR = 2025


@router.get(
    "/telemetry/race-replay",
    response_model=RaceReplayResponse,
    summary="Get all-driver race replay data and leaderboard progression",
)
async def get_race_replay(
    year: int = Query(..., ge=1950, le=2100, description="Season year (locked to 2025)"),
    grand_prix: str = Query(..., min_length=1, description="Grand Prix name"),
    session: str = Query("R", min_length=1, max_length=10, description="Session code, usually R"),
    max_track_points: int = Query(4000, ge=200, le=30000, description="Maximum track points per driver"),
    max_leaderboard_points: int = Query(1200, ge=50, le=10000, description="Maximum leaderboard samples per driver"),
    telemetry_service: FastF1Service = Depends(get_fastf1_service),
) -> RaceReplayResponse:
    """Return race replay payload for all drivers with timeline-based leaderboard positions."""

    if year != LOCKED_SEASON_YEAR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only the {LOCKED_SEASON_YEAR} season is supported in this build.",
        )

    try:
        return await telemetry_service.get_race_replay(
            year=year,
            grand_prix=grand_prix,
            session_code=session,
            max_track_points=max_track_points,
            max_leaderboard_points=max_leaderboard_points,
        )
    except (SessionLoadError, TelemetryDataError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:  # pragma: no cover - this is our last-resort safety net.
        logger.exception("Unexpected race replay API failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected race replay processing error.",
        )


@router.get(
    "/telemetry",
    response_model=DriverTelemetryResponse,
    summary="Get normalized telemetry for one driver in a qualifying session",
)
async def get_telemetry(
    year: int = Query(..., ge=1950, le=2100, description="Season year"),
    grand_prix: str = Query(..., min_length=1, description="Grand Prix name"),
    session: str = Query("Q", min_length=1, max_length=10, description="Session code, usually Q"),
    driver: str = Query(..., min_length=1, max_length=3, description="Driver code, such as VER"),
    max_points: int = Query(2500, ge=100, le=20000, description="Maximum samples returned per array"),
    telemetry_service: FastF1Service = Depends(get_fastf1_service),
) -> DriverTelemetryResponse:
    """Return a single driver's fastest-lap telemetry from a qualifying session."""

    try:
        payload = await telemetry_service.get_driver_telemetry(
            year=year,
            grand_prix=grand_prix,
            session_code=session,
            driver=driver,
        )
        return telemetry_service.downsample_driver_telemetry(payload, max_points)
    except DriverNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (SessionLoadError, TelemetryDataError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:  # pragma: no cover - this is our last-resort safety net.
        logger.exception("Unexpected telemetry API failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected telemetry processing error.",
        )


@router.get(
    "/telemetry/positions",
    response_model=PositionSeriesResponse,
    summary="Get normalized track positions only",
)
async def get_position_series(
    year: int = Query(..., ge=1950, le=2100, description="Season year"),
    grand_prix: str = Query(..., min_length=1, description="Grand Prix name"),
    session: str = Query("Q", min_length=1, max_length=10, description="Session code, usually Q"),
    driver: str = Query(..., min_length=1, max_length=3, description="Driver code, such as VER"),
    max_points: int = Query(2500, ge=100, le=20000, description="Maximum samples returned"),
    telemetry_service: FastF1Service = Depends(get_fastf1_service),
) -> PositionSeriesResponse:
    """Return normalized X/Y coordinates over time for one driver."""

    try:
        return await telemetry_service.get_position_series(
            year=year,
            grand_prix=grand_prix,
            session_code=session,
            driver=driver,
            max_points=max_points,
        )
    except DriverNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (SessionLoadError, TelemetryDataError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:  # pragma: no cover - this is our last-resort safety net.
        logger.exception("Unexpected positions API failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected positions processing error.",
        )


async def _get_metric_response(
    *,
    metric: str,
    year: int,
    grand_prix: str,
    session: str,
    driver: str,
    max_points: int,
    telemetry_service: FastF1Service,
) -> MetricSeriesResponse:
    """Shared metric endpoint logic to avoid duplicating error handling."""

    try:
        return await telemetry_service.get_metric_series(
            year=year,
            grand_prix=grand_prix,
            session_code=session,
            driver=driver,
            metric=metric,
            max_points=max_points,
        )
    except DriverNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (SessionLoadError, TelemetryDataError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:  # pragma: no cover - this is our last-resort safety net.
        logger.exception("Unexpected metric API failure for %s", metric)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected {metric} processing error.",
        )


@router.get("/telemetry/speed", response_model=MetricSeriesResponse, summary="Get speed over time")
async def get_speed_series(
    year: int = Query(..., ge=1950, le=2100, description="Season year"),
    grand_prix: str = Query(..., min_length=1, description="Grand Prix name"),
    session: str = Query("Q", min_length=1, max_length=10, description="Session code, usually Q"),
    driver: str = Query(..., min_length=1, max_length=3, description="Driver code, such as VER"),
    max_points: int = Query(2500, ge=100, le=20000, description="Maximum samples returned"),
    telemetry_service: FastF1Service = Depends(get_fastf1_service),
) -> MetricSeriesResponse:
    """Return speed samples over time."""

    return await _get_metric_response(
        metric="speed",
        year=year,
        grand_prix=grand_prix,
        session=session,
        driver=driver,
        max_points=max_points,
        telemetry_service=telemetry_service,
    )


@router.get("/telemetry/throttle", response_model=MetricSeriesResponse, summary="Get throttle over time")
async def get_throttle_series(
    year: int = Query(..., ge=1950, le=2100, description="Season year"),
    grand_prix: str = Query(..., min_length=1, description="Grand Prix name"),
    session: str = Query("Q", min_length=1, max_length=10, description="Session code, usually Q"),
    driver: str = Query(..., min_length=1, max_length=3, description="Driver code, such as VER"),
    max_points: int = Query(2500, ge=100, le=20000, description="Maximum samples returned"),
    telemetry_service: FastF1Service = Depends(get_fastf1_service),
) -> MetricSeriesResponse:
    """Return throttle samples over time."""

    return await _get_metric_response(
        metric="throttle",
        year=year,
        grand_prix=grand_prix,
        session=session,
        driver=driver,
        max_points=max_points,
        telemetry_service=telemetry_service,
    )


@router.get("/telemetry/brake", response_model=MetricSeriesResponse, summary="Get brake over time")
async def get_brake_series(
    year: int = Query(..., ge=1950, le=2100, description="Season year"),
    grand_prix: str = Query(..., min_length=1, description="Grand Prix name"),
    session: str = Query("Q", min_length=1, max_length=10, description="Session code, usually Q"),
    driver: str = Query(..., min_length=1, max_length=3, description="Driver code, such as VER"),
    max_points: int = Query(2500, ge=100, le=20000, description="Maximum samples returned"),
    telemetry_service: FastF1Service = Depends(get_fastf1_service),
) -> MetricSeriesResponse:
    """Return brake samples over time."""

    return await _get_metric_response(
        metric="brake",
        year=year,
        grand_prix=grand_prix,
        session=session,
        driver=driver,
        max_points=max_points,
        telemetry_service=telemetry_service,
    )


@router.get("/telemetry/gear", response_model=MetricSeriesResponse, summary="Get gear over time")
async def get_gear_series(
    year: int = Query(..., ge=1950, le=2100, description="Season year"),
    grand_prix: str = Query(..., min_length=1, description="Grand Prix name"),
    session: str = Query("Q", min_length=1, max_length=10, description="Session code, usually Q"),
    driver: str = Query(..., min_length=1, max_length=3, description="Driver code, such as VER"),
    max_points: int = Query(2500, ge=100, le=20000, description="Maximum samples returned"),
    telemetry_service: FastF1Service = Depends(get_fastf1_service),
) -> MetricSeriesResponse:
    """Return gear samples over time."""

    return await _get_metric_response(
        metric="gear",
        year=year,
        grand_prix=grand_prix,
        session=session,
        driver=driver,
        max_points=max_points,
        telemetry_service=telemetry_service,
    )


@router.get("/telemetry/rpm", response_model=MetricSeriesResponse, summary="Get rpm over time")
async def get_rpm_series(
    year: int = Query(..., ge=1950, le=2100, description="Season year"),
    grand_prix: str = Query(..., min_length=1, description="Grand Prix name"),
    session: str = Query("Q", min_length=1, max_length=10, description="Session code, usually Q"),
    driver: str = Query(..., min_length=1, max_length=3, description="Driver code, such as VER"),
    max_points: int = Query(2500, ge=100, le=20000, description="Maximum samples returned"),
    telemetry_service: FastF1Service = Depends(get_fastf1_service),
) -> MetricSeriesResponse:
    """Return rpm samples over time."""

    return await _get_metric_response(
        metric="rpm",
        year=year,
        grand_prix=grand_prix,
        session=session,
        driver=driver,
        max_points=max_points,
        telemetry_service=telemetry_service,
    )


@router.get(
    "/telemetry/tires",
    response_model=TireSeriesResponse,
    summary="Get tire stint summary",
)
async def get_tire_series(
    year: int = Query(..., ge=1950, le=2100, description="Season year"),
    grand_prix: str = Query(..., min_length=1, description="Grand Prix name"),
    session: str = Query("Q", min_length=1, max_length=10, description="Session code, usually Q"),
    driver: str = Query(..., min_length=1, max_length=3, description="Driver code, such as VER"),
    telemetry_service: FastF1Service = Depends(get_fastf1_service),
) -> TireSeriesResponse:
    """Return tire stints and compound usage for one driver."""

    try:
        return await telemetry_service.get_tire_series(
            year=year,
            grand_prix=grand_prix,
            session_code=session,
            driver=driver,
        )
    except DriverNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (SessionLoadError, TelemetryDataError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:  # pragma: no cover - this is our last-resort safety net.
        logger.exception("Unexpected tires API failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected tire processing error.",
        )


@router.get(
    "/telemetry/fastest-lap",
    response_model=FastestLapResponse,
    summary="Get the overall fastest lap in a session",
)
async def get_fastest_lap(
    year: int = Query(..., ge=1950, le=2100, description="Season year"),
    grand_prix: str = Query(..., min_length=1, description="Grand Prix name"),
    session: str = Query("Q", min_length=1, max_length=10, description="Session code, usually Q"),
    telemetry_service: FastF1Service = Depends(get_fastf1_service),
) -> FastestLapResponse:
    """Return the overall fastest lap from the requested session."""

    try:
        return await telemetry_service.get_fastest_lap(
            year=year,
            grand_prix=grand_prix,
            session_code=session,
        )
    except (SessionLoadError, TelemetryDataError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:  # pragma: no cover - this is our last-resort safety net.
        logger.exception("Unexpected fastest-lap API failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected fastest-lap processing error.",
        )
