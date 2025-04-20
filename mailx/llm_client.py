# mailogy/llm_client.py

import ast
import json
import os
from pathlib import Path
from textwrap import dedent
from dotenv import load_dotenv
from google import genai
from google.genai import types   # for GenerateContentConfig

from mailogy.utils import (
    mailogy_dir,
    get_user_email,
    get_llm_model,
    get_llm_api_key,
)
from mailogy.prompts import script_prompt, script_examples, script_tips

# Load .env from ~/.mailogy/.env then fallback to project root ./.env
for p in (mailogy_dir / ".env", Path.cwd() / ".env"):
    load_dotenv(dotenv_path=p, override=False)

class LLMClient:
    def __init__(self, log_path: Path, default_model: str = None):
        self.log_path = log_path
        self.model    = default_model or get_llm_model() or "gemini-2.0-flash-lite"
        self.api_key  = get_llm_api_key()

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is missing in your environment (.env)")

        # Initialize the Google Gen AI client
        self.client = genai.Client(api_key=self.api_key)
        self.script_messages: list[dict[str,str]] = []

    def get_response(
        self,
        messages: list[dict[str,str]],
        temperature: float      = 1.0,
        agent_name: str         = "",
    ) -> str:
        prompt = "\n".join(f"[{m['role'].upper()}] {m['content']}" for m in messages)

        log_entry = {
            "provider": "gemini",
            "model":    self.model,
            "prompt":   prompt,
            "temperature": temperature,
            "agent_name":  agent_name,
            "response":    None,
            "error":       None,
        }

        try:
            # Pass temperature (and other sampling params) via config
            config = types.GenerateContentConfig(temperature=temperature)
            resp = self.client.models.generate_content(
                model=self.model,
                contents=[prompt],
                config=config,
            )
            text = resp.text
            log_entry["response"] = text
            return text

        except Exception as e:
            log_entry["error"] = str(e)
            raise

        finally:
            with open(self.log_path, "a") as f:
                f.write(json.dumps(log_entry) + "\n")

    def get_script(self, prompt_text: str):
        # Bootstrap system messages once
        if not self.script_messages:
            db_code = (Path(__file__).parent / "database.py").read_text()
            self.script_messages = [
                {
                    "role": "system",
                    "content": script_prompt
                               + f"\nThe customer's email address is {get_user_email()}"
                },
                {"role": "system", "content": script_examples},
                {"role": "system", "content": f"DATABASE API:\n{db_code}"},
                {"role": "system", "content": script_tips},
            ]

        # Append the user's request
        self.script_messages.append({"role": "user", "content": prompt_text})

        # Get the LLM reply
        full_response = self.get_response(
            messages=self.script_messages,
            temperature=1.0,
            agent_name="get_script",
        )

        # Extract code between @@ or ``` markers
        message, script = "", ""
        if full_response.count("@@") == 2:
            message, script = full_response.split("@@")[:2]
        elif full_response.count("```") == 2:
            message, script = full_response.split("```")[:2]
        else:
            message = full_response

        content = message
        if script:
            script = dedent(script).strip()
            if script.startswith("python"):
                script = script[6:].strip()
            # Try JSON parse
            try:
                parsed = json.loads(script)
                script = parsed
            except:
                pass
            # Validate Python syntax
            try:
                ast.parse(script)
                content += f"\n@@\n{script}\n@@"
            except SyntaxError as e:
                content += f"\nINVALID SCRIPT:\n@@\n{script}\n@@\n\nERROR: {e}"

        # Save assistant’s reply for the next turn
        self.script_messages.append({"role": "assistant", "content": content})
        return message, script

# Singleton accessor
_llm_client_instance = None
_client_log_path      = mailogy_dir / "logs.jsonl"

def get_llm_client():
    global _llm_client_instance
    if _llm_client_instance is None:
        _llm_client_instance = LLMClient(_client_log_path)
    return _llm_client_instance
