"""
PDF generation microservice for the "Export to TEA Report" feature.
Deployed separately from the Next.js app (Railway/Render), since LaTeX
compilation needs a persistent binary (Tectonic) that serverless Node
functions don't provide.
"""
import os
import subprocess
import tempfile
import hashlib
import hmac
from datetime import datetime

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from jinja2 import Environment, FileSystemLoader
from pymongo import MongoClient

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")

_LATEX_SPECIAL_CHARS = {
    "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_",
    "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}",
    "\\": r"\textbackslash{}",
}


def latex_escape(value: str) -> str:
    """
    Escape LaTeX special characters in user/data-supplied strings before
    rendering. series_id in particular is guaranteed to contain underscores
    (e.g. PRCE_OTC_ELEP_NA...), which LaTeX otherwise reads as a subscript
    operator outside math mode and fails to compile on.
    """
    return "".join(_LATEX_SPECIAL_CHARS.get(ch, ch) for ch in str(value))


app = FastAPI()

# Allow the Next.js app's origin(s) to call this service directly from the
# browser. Restrict this in production to the deployed frontend's real URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["POST"],
    allow_headers=["Content-Type", "X-Lead-Token"],
)


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"{name} is not set. Copy .env.example to .env in pdf-service/ and set {name}."
        )
    return value


MONGO_URI = _require_env("MONGO_URI")
LEAD_TOKEN_SECRET = _require_env("LEAD_TOKEN_SECRET")  # separate from the EIA key, never reused

mongo = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = mongo[os.environ.get("MONGO_DB_NAME", "energy_explorer")]


# --- Shared ROI formula -----------------------------------------------------
# CRITICAL: this must produce IDENTICAL numbers to the frontend's
# lib/roiCalculations.ts. If these two drift, the chart the user saw and
# the PDF they downloaded will disagree, an instant credibility loss with
# a CFO-literate reviewer. Keep both files' formulas commented with this
# same explanation so future edits to one prompt an edit to the other.
def calculate_roi_delta(data_points: list[dict], consumption_mwh: float, current_year: int, horizon_years: int = 10):
    """
    data_points: [{"year": int, "value": float}]  -- value assumed $/MWh
    Returns list of {"year", "baseline_cost", "projected_cost", "delta"}
    baseline_cost = consumption held flat at current_year's price
    projected_cost = consumption * that year's EIA-projected price
    delta = projected_cost - baseline_cost
    """
    by_year = {d["year"]: d["value"] for d in data_points if d.get("value") is not None}
    if current_year not in by_year:
        raise ValueError(f"No price data for base year {current_year}")
    base_price = by_year[current_year]
    baseline_annual_cost = consumption_mwh * base_price

    results = []
    for year in range(current_year, current_year + horizon_years + 1):
        if year not in by_year:
            continue
        projected_price = by_year[year]
        projected_cost = consumption_mwh * projected_price
        results.append({
            "year": year,
            "baseline_cost": round(baseline_annual_cost, 2),
            "projected_cost": round(projected_cost, 2),
            "delta": round(projected_cost - baseline_annual_cost, 2),
        })
    return results


def verify_lead_token(token: str) -> dict:
    """Server-side verification — this is what actually enforces the gate.
    Token format: base64(email).hmac_signature, issued by /api/leads."""
    try:
        payload, signature = token.rsplit(".", 1)
        expected_sig = hmac.new(LEAD_TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            raise ValueError("bad signature")
        lead = db.leads.find_one({"token_payload": payload})
        if not lead:
            raise ValueError("no matching lead record")
        return lead
    except Exception:
        raise HTTPException(status_code=403, detail="Valid lead capture required to export reports.")


class ExportRequest(BaseModel):
    series_id: str
    series_name: str
    units: str
    data_points: list[dict]        # [{"year": int, "value": float | None}]
    consumption_mwh: float
    plant_name: str = "Your Facility"
    current_year: int = datetime.now().year


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate-tea-report")
def generate_tea_report(req: ExportRequest, x_lead_token: str = Header(...)):
    lead = verify_lead_token(x_lead_token)  # raises 403 if invalid — the actual gate

    try:
        roi_table = calculate_roi_delta(req.data_points, req.consumption_mwh, req.current_year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    ten_yr_delta = sum(r["delta"] for r in roi_table)

    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))
    env.filters["latex_escape"] = latex_escape
    template = env.get_template("tea_report.tex.jinja")
    tex_source = template.render(
        plant_name=latex_escape(req.plant_name),
        series_name=latex_escape(req.series_name),
        units=latex_escape(req.units),
        generated_date=datetime.now().strftime("%B %d, %Y"),
        roi_table=roi_table,
        ten_yr_delta=ten_yr_delta,
        consumption_mwh=req.consumption_mwh,
        series_id=latex_escape(req.series_id),
        lead_company=latex_escape(lead.get("company_name", "")),
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "report.tex")
        with open(tex_path, "w") as f:
            f.write(tex_source)

        result = subprocess.run(
            ["tectonic", tex_path, "--outdir", tmpdir],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"LaTeX compilation failed: {result.stderr[-500:]}")

        pdf_path = os.path.join(tmpdir, "report.pdf")
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

    # Log which report a lead pulled — this is sales gold: you now know their
    # exact pain point (which series, what delta) before you ever call them.
    db.leads.update_one(
        {"_id": lead["_id"]},
        {"$push": {"exports": {"series_id": req.series_id, "ten_yr_delta": ten_yr_delta, "at": datetime.now()}}}
    )

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="TEA_Report_{req.series_id}.pdf"'}
    )
