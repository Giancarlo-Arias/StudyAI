import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.schemas.quiz_generation import GeneratedQuiz


MODEL_NAME = "gemini-3.5-flash-lite"


def generate_quiz_json(prompt: str) -> str:
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("El prompt no puede estar vacío")

    load_dotenv()

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY no está configurada")

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=GeneratedQuiz.model_json_schema(),
                temperature=0.4,
            ),
        )
    finally:
        client.close()

    if not response.text:
        raise RuntimeError("Gemini no devolvió un cuestionario")

    return response.text