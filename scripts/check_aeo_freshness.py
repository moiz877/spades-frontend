#!/usr/bin/env python3
"""
Check whether EIA has published a newer Annual Energy Outlook than the one
currently ingested, and print what to do about it.

EIA republishes the AEO roughly once a year. There is no dedicated "latest
AEO version" API, so this scrapes the public AEO landing page for the
newest "AEO20XX" year mentioned there and compares it against whichever
year scripts/ingest.py last recorded in MongoDB's _ingestion_meta
collection (falls back to lib/dataVintage.ts's AEO_YEAR if Mongo is
unreachable or empty).

This is a best-effort heuristic, not an authoritative EIA API: if EIA
changes the page's markup, or the sandbox/host running this has no
outbound network access, freshness cannot be determined and the script
says so explicitly rather than guessing. Wire this into a monthly cron/CI
job and act on its exit code (0 = current or unknown, 1 = a newer AEO
year was found) -- don't rely on someone remembering to check EIA by hand.

Usage:
    python scripts/check_aeo_freshness.py
"""

from __future__ import annotations

import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ingest  # reuse env loading, MongoClient setup

EIA_AEO_LANDING_PAGE = "https://www.eia.gov/outlooks/aeo/"
REQUEST_TIMEOUT_SECONDS = 15
AEO_YEAR_PATTERN = re.compile(r"AEO\s?(20\d{2})", re.IGNORECASE)


def get_currently_ingested_year(client, db_name: str) -> int | None:
    """Prefer the live ingestion record; fall back to the frontend constant."""
    try:
        doc = client[db_name]["_ingestion_meta"].find_one({"source": "aeo"})
        if doc and doc.get("filename"):
            match = re.search(r"(\d{4})", doc["filename"])
            if match:
                return int(match.group(1))
    except Exception as exc:  # noqa: BLE001 -- any Mongo issue just means "unknown", not fatal
        print(f"  [warn] could not read _ingestion_meta: {exc}", file=sys.stderr)

    repo_root = Path(__file__).resolve().parent.parent
    vintage_path = repo_root / "lib" / "dataVintage.ts"
    if vintage_path.exists():
        match = re.search(r"AEO_YEAR = (\d+);", vintage_path.read_text())
        if match:
            return int(match.group(1))
    return None


def get_latest_published_year() -> int | None:
    """Best-effort scrape of the EIA AEO landing page for the newest AEO year mentioned."""
    request = urllib.request.Request(EIA_AEO_LANDING_PAGE, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            html = response.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"  [warn] could not reach {EIA_AEO_LANDING_PAGE}: {exc}", file=sys.stderr)
        return None

    years = [int(y) for y in AEO_YEAR_PATTERN.findall(html)]
    return max(years) if years else None


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    ingest.load_dotenv_if_present(repo_root)
    db_name = os.environ.get("MONGO_DB_NAME", "energy_explorer")
    mongo_uri = os.environ.get("MONGO_URI")

    current_year: int | None = None
    if mongo_uri:
        try:
            client = ingest.get_mongo_client(mongo_uri)
            current_year = get_currently_ingested_year(client, db_name)
        except SystemExit:
            pass  # get_mongo_client already printed a clear connection error

    if current_year is None:
        vintage_path = repo_root / "lib" / "dataVintage.ts"
        if vintage_path.exists():
            match = re.search(r"AEO_YEAR = (\d+);", vintage_path.read_text())
            current_year = int(match.group(1)) if match else None

    if current_year is None:
        sys.exit(
            "Could not determine the currently ingested AEO year "
            "(MongoDB unreachable and lib/dataVintage.ts missing/unreadable)."
        )

    print(f"Currently ingested: AEO{current_year}")

    latest_year = get_latest_published_year()
    if latest_year is None:
        print("Could not determine the latest published AEO year (network unreachable or page changed).")
        print("Check https://www.eia.gov/outlooks/aeo/ manually.")
        return  # exit 0 -- "unknown" is not the same as "stale"

    print(f"Latest published (per {EIA_AEO_LANDING_PAGE}): AEO{latest_year}")

    if latest_year > current_year:
        print(
            f"\nSTALE: AEO{latest_year} is available but AEO{current_year} is what's ingested.\n"
            f"  1. Download the new bulk file from EIA and save it as data/AEO{latest_year}.txt\n"
            f"     (the old AEO{current_year}.txt can stay -- ingest.py picks the newest year present).\n"
            "  2. Run: python scripts/ingest.py --only aeo\n"
            "  3. Frontend copy (lib/dataVintage.ts) is updated automatically by that run.\n"
        )
        sys.exit(1)

    print("Up to date.")


if __name__ == "__main__":
    main()
