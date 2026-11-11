import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "gemma3:1b"

PROMPTS = {
    "summarize": """You already have the document text between the delimiters below. Summarize that supplied document immediately; never ask the user to provide the document text again or say it is missing when text exists between the delimiters. The document is the only source of truth: do not invent facts. Ignore repeated headers, footers, page numbers, broken line wrapping, and layout artifacts when possible. Preserve important facts, names, dates, numbers, technical terms, and key conclusions. Return exactly these headings: Overview, Key Points, Important Details, Important Dates. Write 'Not mentioned' under Important Dates when no important dates are present. If a section has limited information, summarize only what is available.""",
    "rewrite": """Rewrite the supplied text according to the user's instructions while preserving its original meaning. Do not add facts that are not in the supplied text.""",
    "extract_information": """Extract the important information from the supplied document. Return valid JSON with useful fields discovered in the content. Do not invent information; use 'Not mentioned' for missing information.""",
    "classify_document": """Identify the most appropriate document type or category based only on the supplied content. Return valid JSON with keys 'document_type' and 'explanation'.""",
    "custom_transform": """Follow the user's transformation instructions using only the supplied document text. Do not add facts that are not supported by it.""",
    "action_intelligence": """Return valid JSON with these keys: actions, responsible_party, deadlines, priority, requirements, dependencies, risks_warnings, recommended_next_step, evidence_source_text. Use arrays when there are multiple items. Never invent names, deadlines, responsibilities, or actions. Use 'Not mentioned' when absent and 'Unclear' when the supplied text does not provide enough evidence.""",
}


class AIServiceError(Exception):
    """An error that can be safely shown by the API."""


def transform_document(operation: str, document_text: str, instructions: str | None = None):
    """Send a single document transformation request to local Ollama."""
    instruction_text = f"\nUser instructions: {instructions}" if instructions else ""
    prompt = f"""{PROMPTS[operation]}
{instruction_text}

Document text:
---
{document_text}
---
"""

    try:
        request_body = json.dumps(
            {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
            }
        ).encode("utf-8")
        request = Request(
            OLLAMA_GENERATE_URL,
            data=request_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urlopen(request, timeout=120) as response:
            response_data = json.loads(response.read().decode("utf-8"))

        output = response_data.get("response", "").strip()
        if not output:
            raise AIServiceError("The LLM returned an empty response. Please try again.")

        # Preserve structured JSON for operations whose prompt explicitly asks for it.
        if operation in {"extract_information", "classify_document", "action_intelligence"}:
            try:
                return json.loads(output)
            except json.JSONDecodeError:
                pass
        return output
    except AIServiceError:
        raise
    except HTTPError as error:
        raise AIServiceError(f"Ollama returned an error ({error.code}).") from error
    except (URLError, TimeoutError) as error:
        raise AIServiceError(
            "Unable to reach Ollama. Make sure Ollama is running on http://localhost:11434."
        ) from error
    except (json.JSONDecodeError, KeyError, ValueError) as error:
        raise AIServiceError("Ollama returned an invalid response.") from error
