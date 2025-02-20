from typing import Literal
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate

LANGUAGE_MAP = {
    "af": "Afrikaans",
    "ar": "Arabic",
    "bg": "Bulgarian",
    "bn": "Bengali",
    "ca": "Catalan",
    "cs": "Czech",
    "da": "Danish",
    "de": "German",
    "el": "Greek",
    "en": "English",
    "es": "Spanish",
    "et": "Estonian",
    "fa": "Persian",
    "fi": "Finnish",
    "fr": "French",
    "he": "Hebrew",
    "hi": "Hindi",
    "hr": "Croatian",
    "hu": "Hungarian",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "lt": "Lithuanian",
    "lv": "Latvian",
    "ms": "Malay",
    "nl": "Dutch",
    "no": "Norwegian",
    "pl": "Polish",
    "pt": "Portuguese",
    "ro": "Romanian",
    "ru": "Russian",
    "sk": "Slovak",
    "sl": "Slovenian",
    "sq": "Albanian",
    "sr": "Serbian",
    "sv": "Swedish",
    "sw": "Swahili",
    "ta": "Tamil",
    "th": "Thai",
    "tr": "Turkish",
    "uk": "Ukrainian",
    "ur": "Urdu",
    "vi": "Vietnamese",
    "zh": "Chinese - Simplified Characters",
    "zh-CN": "Chinese - Simplified Characters",
    "zh-TW": "Chinese - Traditional Characters",
}

LanguageCode = Literal[
    "af",
    "ar",
    "bg",
    "bn",
    "ca",
    "cs",
    "da",
    "de",
    "el",
    "en",
    "es",
    "et",
    "fa",
    "fi",
    "fr",
    "he",
    "hi",
    "hr",
    "hu",
    "id",
    "it",
    "ja",
    "ko",
    "lt",
    "lv",
    "ms",
    "nl",
    "no",
    "pl",
    "pt",
    "ro",
    "ru",
    "sk",
    "sl",
    "sq",
    "sr",
    "sv",
    "sw",
    "ta",
    "th",
    "tr",
    "uk",
    "ur",
    "vi",
    "zh",
    "zh-CN",
    "zh-TW",
]


class TranslationService:
    def __init__(
        self,
        model_name: str = "llama-3.1-8b-instant",
        model_provider: str = "groq",
    ):
        self.model = init_chat_model(model=model_name, model_provider=model_provider)
        self.model_name = model_name
        self.model_provider = model_provider
        self.system_prompt = "You are an expert translator. You will be given a text in a source language and you need to translate it into {target_language}.Note that the souce text will have small errors in puncutation in grammar and punctuation and may be missing words. Do your best to translate the text as accurately as possible without adding any additional information or commentary. Output only the translation, nothing more."
        self.prompt_template = ChatPromptTemplate.from_messages(
            [
                ("system", self.system_prompt),
                ("human", "{text}"),
            ]
        )

    async def translate(self, text: str, target_language: LanguageCode):
        prompt = self.prompt_template.invoke(
            {"text": text, "target_language": LANGUAGE_MAP[target_language]}
        )
        response = await self.model.ainvoke(prompt)
        return response.content
