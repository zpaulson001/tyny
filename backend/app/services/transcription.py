from abc import ABC, abstractmethod
from typing import TypedDict
import httpx
import numpy as np
from numpy.typing import NDArray
from app.config import settings
import google.oauth2.id_token


class BaseRemoteTranscriptionService(ABC):
    @abstractmethod
    async def transcribe(self, audio_data: bytes) -> str:
        pass


class TranscriptionResult(TypedDict):
    text: str
    processing_time: float


class BaseTranscriptionService(ABC):
    @abstractmethod
    def transcribe(self, audio_data: NDArray[np.float32]) -> str:
        pass


# class MLXWhisperService(BaseTranscriptionService):
#     def __init__(
#         self,
#         model_name: Literal[
#             "mlx-community/whisper-large-v3-turbo", "models/whisper_small"
#         ] = "models/whisper_small",
#     ):
#         self.model = mlx_whisper
#         self.model_name = model_name

#     def transcribe(self, audio_data: NDArray[np.float32]) -> str:
#         return self.model.transcribe(audio_data, path_or_hf_repo=self.model_name).get(
#             "text"
#         )


# class ParakeetService:
#     def __init__(
#         self,
#         model_name: str | None = None,
#         model: TextResultsAsrAdapter | None = None,
#     ):
#         self.model_name: str | None = None
#         self.model: TextResultsAsrAdapter | None = None
#         if model_name is None and model is None:
#             raise ValueError("Either model_name or model must be provided")
#         if model_name is not None and model is not None:
#             raise ValueError("Only one of model_name or model must be provided")
#         if model_name is not None:
#             if model_name != "nemo-parakeet-tdt-0.6b-v2":
#                 raise ValueError("Only nemo-parakeet-tdt-0.6b-v2 is supported")
#             self.model_name = model_name
#             self.model = None
#         else:
#             self.model_name = None
#             self.model = model

#     def transcribe(self, audio_data: NDArray[np.float32]) -> str:
#         if self.model is None:
#             self.load_model()

#         if self.model is None:
#             raise RuntimeError("Failed to load model")

#         return self.model.recognize(audio_data)

#     def load_model(self):
#         if self.model_name is None:
#             raise ValueError("model_name must be provided")
#         self.model = onnx_asr.load_model(self.model_name)


class GCPTranscriptionService(BaseRemoteTranscriptionService):
    def __init__(self, http_client: httpx.AsyncClient):
        self.http_client = http_client
        self.url = settings.modal_url
        self.headers = {
            "Modal-Key": settings.modal_key,
            "Modal-Secret": settings.modal_secret,
        }
        self.id_token = self._get_id_token()

    def _get_id_token(self):
        auth_req = google.auth.transport.requests.Request()
        target_audience = self.url
        return google.oauth2.id_token.fetch_id_token(auth_req, target_audience)

    async def transcribe(self, audio_data: bytes) -> str:
        response = await self.http_client.post(
            self.url + "/transcribe",
            headers={
                **self.headers,
                "Authorization": f"Bearer {self.id_token}",
                "Content-Type": "application/octet-stream",
            },
            content=audio_data,
            timeout=None,
        )
        print(f"Transcription response: {response.json()}")
        return response.json()["text"]

    async def wake_up(self):
        res = await self.http_client.get(
            self.url + "/status", headers=self.headers, timeout=None
        )
        res.raise_for_status()
