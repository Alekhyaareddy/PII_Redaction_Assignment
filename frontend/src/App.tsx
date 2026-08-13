import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react'

const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')).replace(/\/$/, '')
const MAX_FILE_SIZE = 10 * 1024 * 1024

const summaryLabels: Record<string, string> = {
  name: 'Names',
  email: 'Emails',
  phone: 'Phone Numbers',
  company: 'Companies',
  address: 'Addresses',
  ssn: 'SSNs',
  card: 'Credit Cards',
  dob: 'Dates of Birth',
  ip: 'IP Addresses',
}

type Summary = {
  name: number
  email: number
  phone: number
  company: number
  address: number
  ssn: number
  card: number
  dob: number
  ip: number
}

type AppState = 'idle' | 'selected' | 'invalid' | 'processing' | 'success' | 'error'

const emptySummary: Summary = {
  name: 0,
  email: 0,
  phone: 0,
  company: 0,
  address: 0,
  ssn: 0,
  card: 0,
  dob: 0,
  ip: 0,
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / 1024 ** index
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

export default function App() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [status, setStatus] = useState<AppState>('idle')
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [downloadUrl, setDownloadUrl] = useState<string>('')
  const [jobId, setJobId] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)

  const summaryCards = useMemo(
    () => Object.entries(summaryLabels).map(([key, label]) => ({ key, label, value: summary[key as keyof Summary] })),
    [summary],
  )

  const resetToUpload = () => {
    setFile(null)
    setError('')
    setStatus('idle')
    setSummary(emptySummary)
    setDownloadUrl('')
    setJobId('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFileSelection = (incoming: File | null) => {
    setError('')

    if (!incoming) {
      setFile(null)
      setStatus('idle')
      return
    }

    if (incoming.name.toLowerCase().endsWith('.docx') === false) {
      setFile(null)
      setError('Only DOCX files are supported.')
      setStatus('invalid')
      return
    }

    if (incoming.size === 0) {
      setFile(null)
      setError('Uploaded file is empty.')
      setStatus('invalid')
      return
    }

    if (incoming.size > MAX_FILE_SIZE) {
      setFile(null)
      setError('File exceeds the maximum allowed size.')
      setStatus('invalid')
      return
    }

    setFile(incoming)
    setStatus('selected')
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    handleFileSelection(selected)
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const selected = event.dataTransfer.files?.[0] ?? null
    handleFileSelection(selected)
  }

  const handleProcessDocument = async () => {
    if (!file) {
      setError('Please choose a DOCX file to continue.')
      setStatus('invalid')
      return
    }

    if (!API_URL) {
      setError('Application API URL is not configured.')
      setStatus('error')
      return
    }

    setStatus('processing')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_URL}/redact`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const message = payload.detail || 'Something went wrong while processing the document. Please try again.'
        throw new Error(message)
      }

      const payload = await response.json()
      setJobId(payload.job_id)
      setSummary(payload.summary || emptySummary)
      setStatus('success')
      setDownloadUrl(`${API_URL}/download/${payload.job_id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong while processing the document. Please try again.'
      setError(message)
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen text-slate-100">
      <header className="mx-auto max-w-7xl px-6 py-6">
        <nav className="flex items-center justify-between rounded-full border border-slate-700/80 bg-slate-900/70 px-5 py-3 shadow-glow backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-bold text-slate-950">R</div>
            <div>
              <div className="text-lg font-semibold">RedactAI</div>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#home" className="transition hover:text-white">Home</a>
            <a href="#how-it-works" className="transition hover:text-white">How It Works</a>
            <a href="#security" className="transition hover:text-white">Security</a>
            <a href="#about" className="transition hover:text-white">About</a>
          </div>

          <button
            type="button"
            className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            onClick={() => inputRef.current?.click()}
          >
            Upload Document
          </button>
        </nav>
      </header>

      <main id="home" className="mx-auto max-w-7xl px-6 pb-24">
        <section className="grid gap-12 pb-20 pt-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
              Secure document processing
            </div>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight text-white md:text-6xl">
              Protect Sensitive Information Before It Leaves Your Hands.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              Automatically detect and redact personally identifiable information from DOCX documents.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full bg-cyan-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Upload Document
              </button>
              <a
                href="#how-it-works"
                className="rounded-full border border-slate-600 bg-slate-900/50 px-6 py-3 text-base font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                How It Works
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-5 shadow-glow backdrop-blur">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-5">
              <div className="mb-5 flex items-center justify-between text-sm text-slate-300">
                <span>Workflow</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300">Secure</span>
              </div>

              <div className="space-y-4">
                {['Original Document', 'PII Detection', 'Secure Redaction', 'Redacted Document'].map((step, index, arr) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 text-sm font-semibold text-cyan-300">
                      {index + 1}
                    </div>
                    <div className="flex-1 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">{step}</div>
                    {index !== arr.length - 1 && <span className="text-slate-500">↓</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6 shadow-glow">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Document upload</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Upload a document for secure redaction</h2>
            </div>
            <button
              type="button"
              onClick={resetToUpload}
              className="rounded-full border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Reset
            </button>
          </div>

          <label
            htmlFor="doc-upload"
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
              isDragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-600 bg-slate-950/50 hover:border-cyan-500/70'
            } ${status === 'processing' ? 'pointer-events-none opacity-80' : ''}`}
          >
            <input
              id="doc-upload"
              ref={inputRef}
              type="file"
              accept=".docx"
              onChange={handleInputChange}
              aria-label="Upload a DOCX document"
            />

            {!file && status !== 'processing' && (
              <>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-2xl">📄</div>
                <p className="text-xl font-semibold text-white">Drag & drop your DOCX here</p>
                <p className="mt-2 text-slate-400">or browse files</p>
              </>
            )}

            {file && status !== 'processing' && (
              <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-left">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-medium text-white">{file.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{formatBytes(file.size)} · DOCX</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      setFile(null)
                      setStatus('idle')
                    }}
                    className="rounded-full border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {status === 'processing' && (
              <div className="space-y-4 text-center">
                <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
                <div>
                  <p className="text-lg font-semibold text-white">Analyzing document...</p>
                  <p className="mt-1 text-slate-300">Detecting sensitive information...</p>
                  <p className="mt-1 text-slate-400">Generating redacted document...</p>
                </div>
              </div>
            )}
          </label>

          {(error || status === 'invalid' || status === 'error') && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">
              <strong className="font-semibold">Error:</strong> {error || 'Only DOCX files are supported.'}
            </div>
          )}

          {status === 'success' && (
            <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
              Redaction completed successfully.
            </div>
          )}

          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleProcessDocument}
              disabled={!file || status === 'processing'}
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-7 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Redact Document
            </button>
            <p className="text-sm text-slate-400">Your document is processed for redaction and is not intended to be permanently stored.</p>
          </div>
        </section>

        {status === 'success' && (
          <section className="mt-14 rounded-3xl border border-slate-700 bg-slate-900/60 p-6 shadow-glow">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Summary</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Your document is ready.</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-emerald-400 px-5 py-3 text-base font-semibold text-slate-950 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Download Redacted Document
                </a>
                <button
                  type="button"
                  onClick={resetToUpload}
                  className="rounded-full border border-slate-600 bg-slate-800/80 px-5 py-3 text-base font-semibold text-slate-100 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Redact Another Document
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map((item) => (
                <div key={item.key} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                  <div className="text-sm text-slate-400">{item.label}</div>
                  <div className="mt-2 text-3xl font-bold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="how-it-works" className="mt-20">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">How it works</p>
            <h2 className="mt-3 text-3xl font-bold text-white">A simple workflow for safer document handling</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['1. Upload', 'Upload your DOCX document securely.'],
              ['2. Detect', 'The application scans for supported PII patterns.'],
              ['3. Redact', 'Detected information is replaced with safe placeholders.'],
              ['4. Download', 'Download the sanitized document.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 shadow-glow">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-sm font-semibold text-cyan-300">{title.split('.')[0]}</div>
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                <p className="mt-3 text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Supported PII</p>
            <h2 className="mt-3 text-3xl font-bold text-white">Multiple identifier types covered</h2>
            <ul className="mt-6 space-y-3 text-slate-300">
              {['Person names', 'Email addresses', 'Phone numbers', 'Physical addresses', 'Company names', 'Credit card numbers', 'SSNs', 'Dates of birth', 'IP addresses'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-slate-400">
              Detection uses a combination of pattern-based rules and NLP-based person/entity recognition to reduce false positives while flagging common sensitive content.
            </p>
          </div>

          <div id="security" className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Security</p>
            <h2 className="mt-3 text-3xl font-bold text-white">Designed for temporary, server-side processing</h2>
            <ul className="mt-6 space-y-4 text-slate-300">
              <li>Temporary processing with isolated working directories.</li>
              <li>No permanent document storage is implemented.</li>
              <li>Server-side processing keeps the document off the browser.</li>
              <li>File type and size validation are enforced before processing.</li>
              <li>Temporary files are cleaned up after the download job is created.</li>
            </ul>
          </div>
        </section>

        <section id="about" className="mt-20 rounded-3xl border border-slate-700 bg-slate-900/60 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">About</p>
          <h2 className="mt-3 text-3xl font-bold text-white">Built for secure document workflows</h2>
          <p className="mt-4 max-w-3xl text-slate-300">
            RedactAI helps teams process internal documents before sharing them externally. It focuses on common personally identifiable information while keeping the workflow simple, transparent, and practical for real-world use.
          </p>
        </section>
      </main>
    </div>
  )
}
