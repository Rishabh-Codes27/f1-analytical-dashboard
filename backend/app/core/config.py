"""Application configuration and FastF1 cache bootstrap helpers."""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

import fastf1

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class Settings:
    """Runtime settings for the telemetry backend."""

    app_name: str = os.getenv("APP_NAME", "F1 Telemetry API")
    app_version: str = os.getenv("APP_VERSION", "1.0.0")
    api_v1_prefix: str = os.getenv("API_V1_PREFIX", "/api/v1")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    fastf1_cache_dir: Path = Path(
        os.getenv(
            "FASTF1_CACHE_DIR",
            str(Path(__file__).resolve().parents[2] / ".fastf1_cache"),
        )
    )


settings = Settings()


def configure_fastf1_cache() -> None:
    """Enable the local FastF1 cache before any session data is loaded."""

    settings.fastf1_cache_dir.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(settings.fastf1_cache_dir))
    logger.info("FastF1 cache enabled at %s", settings.fastf1_cache_dir)
