# RedactAI

RedactAI is a security-focused DOCX redaction application built around an existing Python PII detection engine. It lets a user upload a document, run detection for common sensitive identifiers, and download a sanitized .docx file without storing the original document permanently.

## Project overview

This project combines a Python backend with a React + Vite frontend. The backend keeps the existing redaction engine in `src/redactor.py` as the source of truth and exposes a FastAPI API for document upload and redaction. The frontend is a polished SaaS-style interface for a secure document workflow.

## Features

- DOCX upload with validation for file type and size
- Server-side redaction using the existing Python engine
- Supported PII categories: names, emails, phone numbers, company names, addresses, SSNs, credit cards, DOBs, and IPs
- Downloadable redacted .docx output
- Temporary document handling and cleanup
- Modern React front-end with a responsive design

## Supported PII

The tool detects and redacts the following categories:

- Person names
- Email addresses
- Phone numbers
- Physical addresses
- Company names
- Credit card numbers
- SSNs
- Dates of birth
- IP addresses

Detection uses a hybrid of regex-based rules and spaCy NER, with a built-in guard to avoid over-redacting unrelated text.

## Architecture

- Python engine: `src/redactor.py`
- API: `backend/main.py`
- Frontend: `frontend/`
- Deployment model: frontend on Vercel, backend on a Python hosting platform such as Render or Railway for the document-processing API

## Project structure

```text
PII_Redaction_Assignment/
├── backend/
│   ├── __init__.py
│   └── main.py
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── src/
│   ├── __init__.py
│   └── redactor.py
├── input/
├── output/
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
└── vercel.json
```

## Local setup

1. Create and activate a virtual environment.
2. Install Python dependencies.
3. Install the spaCy English model.
4. Install frontend dependencies.
5. Run the backend and frontend locally.

## Installing Python dependencies

```bash
python -m venv .venv
. .venv/bin/activate  # Linux/macOS
# or .venv\Scripts\activate  # Windows PowerShell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Installing spaCy model

```bash
python -m spacy download en_core_web_sm
```

The application checks for this model at runtime and returns a clear error if it is missing.

## Running backend

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## Running frontend

From the `frontend/` directory:

```bash
npm install
cp .env.example .env  # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Set the API value in `.env` when needed:

```bash
VITE_API_URL=http://localhost:8000
```

## Environment variables

- `VITE_API_URL`: frontend API base URL. It is required for production builds and must be set in Vercel to the public backend URL, without a trailing slash.
- `FRONTEND_ORIGIN`: comma-separated CORS origin list for the backend. Set it on the backend host to the exact Vercel frontend origin(s), for example `https://redactai.vercel.app`.

## Testing

### Backend checks

```bash
python -c "from fastapi.testclient import TestClient; from backend.main import app; client = TestClient(app); print(client.get('/').json()); print(client.get('/health').json())"
```

### Redaction regression check

```bash
python -c "from pathlib import Path; from src.redactor import redact_document, reset_counters; in_file=Path('input/Red Herring Prospectus.docx'); out_file=Path('output/redacted_prospectus.docx'); reset_counters(); redact_document(in_file, out_file); print(out_file.exists(), out_file.stat().st_size)"
```

### Frontend build

```bash
cd frontend
npm run build
```

## Building frontend

```bash
cd frontend
npm run build
```

## Deployment

This repository is structured for a practical deployment split:

- Frontend: Vercel
- Backend: Render, Railway, or another Python host with a persistent runtime

Because the Python service must process DOCX files and load spaCy, direct serverless-only deployment on Vercel is not the most reliable option for this workflow. The app is therefore deployment-ready with a clean API boundary and environment variable configuration for a hosted backend.

## Vercel deployment

1. Deploy the FastAPI backend to Render or Railway first, using the build and start commands below.
2. Set `FRONTEND_ORIGIN` on the backend to the Vercel production URL after it is assigned.
3. Create a Vercel project from this repository using the repository root; `vercel.json` builds `frontend/` and publishes `frontend/dist`.
4. Set Vercel's `VITE_API_URL` to the public backend URL, then deploy the frontend.
5. Add the Vercel preview URL(s) to `FRONTEND_ORIGIN` only if preview deployments must call the production backend.

Example:

```json
{
  "framework": "vite",
  "buildCommand": "cd frontend && npm ci && npm run build",
  "outputDirectory": "frontend/dist"
}
```

## Security considerations

- Uploaded documents are validated as `.docx` files before processing.
- Files are stored in temporary directories only.
- The application does not permanently store user documents.
- Temporary output files are cleaned up on a timer after use.
- The frontend does not display original PII content.

## Limitations

- PII detection is not perfect and may still have false positives or false negatives in edge cases.
- The implementation intentionally avoids claiming legal compliance guarantees.
- The redaction engine is designed for document-processing workflows rather than high-scale production data pipelines.

## Example API usage

```bash
curl -X POST http://localhost:8000/redact \
  -F "file=@example.docx"
```

Then use the returned job ID to download the output:

```bash
curl -L http://localhost:8000/download/<job_id> -o redacted_output.docx
```
