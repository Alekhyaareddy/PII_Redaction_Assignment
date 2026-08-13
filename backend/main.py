import os
import shutil
import tempfile
import threading
import uuid
import zipfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from src.redactor import get_redaction_summary, redact_document

MAX_FILE_SIZE = 10 * 1024 * 1024
UPLOAD_CHUNK_SIZE = 1024 * 1024
JOB_TTL_SECONDS = 3600
JOB_STORE: dict[str, dict] = {}

app = FastAPI(title="RedactAI API", version="1.0.0")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://pii-redaction-assignment.vercel.app",
]
for env_origin in (os.getenv("FRONTEND_ORIGIN") or "").split(","):
    cleaned = env_origin.strip()
    if cleaned:
        allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def cleanup_job(job_id: str) -> None:
    job = JOB_STORE.pop(job_id, None)
    if not job:
        return

    temp_dir = job.get("temp_dir")
    if temp_dir:
        try:
            for path in list(Path(temp_dir).glob("*")):
                if path.is_file() or path.is_symlink():
                    path.unlink(missing_ok=True)
                elif path.is_dir():
                    for nested in list(path.rglob("*")):
                        if nested.is_file() or nested.is_symlink():
                            nested.unlink(missing_ok=True)
                        elif nested.is_dir():
                            nested.rmdir()
                    path.rmdir()
            Path(temp_dir).rmdir()
        except Exception:
            pass


def build_download_name(original_name: str) -> str:
    candidate = Path(original_name).stem
    safe_name = (candidate or "redacted_document").strip()
    return f"{safe_name}_redacted.docx" if safe_name else "redacted_document.docx"


def validate_docx_file(path: Path) -> bool:
    try:
        with zipfile.ZipFile(path) as archive:
            names = set(archive.namelist())
            required = {"[Content_Types].xml", "word/document.xml"}
            return required.issubset(names)
    except (zipfile.BadZipFile, OSError):
        return False


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "PII Redaction API"}


@app.get("/health")
def health() -> dict:
    return {"status": "healthy"}


@app.post("/redact")
async def redact_uploaded_document(file: UploadFile = File(...)) -> dict:
    if not file:
        raise HTTPException(status_code=400, detail="No file was uploaded.")

    temp_dir = Path(tempfile.mkdtemp(prefix="redactai_"))
    input_path = temp_dir / "uploaded_document.docx"
    output_path = temp_dir / "redacted_document.docx"

    try:
        file_size = 0
        with input_path.open("wb") as destination:
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail="File exceeds the maximum allowed size.")
                destination.write(chunk)

        if file_size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        original_name = file.filename or "document.docx"
        if not original_name.lower().endswith(".docx"):
            raise HTTPException(status_code=400, detail="Only DOCX files are supported.")

        if not validate_docx_file(input_path):
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid DOCX document.")

        redact_document(input_path, output_path)
        summary = get_redaction_summary()

        job_id = uuid.uuid4().hex
        JOB_STORE[job_id] = {
            "temp_dir": str(temp_dir),
            "output_path": str(output_path),
            "filename": build_download_name(original_name),
            "summary": summary,
        }

        timer = threading.Timer(JOB_TTL_SECONDS, cleanup_job, args=(job_id,))
        timer.daemon = True
        timer.start()

        return {
            "job_id": job_id,
            "filename": JOB_STORE[job_id]["filename"],
            "summary": summary,
            "message": "Redaction completed successfully.",
        }
    except HTTPException:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Something went wrong while processing the document. Please try again.",
        )


@app.get("/download/{job_id}")
def download_redacted_document(job_id: str) -> FileResponse:
    job = JOB_STORE.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Requested document not found.")

    output_path = job["output_path"]
    if not Path(output_path).exists():
        raise HTTPException(status_code=404, detail="Redacted document is no longer available.")

    return FileResponse(
        path=output_path,
        filename=job["filename"],
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
