/**
 * Single source of truth for which AEO vintage is currently ingested.
 * EIA republishes the Annual Energy Outlook roughly once a year (a new
 * AEO2027.txt, etc.) -- bump this the same time scripts/ingest.py is
 * re-run against the new bulk file, instead of hunting down every
 * hardcoded "AEO2026" string across the UI.
 */
export const AEO_YEAR = 2026;
export const AEO_LABEL = `AEO${AEO_YEAR}`;
