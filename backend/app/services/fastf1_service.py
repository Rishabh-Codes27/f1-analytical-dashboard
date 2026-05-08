"""Service layer for loading and transforming FastF1 telemetry data."""
from __future__ import annotations

import asyncio
import logging
import math
from threading import Lock
from typing import Any, Literal

import fastf1
from fastf1.exceptions import DataNotLoadedError
import pandas as pd

from app.schemas.telemetry_schema import (
    DriverTelemetryResponse,
    FastestLapResponse,
    MetricPoint,
    MetricSeriesResponse,
    PositionPoint,
    PositionSeriesResponse,
    TelemetryPoint,
    TireSeriesResponse,
    TireStint,
)
from app.utils.data_processing import (
    align_position_frame,
    frame_to_records,
    prepare_position_frame,
    prepare_telemetry_frame,
)

logger = logging.getLogger(__name__)


class TelemetryServiceError(Exception):
    """Base class for telemetry service errors."""


class SessionLoadError(TelemetryServiceError):
    """Raised when FastF1 cannot load the requested session."""


class DriverNotFoundError(TelemetryServiceError):
    """Raised when the requested driver is not present in the session."""


class TelemetryDataError(TelemetryServiceError):
    """Raised when telemetry data cannot be extracted from the lap."""


class FastF1Service:
    """Load, cache, and transform FastF1 sessions for API consumers."""

    def __init__(self) -> None:
        self._session_cache: dict[tuple[int, str, str], Any] = {}
        self._cache_lock = Lock()

    async def get_driver_telemetry(
        self,
        *,
        year: int,
        grand_prix: str,
        session_code: str,
        driver: str,
    ) -> DriverTelemetryResponse:
        """Fetch a driver's fastest-lap telemetry in a background thread."""

        return await asyncio.to_thread(
            self._get_driver_telemetry_sync,
            year,
            grand_prix,
            session_code,
            driver,
        )

    async def get_position_series(
        self,
        *,
        year: int,
        grand_prix: str,
        session_code: str,
        driver: str,
        max_points: int,
    ) -> PositionSeriesResponse:
        """Return normalized position data in a lightweight response model."""

        payload = await self.get_driver_telemetry(
            year=year,
            grand_prix=grand_prix,
            session_code=session_code,
            driver=driver,
        )
        sampled_positions = self._downsample_points(payload.positions, max_points)
        return PositionSeriesResponse(driver=payload.driver, team=payload.team, positions=sampled_positions)

    async def get_metric_series(
        self,
        *,
        year: int,
        grand_prix: str,
        session_code: str,
        driver: str,
        metric: Literal["speed", "throttle", "brake", "gear", "rpm"],
        max_points: int,
    ) -> MetricSeriesResponse:
        """Return one telemetry metric as a compact time series."""

        payload = await self.get_driver_telemetry(
            year=year,
            grand_prix=grand_prix,
            session_code=session_code,
            driver=driver,
        )
        sampled_telemetry = self._downsample_points(payload.telemetry, max_points)
        series_data = [MetricPoint(time=point.time, value=getattr(point, metric)) for point in sampled_telemetry]
        return MetricSeriesResponse(driver=payload.driver, team=payload.team, metric=metric, data=series_data)

    async def get_tire_series(
        self,
        *,
        year: int,
        grand_prix: str,
        session_code: str,
        driver: str,
    ) -> TireSeriesResponse:
        """Return tire stint summary from laps data when available."""

        return await asyncio.to_thread(
            self._get_tire_series_sync,
            year,
            grand_prix,
            session_code,
            driver,
        )

    async def get_fastest_lap(
        self,
        *,
        year: int,
        grand_prix: str,
        session_code: str,
    ) -> FastestLapResponse:
        """Return the overall fastest lap for a session."""

        return await asyncio.to_thread(
            self._get_fastest_lap_sync,
            year,
            grand_prix,
            session_code,
        )

    def downsample_driver_telemetry(
        self,
        payload: DriverTelemetryResponse,
        max_points: int,
    ) -> DriverTelemetryResponse:
        """Downsample positions and telemetry arrays to keep payloads browser-friendly."""

        sampled_positions = self._downsample_points(payload.positions, max_points)
        sampled_telemetry = self._downsample_points(payload.telemetry, max_points)
        return DriverTelemetryResponse(
            driver=payload.driver,
            team=payload.team,
            positions=sampled_positions,
            telemetry=sampled_telemetry,
        )

    def _get_driver_telemetry_sync(
        self,
        year: int,
        grand_prix: str,
        session_code: str,
        driver: str,
    ) -> DriverTelemetryResponse:
        """Execute the full telemetry extraction workflow synchronously."""

        loaded_session = self._load_session(year, grand_prix, session_code)
        driver_code = driver.upper()
        driver_number, team_name = self._resolve_driver_context(loaded_session, driver_code)

        try:
            driver_laps = loaded_session.laps.pick_driver(driver_code)

            if driver_laps.empty:
                raise DriverNotFoundError(f"No laps found for driver {driver_code}.")

            fastest_lap = driver_laps.pick_fastest()
            if fastest_lap is None:
                raise TelemetryDataError(f"Could not determine a fastest lap for driver {driver_code}.")

            telemetry_data = fastest_lap.get_car_data()
            position_data = fastest_lap.get_pos_data()
            team_name = self._resolve_team_name(driver_laps, fastest_lap, team_name)
        except DataNotLoadedError:
            # FastF1 can load the telemetry packets while still failing to build the laps table.
            logger.warning(
                "FastF1 laps data was unavailable for %s %s %s; falling back to driver session telemetry.",
                year,
                grand_prix,
                session_code,
            )
            try:
                telemetry_data = loaded_session.car_data[driver_number]
                position_data = loaded_session.pos_data[driver_number]
            except KeyError as exc:
                raise TelemetryDataError(
                    f"Telemetry packets were not available for driver {driver_code}."
                ) from exc

        telemetry_frame = prepare_telemetry_frame(telemetry_data)
        position_frame = prepare_position_frame(position_data)
        aligned_position_frame = align_position_frame(position_frame, telemetry_frame["time"].tolist())

        positions = [PositionPoint(**record) for record in frame_to_records(aligned_position_frame, ["time", "x", "y"])]
        telemetry = [
            TelemetryPoint(**record)
            for record in frame_to_records(telemetry_frame, ["time", "speed", "throttle", "brake", "gear", "rpm"])
        ]

        logger.info(
            "Loaded telemetry for %s in %s %s %s",
            driver.upper(),
            year,
            grand_prix,
            session_code,
        )

        return DriverTelemetryResponse(driver=driver_code, team=team_name, positions=positions, telemetry=telemetry)

    def _get_tire_series_sync(
        self,
        year: int,
        grand_prix: str,
        session_code: str,
        driver: str,
    ) -> TireSeriesResponse:
        """Extract tire stints for a driver from the laps table."""

        loaded_session = self._load_session(year, grand_prix, session_code)
        driver_code = driver.upper()
        driver_number, team_name = self._resolve_driver_context(loaded_session, driver_code)

        try:
            driver_laps = loaded_session.laps.pick_driver(driver_code)
        except DataNotLoadedError:
            return self._get_tire_series_from_timing_app_data(
                loaded_session=loaded_session,
                driver_code=driver_code,
                driver_number=driver_number,
                team_name=team_name,
            )

        if driver_laps.empty:
            raise DriverNotFoundError(f"No laps found for driver {driver_code}.")

        if "Stint" not in driver_laps.columns or "Compound" not in driver_laps.columns:
            raise TelemetryDataError("Tire stint columns were not available for this session.")

        stints: list[TireStint] = []
        valid_laps = driver_laps.dropna(subset=["Stint"])
        for stint_id, stint_laps in valid_laps.groupby("Stint"):
            compound_series = stint_laps["Compound"].dropna()
            compound = str(compound_series.iloc[0]) if not compound_series.empty else "Unknown"

            lap_numbers = stint_laps["LapNumber"].dropna() if "LapNumber" in stint_laps.columns else pd.Series(dtype=float)
            start_lap = int(lap_numbers.min()) if not lap_numbers.empty else None
            end_lap = int(lap_numbers.max()) if not lap_numbers.empty else None

            stints.append(
                TireStint(
                    stint=int(stint_id),
                    compound=compound,
                    start_lap=start_lap,
                    end_lap=end_lap,
                )
            )

        stints.sort(key=lambda item: item.stint)
        return TireSeriesResponse(driver=driver_code, team=team_name, stints=stints)

    def _get_tire_series_from_timing_app_data(
        self,
        *,
        loaded_session: Any,
        driver_code: str,
        driver_number: str,
        team_name: str,
    ) -> TireSeriesResponse:
        """Fallback tire extraction from FastF1 timing app data."""

        try:
            # FastF1 marks api module as semi-private, so we only import it when needed.
            from fastf1 import api as fastf1_api

            timing_app_data = fastf1_api.timing_app_data(loaded_session.api_path, livedata=None)
        except Exception:
            logger.exception("Failed to load timing app data for tire fallback")
            return TireSeriesResponse(
                driver=driver_code,
                team=team_name,
                stints=[],
                note="Tire stint data is unavailable because FastF1 timing sources could not be parsed.",
            )

        if timing_app_data is None or timing_app_data.empty:
            return TireSeriesResponse(
                driver=driver_code,
                team=team_name,
                stints=[],
                note="Tire stint data is unavailable because timing app data is empty.",
            )

        if "Driver" not in timing_app_data.columns or "Stint" not in timing_app_data.columns:
            return TireSeriesResponse(
                driver=driver_code,
                team=team_name,
                stints=[],
                note="Tire stint data is unavailable because timing app columns are missing.",
            )

        driver_rows = timing_app_data.loc[timing_app_data["Driver"].astype(str) == str(driver_number)].copy()
        if driver_rows.empty:
            return TireSeriesResponse(
                driver=driver_code,
                team=team_name,
                stints=[],
                note="Tire stint data is unavailable for this driver in timing app data.",
            )

        driver_rows = driver_rows.dropna(subset=["Stint"])
        if driver_rows.empty:
            return TireSeriesResponse(
                driver=driver_code,
                team=team_name,
                stints=[],
                note="Tire stint markers were not present for this driver.",
            )

        driver_rows["Stint"] = pd.to_numeric(driver_rows["Stint"], errors="coerce")
        driver_rows = driver_rows.dropna(subset=["Stint"])
        if driver_rows.empty:
            return TireSeriesResponse(
                driver=driver_code,
                team=team_name,
                stints=[],
                note="Tire stint markers could not be parsed from timing app data.",
            )

        stints: list[TireStint] = []
        grouped = driver_rows.sort_values("Time").groupby("Stint", sort=True)
        for stint_id, stint_rows in grouped:
            compound = "Unknown"
            if "Compound" in stint_rows.columns:
                compound_values = stint_rows["Compound"].dropna()
                if not compound_values.empty:
                    compound = str(compound_values.iloc[0])

            start_lap: int | None = None
            end_lap: int | None = None

            if "StartLaps" in stint_rows.columns:
                start_values = pd.to_numeric(stint_rows["StartLaps"], errors="coerce").dropna()
                if not start_values.empty:
                    start_lap = int(start_values.min())

            if "LapNumber" in stint_rows.columns:
                lap_values = pd.to_numeric(stint_rows["LapNumber"], errors="coerce").dropna()
                if not lap_values.empty:
                    if start_lap is None:
                        start_lap = int(lap_values.min())
                    end_lap = int(lap_values.max())

            stints.append(
                TireStint(
                    stint=int(stint_id),
                    compound=compound,
                    start_lap=start_lap,
                    end_lap=end_lap,
                )
            )

        stints.sort(key=lambda item: item.stint)
        if not stints:
            return TireSeriesResponse(
                driver=driver_code,
                team=team_name,
                stints=[],
                note="Tire stint data could not be derived from timing app data.",
            )

        return TireSeriesResponse(driver=driver_code, team=team_name, stints=stints)

    def _get_fastest_lap_sync(
        self,
        year: int,
        grand_prix: str,
        session_code: str,
    ) -> FastestLapResponse:
        """Extract the single fastest lap from the session laps table."""

        loaded_session = self._load_session(year, grand_prix, session_code)

        try:
            session_laps = loaded_session.laps
        except DataNotLoadedError as exc:
            return self._get_fastest_lap_from_results(loaded_session, year, grand_prix, session_code)

        if session_laps.empty:
            return self._get_fastest_lap_from_results(loaded_session, year, grand_prix, session_code)

        fastest_lap = session_laps.pick_fastest()
        if fastest_lap is None:
            return self._get_fastest_lap_from_results(loaded_session, year, grand_prix, session_code)

        driver_code = str(fastest_lap.get("Driver", "")).upper()
        if not driver_code:
            driver_code = str(fastest_lap.get("Abbreviation", "")).upper()

        if not driver_code:
            driver_code = "Unknown"

        try:
            _, fallback_team = self._resolve_driver_context(loaded_session, driver_code)
        except DriverNotFoundError:
            fallback_team = "Unknown"

        team_name = self._resolve_team_name(session_laps, fastest_lap, fallback_team)
        lap_time = fastest_lap.get("LapTime")
        if pd.isna(lap_time):
            raise TelemetryDataError("Fastest lap time was not available in the session data.")

        lap_time_seconds = float(lap_time.total_seconds())

        lap_number_value = fastest_lap.get("LapNumber")
        lap_number = int(lap_number_value) if pd.notna(lap_number_value) else None

        compound_value = fastest_lap.get("Compound")
        compound = str(compound_value) if pd.notna(compound_value) else None

        return FastestLapResponse(
            driver=driver_code,
            team=team_name,
            lap_time_seconds=lap_time_seconds,
            lap_time=self._format_lap_time(lap_time_seconds),
            lap_number=lap_number,
            compound=compound,
        )

    def _get_fastest_lap_from_results(
        self,
        loaded_session: Any,
        year: int,
        grand_prix: str,
        session_code: str,
    ) -> FastestLapResponse:
        """Fallback fastest-lap lookup using the session results table."""

        results = getattr(loaded_session, "results", None)
        if results is None or getattr(results, "empty", True):
            raise TelemetryDataError(
                "Fastest lap data is unavailable because FastF1 laps data did not load and session results were empty."
            )

        lap_columns = [column for column in ("Q1", "Q2", "Q3") if column in results.columns]
        if not lap_columns:
            raise TelemetryDataError(
                "Fastest lap data is unavailable because this session does not expose qualifying lap times."
            )

        fastest_candidates = (
            results[["Abbreviation", "TeamName", *lap_columns]]
            .melt(id_vars=["Abbreviation", "TeamName"], value_vars=lap_columns, var_name="segment", value_name="lap_time")
            .dropna(subset=["lap_time"])
        )

        if fastest_candidates.empty:
            raise TelemetryDataError(
                "Fastest lap data is unavailable because no qualifying lap times were recorded in session results."
            )

        fastest_row = fastest_candidates.loc[fastest_candidates["lap_time"].idxmin()]
        lap_time = fastest_row["lap_time"]
        lap_time_seconds = float(lap_time.total_seconds())

        driver_code = str(fastest_row["Abbreviation"]).upper()
        team_name = str(fastest_row["TeamName"]) if pd.notna(fastest_row["TeamName"]) else "Unknown"

        logger.info(
            "Loaded fastest lap from session results for %s %s %s",
            year,
            grand_prix,
            session_code,
        )

        return FastestLapResponse(
            driver=driver_code,
            team=team_name,
            lap_time_seconds=lap_time_seconds,
            lap_time=self._format_lap_time(lap_time_seconds),
            lap_number=None,
            compound=None,
        )

    def _load_session(self, year: int, grand_prix: str, session_code: str) -> Any:
        """Return a cached FastF1 session or load it on first access."""

        cache_key = (year, grand_prix.strip().lower(), session_code.strip().upper())
        with self._cache_lock:
            cached_session = self._session_cache.get(cache_key)

        if cached_session is not None:
            return cached_session

        try:
            session = fastf1.get_session(year, grand_prix, session_code)
            session.load()
        except Exception as exc:  # FastF1 raises a range of errors depending on the failure mode.
            logger.exception("Failed to load FastF1 session %s %s %s", year, grand_prix, session_code)
            raise SessionLoadError(
                f"Unable to load session {year} {grand_prix} {session_code}."
            ) from exc

        with self._cache_lock:
            self._session_cache[cache_key] = session

        return session

    def _resolve_team_name(self, driver_laps: pd.DataFrame, fastest_lap: Any, fallback_team: str) -> str:
        """Extract the team name from the lap metadata, falling back safely."""

        if hasattr(fastest_lap, "get"):
            team_name = fastest_lap.get("Team")
            if team_name:
                return str(team_name)

        if "Team" in driver_laps.columns and not driver_laps.empty:
            team_name = driver_laps["Team"].iloc[0]
            if pd.notna(team_name):
                return str(team_name)

        return fallback_team

    def _resolve_driver_context(self, session: Any, driver_code: str) -> tuple[str, str]:
        """Resolve the driver number and team name from the session results table."""

        results = getattr(session, "results", None)
        if results is None or getattr(results, "empty", True):
            raise DriverNotFoundError(f"No results data available for driver {driver_code}.")

        driver_rows = results.loc[results["Abbreviation"].astype(str).str.upper() == driver_code]
        if driver_rows.empty:
            raise DriverNotFoundError(f"No results entry found for driver {driver_code}.")

        driver_row = driver_rows.iloc[0]
        driver_number = str(driver_row["DriverNumber"])
        team_name = driver_row.get("TeamName", "Unknown")

        if pd.isna(team_name):
            team_name = "Unknown"

        return driver_number, str(team_name)

    def _downsample_points(self, points: list[Any], max_points: int) -> list[Any]:
        """Keep the series size bounded while preserving temporal shape."""

        if max_points <= 0:
            raise ValueError("max_points must be greater than zero.")
        if len(points) <= max_points:
            return points

        step = math.ceil(len(points) / max_points)
        sampled = points[::step]
        if sampled and sampled[-1] is not points[-1]:
            sampled.append(points[-1])
        return sampled

    def _format_lap_time(self, total_seconds: float) -> str:
        """Format a lap time as M:SS.mmm or H:MM:SS.mmm when needed."""

        total_milliseconds = int(round(total_seconds * 1000))
        hours, remainder = divmod(total_milliseconds, 3_600_000)
        minutes, remainder = divmod(remainder, 60_000)
        seconds, milliseconds = divmod(remainder, 1_000)

        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"

        return f"{minutes}:{seconds:02d}.{milliseconds:03d}"


fastf1_service = FastF1Service()


def get_fastf1_service() -> FastF1Service:
    """Return the shared FastF1 service instance."""

    return fastf1_service
