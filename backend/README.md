# DocTransform AI Backend

FastAPI backend for document upload, transformation, search, question answering, and action intelligence.

## Run locally

```powershell
python -m pip install -r requirements.txt
python run.py
```

The API is available at `http://localhost:8000` with interactive documentation at `/docs`.

The package directories provide the planned application boundaries. Existing upload and transformation behavior remains in `app/main.py` while the additional modules are introduced incrementally.
