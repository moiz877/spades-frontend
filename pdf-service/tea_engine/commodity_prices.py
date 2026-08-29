"""
Chemical commodity price fetching and caching.

Sources (see the architecture discussion for why these and not a paid
ICIS/S&P feed):
  1. BLS PPI API (api.bls.gov) -- free, official, NAICS-level industrial
     chemical price indices. Primary source.
  2. FRED API (api.stlouisfed.org) -- free, mirrors many of the same
     BLS series with a friendlier API. Fallback / cross-check.

IMPORTANT -- series IDs are placeholders, not verified: the exact BLS/FRED
series codes for sulfuric acid, caustic soda, and ethylene need to be
confirmed by hand before this goes live. Look them up at
https://beta.bls.gov/dataQuery/find (search "sulfuric acid", "sodium
hydroxide", "ethylene") and https://fred.stlouisfed.org/, then replace
the placeholders in COMMODITY_SERIES_MAP below. Shipping a wrong series
ID silently would be worse than this file simply refusing to guess.

Caching: refreshed at most once per REFRESH_INTERVAL (default weekly),
per the cost-control requirement -- price data is fetched from the
Mongo cache on every request and only hits BLS/FRED when stale.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import requests
from pymongo.collection import Collection

REFRESH_INTERVAL = timedelta(days=7)
CACHE_COLLECTION_NAME = "commodity_prices"

BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/{series_id}"
FRED_API_URL = "https://api.stlouisfed.org/fred/series/observations"


@dataclass
class CommoditySeriesConfig:
    """Where to fetch one commodity's price series, and its native unit."""

    bls_series_id: str | None
    fred_series_id: str | None
    unit: str


# PLACEHOLDER series IDs -- verify against BLS/FRED before deploying.
# unit is the unit BLS/FRED reports the index/price in; convert to your
# process's unit (e.g. $/metric ton) in the caller if they differ.
COMMODITY_SERIES_MAP: dict[str, CommoditySeriesConfig] = {
    "sulfuric_acid": CommoditySeriesConfig(
        bls_series_id="WPU0613",  # TODO: verify -- PPI industrial inorganic chemicals, n.e.c.
        fred_series_id=None,
        unit="index_point",
    ),
    "caustic_soda": CommoditySeriesConfig(
        bls_series_id="WPU0613",  # TODO: verify -- placeholder, same group as above
        fred_series_id=None,
        unit="index_point",
    ),
    "ethylene": CommoditySeriesConfig(
        bls_series_id=None,
        fred_series_id="PCU325110325110",  # TODO: verify -- petrochemical manufacturing PPI by industry
        unit="index_point",
    ),
}


class CommodityPriceError(Exception):
    """Raised when a commodity price can't be fetched from any configured source."""


def _fetch_from_bls(series_id: str, api_key: str | None) -> float:
    params: dict[str, str] = {}
    if api_key:
        params["registrationkey"] = api_key
    res = requests.get(BLS_API_URL.format(series_id=series_id), params=params, timeout=10)
    res.raise_for_status()
    payload = res.json()
    series = payload.get("Results", {}).get("series", [])
    if not series or not series[0].get("data"):
        raise CommodityPriceError(f"BLS returned no data for series {series_id}")
    latest = series[0]["data"][0]  # BLS returns most-recent-first
    return float(latest["value"])


def _fetch_from_fred(series_id: str, api_key: str) -> float:
    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "sort_order": "desc",
        "limit": "1",
    }
    res = requests.get(FRED_API_URL, params=params, timeout=10)
    res.raise_for_status()
    payload = res.json()
    observations = payload.get("observations", [])
    if not observations or observations[0]["value"] == ".":
        raise CommodityPriceError(f"FRED returned no data for series {series_id}")
    return float(observations[0]["value"])


def _fetch_fresh_price(commodity_key: str) -> tuple[float, str, str]:
    """Returns (value, source, series_id). Tries BLS first, then FRED."""
    config = COMMODITY_SERIES_MAP.get(commodity_key)
    if config is None:
        raise CommodityPriceError(f"No series configured for commodity_key '{commodity_key}'")

    if config.bls_series_id:
        try:
            value = _fetch_from_bls(config.bls_series_id, os.environ.get("BLS_API_KEY"))
            return value, "bls", config.bls_series_id
        except (requests.RequestException, CommodityPriceError) as exc:
            print(f"[warn] BLS fetch failed for {commodity_key}: {exc}")

    if config.fred_series_id:
        fred_key = os.environ.get("FRED_API_KEY")
        if not fred_key:
            raise CommodityPriceError("FRED_API_KEY not set and BLS fetch failed/unavailable")
        value = _fetch_from_fred(config.fred_series_id, fred_key)
        return value, "fred", config.fred_series_id

    raise CommodityPriceError(f"All configured sources failed for commodity_key '{commodity_key}'")


def get_commodity_price(collection: Collection, commodity_key: str) -> float:
    """
    Returns the cached price for commodity_key, refreshing from BLS/FRED
    only if the cache entry is missing or older than REFRESH_INTERVAL.
    This is the only function callers should use -- it never hits the
    network on a fresh cache hit, per the "don't call external APIs on
    every UI interaction" cost-control requirement.
    """
    cached = collection.find_one({"commodity_key": commodity_key})
    now = datetime.now(timezone.utc)

    if cached and (now - cached["fetched_at"].replace(tzinfo=timezone.utc)) < REFRESH_INTERVAL:
        return cached["value"]

    try:
        value, source, series_id = _fetch_fresh_price(commodity_key)
    except CommodityPriceError:
        if cached:
            print(f"[warn] Refresh failed for {commodity_key}; serving stale cached value.")
            return cached["value"]
        raise

    collection.update_one(
        {"commodity_key": commodity_key},
        {"$set": {"commodity_key": commodity_key, "value": value, "source": source, "series_id": series_id, "fetched_at": now}},
        upsert=True,
    )
    return value
