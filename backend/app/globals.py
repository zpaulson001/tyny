from dataclasses import dataclass
import httpx
from onnx_asr.adapters import TextResultsAsrAdapter
from app.services.rooms import SSEManager
from transformers import Pipeline


# Global dictionary to store ML models
@dataclass
class MLModels:
    transcription: TextResultsAsrAdapter | None = None
    translation: Pipeline | None = None

    def clear(self):
        for attr in self.__dict__:
            if attr != "clear":
                setattr(self, attr, None)


ml_models: MLModels = MLModels()
sse_manager: SSEManager = SSEManager()
httpx_client: httpx.AsyncClient = httpx.AsyncClient()
