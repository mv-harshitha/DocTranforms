import { useRef, useState } from 'react'

const BACKEND_URL = 'http://127.0.0.1:8000'
const UPLOAD_TIMEOUT_MS = 60000
const TRANSFORM_TIMEOUT_MS = 120000

const operations = [
  ['summarize', 'Summarize', 'Create a clear, concise overview.'],
  ['rewrite', 'Rewrite', 'Improve clarity while preserving meaning.'],
  ['extract_information', 'Extract Information', 'Find key facts and important details.'],
  ['classify_document', 'Classify Document', 'Identify the document type and purpose.'],
  ['custom_transform', 'Custom Transform', 'Apply your own instructions.'],
  ['action_intelligence', 'Action Intelligence', 'Find actions, owners, and next steps.'],
]

const sampleDocs = [
  ['Project proposal.pdf', 'PDF', 'Ready'],
  ['Team meeting notes.docx', 'DOCX', 'Ready'],
  ['Research brief.pdf', 'PDF', 'Processing'],
]

const sampleActions = [
  ['Review project timeline', 'Alex Morgan', 'Sep 12', 'High', 'Open'],
  ['Share budget feedback', 'Jamie Lee', 'Sep 14', 'Medium', 'In review'],
]

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()

  const timeoutId = window.setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function requestError(error, timeoutMessage, networkMessage) {
  if (error.name === 'AbortError') {
    return timeoutMessage
  }

  if (error instanceof TypeError) {
    return networkMessage
  }

  return error.message || 'Something went wrong. Please try again.'
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <b className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg text-white">
        D
      </b>

      <div>
        <p className="font-bold text-slate-900">DocTransform AI</p>
        <p className="text-[10px] font-bold tracking-widest text-indigo-600">
          AI WORKSPACE
        </p>
      </div>
    </div>
  )
}

function Badge({ children }) {
  const colors = {
    Ready: 'bg-emerald-50 text-emerald-700',
    Processing: 'bg-amber-50 text-amber-700',
    Open: 'bg-blue-50 text-blue-700',
    High: 'bg-rose-50 text-rose-700',
    Medium: 'bg-amber-50 text-amber-700',
    Low: 'bg-slate-100 text-slate-600',
    'In review': 'bg-violet-50 text-violet-700',
    Completed: 'bg-emerald-50 text-emerald-700',
    Pending: 'bg-amber-50 text-amber-700',
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        colors[children] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </span>
  )
}

function Heading({ eyebrow, title, text }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-bold text-slate-900">
        {title}
      </h2>

      {text && (
        <p className="mt-1 text-sm text-slate-500">
          {text}
        </p>
      )}
    </div>
  )
}

/* ---------------- UPLOAD PANEL ---------------- */

function UploadPanel({ onExtracted }) {
  const input = useRef(null)

  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  function selectFile(selectedFile) {
    setError('')
    setResult(null)

    if (!selectedFile) {
      return
    }

    if (
      selectedFile.type !== 'application/pdf' &&
      !selectedFile.name.toLowerCase().endsWith('.pdf')
    ) {
      setFile(null)
      setError('Please select a PDF document.')
      return
    }

    setFile(selectedFile)
  }

  async function upload() {
    if (!file) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const form = new FormData()
      form.append('file', file)

      const response = await fetchWithTimeout(
        `${BACKEND_URL}/api/documents/upload`,
        {
          method: 'POST',
          body: form,
        },
        UPLOAD_TIMEOUT_MS
      )

      let data

      try {
        data = await response.json()
      } catch {
        throw new Error('The backend returned an invalid response.')
      }

      if (!response.ok) {
        throw new Error(data.detail || 'Could not process this PDF.')
      }

      setResult(data)
      onExtracted(data)
    } catch (error) {
      setError(
        requestError(
          error,
          'The backend took too long to respond. Please make sure FastAPI is running and try again.',
          'Cannot connect to the backend. Make sure FastAPI is running on http://127.0.0.1:8000.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-8">
      <Heading
        eyebrow="Start here"
        title="Upload your document"
        text="PDF documents supported."
      />

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          selectFile(event.dataTransfer.files[0])
        }}
        className="rounded-3xl border-2 border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
          ⇧
        </div>

        <p className="mt-4 font-bold">
          Drag and drop your document here
        </p>

        <p className="mt-1 text-sm text-slate-500">
          or choose a file from your computer
        </p>

        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => selectFile(event.target.files[0])}
        />

        <button
          onClick={() => input.current?.click()}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Choose File
        </button>

        {file && (
          <div className="mt-5 text-sm text-indigo-800">
            Selected: <b>{file.name}</b>

            <button
              onClick={upload}
              disabled={loading}
              className="ml-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-white disabled:opacity-60"
            >
              {loading ? 'Extracting…' : 'Upload & Extract'}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm font-medium text-rose-600">
            {error}
          </p>
        )}
      </div>

      {result && (
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <b>{result.filename}</b>

          <p className="mt-1 text-sm text-slate-500">
            {result.page_count} pages ·{' '}
            {result.character_count.toLocaleString()} characters
          </p>

          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {result.extracted_text ||
              'Text extraction returned no text. This PDF may be scanned or have no selectable text.'}
          </pre>
        </div>
      )}
    </section>
  )
}

/* ---------------- DASHBOARD ---------------- */

function Dashboard({
  document,
  setDocument,
  operation,
  setOperation,
  instructions,
  setInstructions,
  result,
  setResult,
  loading,
  setLoading,
  error,
  setError,
  addHistory,
}) {
  async function transform(id) {
    if (!document?.extracted_text) {
      setError(
        'Upload and extract a PDF before choosing an operation.'
      )
      return
    }

    if (id === 'custom_transform' && !instructions.trim()) {
      setOperation(id)
      setError('Please enter custom transformation instructions.')
      return
    }

    setOperation(id)
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const response = await fetchWithTimeout(
        `${BACKEND_URL}/api/transform`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: id,
            document_text: document.extracted_text,
            instructions:
              id === 'custom_transform'
                ? instructions
                : undefined,
          }),
        },
        TRANSFORM_TIMEOUT_MS
      )

      let data

      try {
        data = await response.json()
      } catch {
        throw new Error('The backend returned an invalid response.')
      }

      if (!response.ok) {
        throw new Error(
          data.detail || 'Transformation failed.'
        )
      }

      setResult(data)

      addHistory({
        document: document.filename,
        operation: id,
        date: new Date().toLocaleString(),
      })
    } catch (error) {
      setError(
        requestError(
          error,
          'The AI request timed out. Please try again.',
          'Cannot connect to the backend. Make sure FastAPI is running on http://127.0.0.1:8000.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-800 p-7 text-white">
        <p className="text-xs font-bold tracking-widest text-blue-100">
          YOUR DOCUMENT WORKSPACE
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Understand your documents, faster.
        </h2>

        <p className="mt-2 text-blue-100">
          Explore text extraction and AI-assisted document
          transformations.
        </p>
      </section>

      <UploadPanel onExtracted={setDocument} />

      <section className="mt-10">
        <Heading
          eyebrow="Transform"
          title="Choose an operation"
          text="Choose an operation to use the currently extracted document text."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {operations.map(([id, title, description], index) => (
            <article
              key={id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <b className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                {index + 1}
              </b>

              <h3 className="mt-4 font-bold">
                {title}
              </h3>

              <p className="mt-2 min-h-10 text-sm text-slate-500">
                {description}
              </p>

              <button
                onClick={() => transform(id)}
                disabled={loading}
                className="mt-4 text-sm font-semibold text-indigo-600 disabled:opacity-60"
              >
                {loading && operation === id
                  ? 'Working…'
                  : 'Use operation →'}
              </button>
            </article>
          ))}
        </div>

        {operation === 'custom_transform' && (
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
            <label className="text-sm font-bold">
              Custom transformation instructions
            </label>

            <textarea
              value={instructions}
              onChange={(event) =>
                setInstructions(event.target.value)
              }
              className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500"
              placeholder="Example: Rewrite this as a professional email."
            />

            <button
              onClick={() => transform('custom_transform')}
              className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Run Custom Transform
            </button>
          </div>
        )}

        {error && (
          <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-5 rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
            <Heading
              eyebrow="AI result"
              title={result.operation.replaceAll('_', ' ')}
              text="Generated from the extracted document text."
            />

            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {typeof result.result === 'string'
                ? result.result
                : JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </>
  )
}

/* ---------------- DOCUMENTS PAGE ---------------- */

function DocumentsPage({ document }) {
  const documents = [...sampleDocs]

  if (document) {
    documents.unshift([
      document.filename,
      'PDF',
      'Ready',
    ])
  }

  return (
    <section>
      <Heading
        eyebrow="Workspace"
        title="Documents"
        text="View documents processed in your DocTransform AI workspace."
      />

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-slate-400">
              <tr>
                <th className="pb-4">Document</th>
                <th className="pb-4">Type</th>
                <th className="pb-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {documents.map(([name, type, status]) => (
                <tr
                  key={name}
                  className="border-b border-slate-100"
                >
                  <td className="py-5 font-semibold text-slate-800">
                    {name}
                  </td>

                  <td className="text-slate-500">
                    {type}
                  </td>

                  <td>
                    <Badge>{status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/* ---------------- ACTION CENTER ---------------- */

function ActionCenterPage() {
  return (
    <section>
      <Heading
        eyebrow="Action Intelligence"
        title="Action Center"
        text="Track actions, responsible people, priorities, and deadlines extracted from documents."
      />

      <div className="grid gap-4">
        {sampleActions.map(
          ([action, owner, deadline, priority, status]) => (
            <div
              key={action}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Action
                  </p>

                  <h3 className="mt-1 font-bold text-slate-900">
                    {action}
                  </h3>
                </div>

                <Badge>{priority}</Badge>
              </div>

              <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">
                    Responsible
                  </p>
                  <p className="mt-1 font-semibold">
                    {owner}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Deadline
                  </p>
                  <p className="mt-1 font-semibold">
                    {deadline}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Status
                  </p>
                  <div className="mt-1">
                    <Badge>{status}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <h3 className="font-bold text-indigo-900">
          Action Intelligence workflow
        </h3>

        <p className="mt-2 text-sm leading-6 text-indigo-800">
          Upload a document and run the Action Intelligence
          operation to identify tasks, owners, deadlines,
          priorities, requirements, risks, and recommended next
          steps.
        </p>
      </div>
    </section>
  )
}

/* ---------------- HISTORY PAGE ---------------- */

function HistoryPage({ history }) {
  return (
    <section>
      <Heading
        eyebrow="Activity"
        title="History"
        text="View your recent document transformation activity."
      />

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        {history.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl">
              🕘
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              No activity yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Your document transformations will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => (
              <div
                key={`${item.operation}-${index}`}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.document}
                    </p>

                    <p className="mt-1 text-sm capitalize text-indigo-600">
                      {item.operation.replaceAll('_', ' ')}
                    </p>
                  </div>

                  <p className="text-xs text-slate-400">
                    {item.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------------- SETTINGS PAGE ---------------- */

function SettingsPage() {
  const [backendStatus, setBackendStatus] = useState('Not checked')
  const [checking, setChecking] = useState(false)

  async function checkBackend() {
    setChecking(true)

    try {
      const response = await fetch(
        `${BACKEND_URL}/health`
      )

      if (!response.ok) {
        throw new Error()
      }

      const data = await response.json()

      setBackendStatus(
        data.status === 'healthy'
          ? 'Connected'
          : 'Unavailable'
      )
    } catch {
      setBackendStatus('Disconnected')
    } finally {
      setChecking(false)
    }
  }

  return (
    <section>
      <Heading
        eyebrow="Configuration"
        title="Settings"
        text="Manage your DocTransform AI workspace configuration."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">
            Backend connection
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            FastAPI backend
          </p>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">
              API URL
            </p>

            <p className="mt-1 font-mono text-sm text-slate-700">
              {BACKEND_URL}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold">
              Status
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                backendStatus === 'Connected'
                  ? 'bg-emerald-50 text-emerald-700'
                  : backendStatus === 'Disconnected'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {backendStatus}
            </span>
          </div>

          <button
            onClick={checkBackend}
            disabled={checking}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {checking ? 'Checking…' : 'Check Backend'}
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">
            AI processing
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Current local AI configuration
          </p>

          <div className="mt-5 space-y-3">
            <div className="flex justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-sm text-slate-500">
                AI Provider
              </span>

              <b className="text-sm">
                Ollama
              </b>
            </div>

            <div className="flex justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-sm text-slate-500">
                Model
              </span>

              <b className="text-sm">
                Gemma 3:1b
              </b>
            </div>

            <div className="flex justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-sm text-slate-500">
                OCR
              </span>

              <Badge>Ready for integration</Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-slate-900">
            Supported operations
          </h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {operations.map(([id, title]) => (
              <div
                key={id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <p className="font-semibold">
                  {title}
                </p>

                <p className="mt-1 text-xs text-emerald-600">
                  Available
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- MAIN APP ---------------- */

function App() {
  const [activePage, setActivePage] = useState('Dashboard')

  const [document, setDocument] = useState(null)
  const [operation, setOperation] = useState('')
  const [instructions, setInstructions] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [history, setHistory] = useState([])

  function addHistory(item) {
    setHistory((previous) => [
      item,
      ...previous,
    ])
  }

  const navigation = [
    'Dashboard',
    'Documents',
    'Action Center',
    'History',
    'Settings',
  ]

  function renderPage() {
    if (activePage === 'Documents') {
      return (
        <DocumentsPage document={document} />
      )
    }

    if (activePage === 'Action Center') {
      return <ActionCenterPage />
    }

    if (activePage === 'History') {
      return <HistoryPage history={history} />
    }

    if (activePage === 'Settings') {
      return <SettingsPage />
    }

    return (
      <Dashboard
        document={document}
        setDocument={setDocument}
        operation={operation}
        setOperation={setOperation}
        instructions={instructions}
        setInstructions={setInstructions}
        result={result}
        setResult={setResult}
        loading={loading}
        setLoading={setLoading}
        error={error}
        setError={setError}
        addHistory={addHistory}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* SIDEBAR */}

      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 lg:block">
        <Brand />

        <nav className="mt-10 space-y-1">
          {navigation.map((name) => (
            <button
              key={name}
              onClick={() => {
                setActivePage(name)
                setError('')
              }}
              className={`block w-full rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                activePage === name
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {name}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN */}

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div className="lg:hidden">
            <Brand />
          </div>

          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold">
              {activePage === 'Dashboard'
                ? 'Document Intelligence'
                : activePage}
            </h1>

            <p className="text-sm text-slate-500">
              {activePage === 'Dashboard'
                ? 'Upload and understand documents in one place.'
                : 'Manage your DocTransform AI workspace.'}
            </p>
          </div>

          <b className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-sm text-indigo-700">
            JD
          </b>
        </header>

        {/* MOBILE NAVIGATION */}

        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {navigation.map((name) => (
              <button
                key={name}
                onClick={() => setActivePage(name)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${
                  activePage === name
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default App