"""Pydantic models for telemetry responses."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class PositionPoint(BaseModel):
    """A single normalized position sample from the lap."""

    model_config = ConfigDict(extra="forbid")

    time: float = Field(..., description="Elapsed lap time in seconds")
    x: float = Field(..., ge=0.0, le=1.0, description="Normalized X coordinate")
    y: float = Field(..., ge=0.0, le=1.0, description="Normalized Y coordinate")


class TelemetryPoint(BaseModel):
    """A single telemetry sample from the lap."""

    model_config = ConfigDict(extra="forbid")

    time: float = Field(..., description="Elapsed lap time in seconds")
    speed: float = Field(..., ge=0.0, description="Car speed")
    throttle: float = Field(..., ge=0.0, le=100.0, description="Throttle input")
    brake: float = Field(..., ge=0.0, le=100.0, description="Brake input")
    gear: int = Field(..., description="Selected gear")
    rpm: int = Field(..., ge=0, description="Engine RPM")


class DriverTelemetryResponse(BaseModel):
    """Normalized telemetry payload returned by the API."""

    model_config = ConfigDict(extra="forbid")

    driver: str = Field(..., description="Driver code")
    team: str = Field(..., description="Team name")
    positions: list[PositionPoint] = Field(default_factory=list)
    telemetry: list[TelemetryPoint] = Field(default_factory=list)
    # Optional fastest-lap summary for this driver (if available)
    lap_time_seconds: float | None = Field(default=None, ge=0.0, description="Driver fastest lap time in seconds")
    lap_time: str | None = Field(default=None, description="Formatted driver fastest lap time")
    lap_number: int | None = Field(default=None, description="Lap number for the driver's fastest lap")
    compound: str | None = Field(default=None, description="Tire compound used on the driver's fastest lap")
    sector_1_seconds: float | None = Field(default=None, ge=0.0, description="Sector 1 time in seconds")
    sector_2_seconds: float | None = Field(default=None, ge=0.0, description="Sector 2 time in seconds")
    sector_3_seconds: float | None = Field(default=None, ge=0.0, description="Sector 3 time in seconds")
    sector_1: str | None = Field(default=None, description="Formatted sector 1 time")
    sector_2: str | None = Field(default=None, description="Formatted sector 2 time")
    sector_3: str | None = Field(default=None, description="Formatted sector 3 time")


class MetricPoint(BaseModel):
    """A generic time-series point for a single telemetry metric."""

    model_config = ConfigDict(extra="forbid")

    time: float = Field(..., description="Elapsed lap time in seconds")
    value: float | int = Field(..., description="Metric value at this time")


class MetricSeriesResponse(BaseModel):
    """Response payload for a single telemetry metric endpoint."""

    model_config = ConfigDict(extra="forbid")

    driver: str = Field(..., description="Driver code")
    team: str = Field(..., description="Team name")
    metric: str = Field(..., description="Metric name, for example speed or throttle")
    data: list[MetricPoint] = Field(default_factory=list)


class PositionSeriesResponse(BaseModel):
    """Response payload for position endpoint."""

    model_config = ConfigDict(extra="forbid")

    driver: str = Field(..., description="Driver code")
    team: str = Field(..., description="Team name")
    positions: list[PositionPoint] = Field(default_factory=list)


class TireStint(BaseModel):
    """A summarized tire stint from laps data."""

    model_config = ConfigDict(extra="forbid")

    stint: int = Field(..., description="Stint number")
    compound: str = Field(..., description="Tire compound used in this stint")
    start_lap: int | None = Field(default=None, description="First lap number in the stint")
    end_lap: int | None = Field(default=None, description="Last lap number in the stint")


class TireSeriesResponse(BaseModel):
    """Response payload for tire stint endpoint."""

    model_config = ConfigDict(extra="forbid")

    driver: str = Field(..., description="Driver code")
    team: str = Field(..., description="Team name")
    stints: list[TireStint] = Field(default_factory=list)
    note: str | None = Field(default=None, description="Optional note when tire data is unavailable")


class FastestLapResponse(BaseModel):
    """Response payload for the overall fastest lap in a session."""

    model_config = ConfigDict(extra="forbid")

    driver: str = Field(..., description="Driver code who set the fastest lap")
    team: str = Field(..., description="Team name")
    lap_time_seconds: float = Field(..., ge=0.0, description="Fastest lap time in seconds")
    lap_time: str = Field(..., description="Formatted fastest lap time")
    sector_1_seconds: float | None = Field(default=None, ge=0.0, description="Sector 1 time in seconds")
    sector_2_seconds: float | None = Field(default=None, ge=0.0, description="Sector 2 time in seconds")
    sector_3_seconds: float | None = Field(default=None, ge=0.0, description="Sector 3 time in seconds")
    sector_1: str | None = Field(default=None, description="Formatted sector 1 time")
    sector_2: str | None = Field(default=None, description="Formatted sector 2 time")
    sector_3: str | None = Field(default=None, description="Formatted sector 3 time")
    lap_number: int | None = Field(default=None, description="Lap number for the fastest lap")
    compound: str | None = Field(default=None, description="Tire compound used on the fastest lap")


class RaceLeaderboardPoint(BaseModel):
    """A single leaderboard position sample for one driver."""

    model_config = ConfigDict(extra="forbid")

    time: float = Field(..., ge=0.0, description="Elapsed race time in seconds")
    position: float = Field(..., ge=1.0, description="Race position at this time")


class RaceDriverReplay(BaseModel):
    """Race replay data for one driver."""

    model_config = ConfigDict(extra="forbid")

    driver: str = Field(..., description="Driver code")
    driver_name: str = Field(..., description="Driver full name")
    team: str = Field(..., description="Team name")
    positions: list[PositionPoint] = Field(default_factory=list)
    leaderboard: list[RaceLeaderboardPoint] = Field(default_factory=list)


class RaceReplayResponse(BaseModel):
    """Response payload for full-session race replay."""

    model_config = ConfigDict(extra="forbid")

    year: int = Field(..., ge=1950, le=2100)
    grand_prix: str = Field(..., description="Grand Prix label")
    session: str = Field(..., description="Session code")
    duration_seconds: float = Field(..., ge=0.0)
    drivers: list[RaceDriverReplay] = Field(default_factory=list)
