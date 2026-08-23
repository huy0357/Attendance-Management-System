from pathlib import Path
import logging

from fastapi import APIRouter, HTTPException, Query, Header
from fastapi.responses import FileResponse
from app.connectors.ams_backend import AmsBackendClient

router = APIRouter(tags=["exports"])
logger = logging.getLogger(__name__)

EXPORTS_DIR = Path(__file__).resolve().parent.parent.parent / "exports"


@router.get("/exports/{filename}")
async def download_export(
    filename: str,
    token: str | None = Query(None),
    authorization: str | None = Header(default=None)
):
    """Serve a generated CSV export file for download."""
    auth_token = authorization or token
    if not auth_token:
        raise HTTPException(status_code=401, detail="Unauthorized: Missing token")

    auth_token = auth_token.strip()
    if auth_token.startswith("Bearer "):
        raw_token = auth_token[7:].strip()
    else:
        raw_token = auth_token

    try:
        ams = AmsBackendClient()
        user = await ams.get_me(raw_token)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")
    except Exception as exc:
        logger.warning(f"Export download unauthorized: {exc}")
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Security: only allow .csv files, no path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")

    filepath = EXPORTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found or expired")

    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
