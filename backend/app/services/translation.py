from abc import ABC, abstractmethod

from transformers import Pipeline, pipeline

from app.lib.language_codes import LanguageCode

default_model_name = "facebook/nllb-200-distilled-600M"


class TranslationService(ABC):
    @abstractmethod
    def translate(self, text: str, language_code: LanguageCode) -> str:
        pass


class NLLBService(TranslationService):
    def __init__(
        self,
        model_name: str | None = None,
        model: Pipeline | None = None,
    ):
        self.model_name: str | None = None
        self.model: Pipeline | None = None
        if model_name is None and model is None:
            raise ValueError("Either model_name or model must be provided")
        if model_name is not None and model is not None:
            raise ValueError("Only one of model_name or model must be provided")
        if model_name is not None:
            if model_name != default_model_name:
                raise ValueError(f"Only {default_model_name} is supported")
            self.model_name = model_name
            self.model = None
        else:
            self.model_name = None
            self.model = model

    def translate(self, text: str, language_code: LanguageCode) -> str:
        if self.model is None:
            self.load_model()

        if self.model is None:
            raise RuntimeError("Failed to load model")

        translated_text = self.model(text, src_lang="eng_Latn", tgt_lang=language_code)

        return translated_text[0]["translation_text"]

    def load_model(self):
        if self.model_name is None:
            raise ValueError("model_name must be provided")
        self.model = pipeline("translation", model=self.model_name)
