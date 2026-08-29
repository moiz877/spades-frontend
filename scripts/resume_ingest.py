#!/usr/bin/env python3
"""
Check ingestion progress against MongoDB and automatically re-run
scripts/ingest.py for any source (aeo/ieo) that isn't fully loaded yet.

Safe to run after every restart or network interruption: ingestion is
idempotent (upsert keyed on series_id), so this never double-writes,
it just resumes wherever the data actually stands right now.

Usage:
    python scripts/resume_ingest.py
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ingest  # reuse env loading, MongoClient setup, SOURCES

# A few lines may legitimately be skipped (missing series_id) without that
# meaning ingestion is incomplete -- tolerate a small gap before flagging.
SKIP_TOLERANCE = 25


def count_lines(path: Path) -> int:
    """Count non-blank lines in a source file -- the true expected doc count."""
    count = 0
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                count += 1
    return count


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    ingest.load_dotenv_if_present(repo_root)

    mongo_uri = os.environ.get("MONGO_URI")
    if not mongo_uri:
        sys.exit("MONGO_URI is not set. Copy .env.example to .env and set it, then re-run.")

    db_name = os.environ.get("MONGO_DB_NAME", "energy_explorer")
    data_dir = Path(os.environ.get("DATA_DIR", str(repo_root / "data")))

    print("Connecting to MongoDB...")
    client = ingest.get_mongo_client(mongo_uri)
    db = client[db_name]

    incomplete_sources: list[str] = []

    for key, (static_filename, collection_name) in ingest.SOURCES.items():
        if key == "aeo":
            try:
                path, _ = ingest.find_aeo_file(data_dir)
            except SystemExit:
                print(f"[skip] no AEO<year>.txt found in {data_dir}, cannot check this source.")
                continue
        else:
            path = data_dir / static_filename
            if not path.exists():
                print(f"[skip] {static_filename} not found in {data_dir}, cannot check this source.")
                continue

        print(f"Counting lines in {path.name}...")
        expected = count_lines(path)
        actual = db[collection_name].count_documents({})
        gap = expected - actual
        is_complete = gap <= SKIP_TOLERANCE

        status = "COMPLETE" if is_complete else "INCOMPLETE"
        print(f"  {collection_name}: {actual:,} in MongoDB / {expected:,} expected  [{status}]")

        if not is_complete:
            incomplete_sources.append(key)

    if not incomplete_sources:
        print("\nAll sources fully ingested. Nothing to do.")
        return

    for key in incomplete_sources:
        print(f"\nResuming ingestion for '{key}'...")
        result = subprocess.run([sys.executable, str(Path(__file__).parent / "ingest.py"), "--only", key])
        if result.returncode != 0:
            sys.exit(
                f"\ningest.py exited with an error for '{key}' (code {result.returncode}). "
                "Re-run this script to retry -- ingestion is safe to resume."
            )

    print("\nDone. Run this script again any time to double-check final counts.")


if __name__ == "__main__":
    main()
