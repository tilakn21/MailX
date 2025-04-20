# mailogy/utils.py

import os
from pathlib import Path
from dotenv import load_dotenv

# ─── Ensure ~/.mailogy directory exists ────────────────────────────────────────
mailogy_dir = Path.home() / ".mailogy"
mailogy_dir.mkdir(exist_ok=True)

# ─── Load environment variables ─────────────────────────────────────────────────
# 1) Try ~/.mailogy/.env
# 2) Otherwise, fallback to ./.env in the current working directory
env_path = mailogy_dir / ".env"
if not env_path.exists():
    env_path = Path.cwd() / ".env"
load_dotenv(dotenv_path=env_path)  # populates os.environ

# ─── User email (optional) ──────────────────────────────────────────────────────
def get_user_email() -> str | None:
    """Return the user’s email if set in .env (USER_EMAIL)."""
    return os.getenv("USER_EMAIL")

def set_user_email(email: str):
    """Fallback: just warn user and continue without raising an error."""
    if os.getenv("USER_EMAIL"):
        return  # already set, skip

    print(f"[WARN] USER_EMAIL is not set.")
    print(f"Please add the following to your ~/.mailogy/.env file:\n")
    print(f"USER_EMAIL={email}")
    print("Continuing without saving USER_EMAIL...")


# ─── LLM configuration ─────────────────────────────────────────────────────────
def get_llm_provider() -> str:
    """
    Which LLM to use:
      - "gemini" → Google Gemini via google-generativeai SDK
      - "openai" → OpenAI via litellm (fallback)
    Default: "openai"
    """
    return os.getenv("LLM_PROVIDER", "openai").lower()

def get_llm_api_key() -> str | None:
    """
    Return the API key for the selected provider:
      - GEMINI_API_KEY if provider == "gemini"
      - OPENAI_API_KEY otherwise
    """
    if get_llm_provider() == "gemini":
        return os.getenv("GEMINI_API_KEY")
    return os.getenv("OPENAI_API_KEY")

def get_llm_model() -> str | None:
    """
    Return the model name to request:
      - LLM_MODEL (for Gemini)
      - OPENAI_MODEL (fallback for OpenAI)
    """
    return os.getenv("LLM_MODEL") or os.getenv("OPENAI_MODEL")

def get_llm_base_url() -> str | None:
    """
    (Optional) If using OpenAI via litellm, override with OPENAI_BASE_URL.
    """
    return os.getenv("OPENAI_BASE_URL")

# ─── Helper for dynamic imports (unchanged) ────────────────────────────────────
def validate_imports(script: str):
    """
    Scan `import` statements in a code snippet and prompt to pip-install missing modules.
    """
    import re, importlib, subprocess
    import_lines = re.findall(r"(?:import\s+[\w\.]+|from\s+[\w\.]+\s+import\s+[\w\.]+)", script)
    modules = [line.replace("from ", "").replace(" import ", ".") for line in import_lines]
    for m in modules:
        if "get_db" in m:
            continue
        try:
            importlib.import_module(m)
        except ModuleNotFoundError:
            if input(f"Requires {m}. Install via pip? (y/n) ").lower().startswith("y"):
                subprocess.run(["pip", "install", m])
            else:
                raise
