"""Application configuration.

Environment-specific settings can be added here as the application grows.
"""

import os


class Settings:
    """Runtime settings loaded from environment variables."""

    app_name: str = os.getenv("APP_NAME", "DocTransform AI")
    environment: str = os.getenv("ENVIRONMENT", "development")
    ollama_url: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "gemma3:1b")


settings = Settings()
