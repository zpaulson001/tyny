from abc import ABC, abstractmethod

from app.config import settings
import httpx

# default_model_name = "facebook/nllb-200-distilled-600M"


class BaseRemoteTranslationService(ABC):
    @abstractmethod
    async def translate(self, text: str, language_code: str) -> str:
        pass

    @abstractmethod
    async def get_supported_languages(self) -> list[str]:
        pass


# class NLLBService:
#     def __init__(
#         self,
#         model_name: str | None = None,
#         model: Pipeline | None = None,
#     ):
#         self.model_name: str | None = None
#         self.model: Pipeline | None = None
#         if model_name is None and model is None:
#             raise ValueError("Either model_name or model must be provided")
#         if model_name is not None and model is not None:
#             raise ValueError("Only one of model_name or model must be provided")
#         if model_name is not None:
#             if model_name != default_model_name:
#                 raise ValueError(f"Only {default_model_name} is supported")
#             self.model_name = model_name
#             self.model = None
#         else:
#             self.model_name = None
#             self.model = model

#     def translate(self, text: str, language_code: NLLB_LANGUAGE_CODES) -> str:
#         if self.model is None:
#             self.load_model()

#         if self.model is None:
#             raise RuntimeError("Failed to load model")

#         translated_text = self.model(text, src_lang="eng_Latn", tgt_lang=language_code)

#         return str(translated_text[0]["translation_text"])

#     def load_model(self):
#         if self.model_name is None:
#             raise ValueError("model_name must be provided")
#         self.model = pipeline("translation", model=self.model_name)


class AzureTranslationService(BaseRemoteTranslationService):
    def __init__(self, http_client: httpx.AsyncClient):
        self.client = http_client
        self.api_key = settings.azure_translate_api_key
        self.api_url = settings.azure_translate_url

    async def translate(
        self,
        text: str,
        language_codes: str | list[str],
    ) -> str:
        params = {
            "api-version": "3.0",
            "from": "en",
            "to": language_codes,
        }

        async with httpx.AsyncClient() as client:
            res = await client.post(
                self.api_url,
                params=params,
                headers={
                    "Ocp-Apim-Subscription-Key": self.api_key,
                    "Ocp-Apim-Subscription-Region": settings.azure_region,
                },
                json=[{"text": text}],
            )

        translation = res.json()[0]["translations"][0]["text"]
        return translation


class DeepLTranslationService(BaseRemoteTranslationService):
    def __init__(self, http_client: httpx.AsyncClient):
        self.client = http_client
        self.api_key = settings.deepl_api_key
        self.api_url = settings.deepl_url
        self.headers = {
            "Authorization": f"DeepL-Auth-Key {self.api_key}",
        }

    async def translate(
        self,
        text: str,
        language_code: str,
    ) -> str:
        res = await self.client.post(
            self.api_url + "/translate",
            headers=self.headers,
            json={
                "text": [text],
                "target_lang": language_code,
                "source_lang": "en",
            },
            timeout=None,
        )

        print(res.json())
        translation = res.json().get("translations", [])[0].get("text", "")
        return translation

    async def get_supported_languages(self):
        res = await self.client.get(
            self.api_url + "/languages",
            params={"type": "target"},
            headers=self.headers,
        )

        # Use a dictionary to track seen names and keep the first occurrence
        seen_names = {}
        languages = []

        for language in res.json():
            name = language.get("name", "")
            if name and name not in seen_names:
                seen_names[name] = True
                languages.append(
                    {
                        "code": language.get("language", "").lower(),
                        "name": name,
                    }
                )

        return languages
