import fitz
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.services.ai_service import AIServiceError, PROMPTS, transform_document

app = FastAPI(
    title="DocTransform AI",
    description="Backend API for DocTransform AI.",
)

MAX_DOCUMENT_CHARACTERS = 50_000


class TransformRequest(BaseModel):
    operation: str
    document_text: str = Field(min_length=1)
    instructions: str | None = None

# Allow the local Vite development server to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Confirm that the backend is running."""
    return {"message": "DocTransform AI backend is running"}


@app.get("/health")
def health_check():
    """Provide a simple health status for the backend."""
    return {"status": "healthy"}


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Extract text from an uploaded PDF without saving it to disk."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Please select a PDF file to upload.")

    is_pdf = file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf")
    if not is_pdf:
        raise HTTPException(status_code=415, detail="Unsupported file type. Please upload a PDF document.")

    try:
        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="The uploaded PDF file is empty.")

        document = fitz.open(stream=pdf_bytes, filetype="pdf")
        if not document.is_pdf:
            document.close()
            raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF document.")

        extracted_text = "\n".join(page.get_text() for page in document).strip()
        page_count = document.page_count
        document.close()

        return {
            "filename": file.filename,
            "page_count": page_count,
            "extracted_text": extracted_text,
            "character_count": len(extracted_text),
            "status": "success",
        }
    except HTTPException:
        raise
    except (fitz.FileDataError, RuntimeError, ValueError) as error:
        raise HTTPException(status_code=400, detail="Unable to read this PDF. Please upload a valid, unprotected PDF.") from error
    finally:
        await file.close()


@app.post("/api/transform")
def transform(request: TransformRequest):
    """Apply one supported LLM transformation to extracted document text."""
    operation = request.operation.strip().lower()
    document_text = request.document_text.strip()

    if operation not in PROMPTS:
        raise HTTPException(status_code=400, detail="Invalid operation. Choose one of the supported transformations.")
    if not document_text:
        raise HTTPException(status_code=400, detail="Document text cannot be empty.")
    if len(document_text) > MAX_DOCUMENT_CHARACTERS:
        raise HTTPException(status_code=413, detail=f"Document text is too large. Maximum is {MAX_DOCUMENT_CHARACTERS:,} characters.")
    if operation == "custom_transform" and not (request.instructions or "").strip():
        raise HTTPException(status_code=400, detail="Custom Transform requires instructions.")

    try:
        result = transform_document(operation, document_text, request.instructions)
        return {"operation": operation, "result": result, "status": "success"}
    except AIServiceError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
