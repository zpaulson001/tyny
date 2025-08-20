import logging

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    deepl_api_key: str
    deepl_url: str
    transcription_url: str


logger = logging.getLogger("uvicorn")
settings = Settings()
