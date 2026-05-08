"""Helpers for turning FastF1 frames into API-friendly data."""
from __future__ import annotations

from typing import Any, Iterable

import numpy as np
import pandas as pd


def _to_seconds(value: Any) -> float:
    """Convert FastF1 time values into plain seconds."""

    if pd.isna(value):
        return float("nan")
    if isinstance(value, pd.Timedelta):
        return float(value.total_seconds())
    if isinstance(value, np.timedelta64):
        return float(pd.to_timedelta(value).total_seconds())
    if hasattr(value, "total_seconds"):
        return float(value.total_seconds())
    return float(value)


def _to_python_value(value: Any) -> Any:
    """Convert NumPy and pandas scalars into JSON-friendly Python values."""

    if pd.isna(value):
        return None
    if hasattr(value, "item") and not isinstance(value, (str, bytes)):
        try:
            return value.item()
        except ValueError:
            return value
    return value


def normalize_coordinate_series(series: pd.Series) -> pd.Series:
    """Scale a coordinate series to the inclusive range [0, 1]."""

    minimum = series.min()
    maximum = series.max()

    if pd.isna(minimum) or pd.isna(maximum) or maximum == minimum:
        return pd.Series([0.0] * len(series), index=series.index, dtype="float64")

    return ((series - minimum) / (maximum - minimum)).astype("float64")


def prepare_telemetry_frame(car_data: pd.DataFrame) -> pd.DataFrame:
    """Select and normalize the telemetry columns we expose publicly."""

    if car_data.empty:
        raise ValueError("Telemetry data is empty.")

    frame = car_data.copy()
    gear_column = "nGear" if "nGear" in frame.columns else "Gear"

    required_columns = ["Time", "Speed", "Throttle", "Brake", gear_column, "RPM"]
    missing_columns = [column for column in required_columns if column not in frame.columns]
    if missing_columns:
        raise ValueError(f"Telemetry data is missing columns: {', '.join(missing_columns)}")

    telemetry_frame = pd.DataFrame(
        {
            "time": frame["Time"].map(_to_seconds),
            # FastF1 telemetry can contain small overshoots or gaps, so we clamp the
            # values to the ranges that our public schema promises.
            "speed": frame["Speed"].astype(float).clip(lower=0.0),
            "throttle": frame["Throttle"].astype(float).clip(lower=0.0, upper=100.0),
            "brake": frame["Brake"].astype(float).clip(lower=0.0, upper=100.0),
            "gear": frame[gear_column].fillna(0).astype(int).clip(lower=0),
            "rpm": frame["RPM"].fillna(0).astype(int).clip(lower=0),
        }
    )

    return telemetry_frame.dropna(subset=["time"]).reset_index(drop=True)


def prepare_position_frame(position_data: pd.DataFrame) -> pd.DataFrame:
    """Select position columns and normalize track coordinates."""

    if position_data.empty:
        raise ValueError("Position data is empty.")

    frame = position_data.copy()
    required_columns = ["Time", "X", "Y"]
    missing_columns = [column for column in required_columns if column not in frame.columns]
    if missing_columns:
        raise ValueError(f"Position data is missing columns: {', '.join(missing_columns)}")

    position_frame = pd.DataFrame(
        {
            "time": frame["Time"].map(_to_seconds),
            "x": frame["X"].astype(float),
            "y": frame["Y"].astype(float),
        }
    )

    position_frame["x"] = normalize_coordinate_series(position_frame["x"])
    position_frame["y"] = normalize_coordinate_series(position_frame["y"])

    return position_frame.dropna(subset=["time"]).reset_index(drop=True)


def align_position_frame(position_frame: pd.DataFrame, telemetry_times: Iterable[float]) -> pd.DataFrame:
    """Align position samples to the telemetry timeline."""

    if position_frame.empty:
        raise ValueError("Position frame is empty.")

    target_times = pd.Index([float(time) for time in telemetry_times], name="time")
    if target_times.empty:
        raise ValueError("Telemetry timeline is empty.")

    base_frame = position_frame.drop_duplicates(subset=["time"]).sort_values("time").set_index("time")
    complete_index = base_frame.index.union(target_times)

    aligned_frame = (
        base_frame.reindex(complete_index)
        .interpolate(method="index")
        .ffill()
        .bfill()
        .reindex(target_times)
        .reset_index()
    )

    return aligned_frame


def frame_to_records(frame: pd.DataFrame, columns: list[str]) -> list[dict[str, Any]]:
    """Convert a dataframe into a list of plain Python dictionaries."""

    records: list[dict[str, Any]] = []
    for row in frame.loc[:, columns].to_dict(orient="records"):
        records.append({key: _to_python_value(value) for key, value in row.items()})
    return records
