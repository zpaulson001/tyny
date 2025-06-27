from abc import ABC, abstractmethod
from typing import Literal, TypedDict
import mlx_whisper
import numpy as np
import onnx_asr
from onnx_asr.adapters import TextResultsAsrAdapter
from numpy.typing import NDArray


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
    def __init__(
        self,
        model_name: str | None = None,
        model: TextResultsAsrAdapter | None = None,
    ):
        self.model_name: str | None = None
        self.model: TextResultsAsrAdapter | None = None
        if model_name is None and model is None:
            raise ValueError("Either model_name or model must be provided")
        if model_name is not None and model is not None:
            raise ValueError("Only one of model_name or model must be provided")
        if model_name is not None:
            if model_name != "nemo-parakeet-tdt-0.6b-v2":
                raise ValueError("Only nemo-parakeet-tdt-0.6b-v2 is supported")
            self.model_name = model_name
            self.model = None
        else:
            self.model_name = None
            self.model = model

    def transcribe(self, audio_data: NDArray[np.float32]) -> str:
        if self.model is None:
            self.load_model()

        if self.model is None:
            raise RuntimeError("Failed to load model")

        return self.model.recognize(audio_data)

    def load_model(self):
        if self.model_name is None:
            raise ValueError("model_name must be provided")
        self.model = onnx_asr.load_model(self.model_name)
