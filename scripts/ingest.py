#!/usr/bin/env python3
"""
Ingest EIA AEO2026 / IEO bulk JSON-lines data into MongoDB.

Streams /data/AEO2026.txt -> aeo_series and /data/IEO.txt -> ieo_series,
line by line (never loads either file fully into memory), bulk-upserting
by series_id in batches. Safe to re-run: every write is an upsert keyed
on series_id, so running this twice does not create duplicates.

Usage:
    python scripts/ingest.py
    python scripts/ingest.py --only aeo        # just AEO2026.txt
    python scripts/ingest.py --only ieo        # just IEO.txt
    python scripts/ingest.py --data-dir /path  # override the data dir (default: ./data)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Iterator

from pymongo import ASCENDING, MongoClient, TEXT, UpdateOne
from pymongo.errors import ConfigurationError, PyMongoError

BATCH_SIZE = 1000
LOG_EVERY = 5000

SOURCES = {
    "aeo": ("AEO2026.txt", "aeo_series"),
    "ieo": ("IEO.txt", "ieo_series"),
}


def get_mongo_client(mongo_uri: str) -> MongoClient:
    """Connect to MongoDB, failing fast with a clear message if it's unreachable."""
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        return client
    except (PyMongoError, ConfigurationError) as exc:
        sys.exit(
            "\nCould not connect to MongoDB.\n"
            f"  MONGO_URI = {mongo_uri!r}\n"
            f"  error: {exc}\n\n"
            "Setup instructions:\n"
            "  1. Make sure MongoDB is installed and running (e.g. `mongod` locally,\n"
            "     or a connection string to Atlas / a hosted cluster).\n"
            "  2. Set MONGO_URI in your .env file, e.g.:\n"
            "       MONGO_URI=mongodb://localhost:27017\n"
            "  3. Re-run: python scripts/ingest.py\n"
        )


def load_dotenv_if_present(repo_root: Path) -> None:
    """Minimal .env loader (avoids adding python-dotenv as a hard dependency)."""
    env_path = repo_root / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def parse_data_points(raw_data: list[list[Any]]) -> list[dict[str, Any]]:
    """
    Normalize the raw `data` array of [year_string, value] pairs (sometimes
    descending by year, "- -" used as a missing-value placeholder) into a
    list of {"year": int, "value": float | None} sorted ascending by year.
    """
    points: list[dict[str, Any]] = []
    for entry in raw_data:
        if not entry or len(entry) < 2:
            continue
        year_raw, value_raw = entry[0], entry[1]
        try:
            year = int(str(year_raw).strip())
        except (TypeError, ValueError):
            continue

        if value_raw is None or (isinstance(value_raw, str) and value_raw.strip() in ("- -", "--", "")):
            value: float | None = None
        else:
            try:
                value = float(value_raw)
            except (TypeError, ValueError):
                value = None

        points.append({"year": year, "value": value})

    points.sort(key=lambda p: p["year"])
    return points


def build_document(line_obj: dict[str, Any]) -> dict[str, Any] | None:
    """Transform one raw JSON-line record into the document we store."""
    series_id = line_obj.get("series_id")
    if not series_id:
        return None

    category_path = series_id.split(".")
    data_points = parse_data_points(line_obj.get("data") or [])

    return {
        "series_id": series_id,
        "name": line_obj.get("name"),
        "units": line_obj.get("units"),
        "frequency": line_obj.get("f"),
        "description": line_obj.get("description"),
        "start": line_obj.get("start"),
        "end": line_obj.get("end"),
        "last_historical_period": line_obj.get("lastHistoricalPeriod"),
        "last_updated": line_obj.get("last_updated"),
        "category_path": category_path,
        "data": data_points,
    }


def iter_json_lines(path: Path) -> Iterator[dict[str, Any]]:
    """Stream a JSON-lines file, skipping malformed lines with a warning."""
    with path.open("r", encoding="utf-8") as f:
        for line_num, raw_line in enumerate(f, start=1):
            line = raw_line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                print(f"  [warn] {path.name}:{line_num} skipped, invalid JSON ({exc})", file=sys.stderr)


def ingest_file(client: MongoClient, db_name: str, data_dir: Path, key: str) -> None:
    filename, collection_name = SOURCES[key]
    path = data_dir / filename

    if not path.exists():
        sys.exit(
            f"\nData file not found: {path}\n"
            f"Expected {filename} in {data_dir}. Place the EIA bulk file there and re-run.\n"
        )

    db = client[db_name]
    collection = db[collection_name]

    print(f"\n=== Ingesting {filename} -> {db_name}.{collection_name} ===")

    ops: list[UpdateOne] = []
    total = 0
    upserted = 0
    modified = 0
    skipped = 0

    for line_obj in iter_json_lines(path):
        doc = build_document(line_obj)
        if doc is None:
            skipped += 1
            continue

        ops.append(
            UpdateOne({"series_id": doc["series_id"]}, {"$set": doc}, upsert=True)
        )
        total += 1

        if len(ops) >= BATCH_SIZE:
            result = collection.bulk_write(ops, ordered=False)
            upserted += result.upserted_count
            modified += result.modified_count
            ops = []

        if total % LOG_EVERY == 0:
            print(f"  ...{total:,} lines processed")

    if ops:
        result = collection.bulk_write(ops, ordered=False)
        upserted += result.upserted_count
        modified += result.modified_count

    print(
        f"Done: {total:,} lines processed, {upserted:,} inserted, "
        f"{modified:,} updated, {skipped:,} skipped (missing series_id)."
    )

    print("Ensuring indexes...")
    collection.create_index([("name", TEXT)], name="name_text")
    collection.create_index([("series_id", ASCENDING)], name="series_id_idx", unique=True)
    collection.create_index([("category_path", ASCENDING)], name="category_path_idx")
    print("Indexes ready: name_text (text), series_id_idx (unique), category_path_idx.")


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    load_dotenv_if_present(repo_root)

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", choices=["aeo", "ieo"], help="Ingest only one source.")
    parser.add_argument(
        "--data-dir",
        default=os.environ.get("DATA_DIR", str(repo_root / "data")),
        help="Directory containing AEO2026.txt / IEO.txt (default: ./data).",
    )
    parser.add_argument(
        "--db-name",
        default=os.environ.get("MONGO_DB_NAME", "energy_explorer"),
        help="MongoDB database name (default: energy_explorer).",
    )
    args = parser.parse_args()

    mongo_uri = os.environ.get("MONGO_URI")
    if not mongo_uri:
        sys.exit(
            "\nMONGO_URI is not set.\n\n"
            "Setup instructions:\n"
            "  1. Copy .env.example to .env in the project root.\n"
            "  2. Set MONGO_URI, e.g.:\n"
            "       MONGO_URI=mongodb://localhost:27017\n"
            "  3. Re-run: python scripts/ingest.py\n"
        )

    client = get_mongo_client(mongo_uri)
    data_dir = Path(args.data_dir)

    keys = [args.only] if args.only else list(SOURCES.keys())
    for key in keys:
        ingest_file(client, args.db_name, data_dir, key)

    print("\nIngestion complete.")


if __name__ == "__main__":
    main()
