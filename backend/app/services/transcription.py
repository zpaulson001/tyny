from abc import ABC, abstractmethod
from typing import Literal, TypedDict
import mlx_whisper
import numpy as np

from numpy.typing import NDArray
from parakeet_mlx import AlignedResult, from_pretrained


class TranscriptionResult(TypedDict):
    text: str
    processing_time: float


class TranscriptionService(ABC):
    @abstractmethod
    def transcribe(self, audio_data: NDArray[np.float32]) -> str:
        pass


class MLXWhisperService(TranscriptionService):
    def __init__(
        self,
        model_name: Literal[
            "mlx-community/whisper-large-v3-turbo", "models/whisper_small"
        ] = "models/whisper_small",
    ):
        self.model = mlx_whisper
        self.model_name = model_name

    def transcribe(self, audio_data: NDArray[np.float32]) -> str:
        return self.model.transcribe(audio_data, path_or_hf_repo=self.model_name).get(
            "text"
        )


class ParakeetService:
    def __init__(self, model_name: Literal["mlx-community/parakeet-tdt-0.6b-v2"]):
        if model_name != "mlx-community/parakeet-tdt-0.6b-v2":
            raise ValueError("Only mlx-community/parakeet-tdt-0.6b-v2 is supported")
        self.model_name = model_name
        self.model = None

    def transcribe(self, path: str) -> AlignedResult:
        if self.model is None:
            self.load_model()
        return self.model.transcribe(path)

    def load_model(self):
        self.model = from_pretrained(self.model_name)
