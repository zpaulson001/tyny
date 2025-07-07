import logging
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    translation_service: Literal["azure", "nllb"] = "azure"
    azure_translate_api_key: str = ""
    azure_translate_url: str = ""
    azure_region: str = ""
    gcp_translate_api_key: str = ""
    gcp_translate_url: str = ""
    deepl_api_key: str = ""
    deepl_url: str = ""
    modal_key: str = ""
    modal_secret: str = ""
    modal_url: str = ""


logger = logging.getLogger("uvicorn")
settings = Settings()
