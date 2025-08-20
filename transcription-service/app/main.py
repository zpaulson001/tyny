import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Annotated

import numpy as np
from fastapi import FastAPI, Response, Body
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Silence chatty logs from nemo
logging.getLogger("nemo_logger").setLevel(logging.CRITICAL)

# Global model variable
model = None


class NoStdStreams:
    """Context manager to suppress stdout/stderr during model inference."""

    def __init__(self):
        self.devnull = open(os.devnull, "w")

    def __enter__(self):
        self._stdout, self._stderr = sys.stdout, sys.stderr
        self._stdout.flush(), self._stderr.flush()
        sys.stdout, sys.stderr = self.devnull, self.devnull

    def __exit__(self, exc_type, exc_value, traceback):
        sys.stdout, sys.stderr = self._stdout, self._stderr
        self.devnull.close()


def load_model():
    """Load the NeMo ASR model."""
    global model

    try:
        import nemo.collections.asr as nemo_asr

        logger.info("Loading NeMo ASR model...")
        model = nemo_asr.models.ASRModel.from_pretrained(
            model_name="nvidia/parakeet-tdt-0.6b-v2"
        )
        logger.info("Model loaded successfully!")

    except ImportError as e:
        logger.error(f"Failed to import NeMo: {e}")
        logger.error(
            "Please install nemo-toolkit[asr] with: pip install nemo-toolkit[asr]"
        )
        raise
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


def transcribe_audio(audio_bytes: bytes) -> str:
    """Transcribe audio bytes to text."""
    global model

    if model is None:
        raise RuntimeError(
            "Model not loaded. Please ensure the model is loaded before transcription."
        )

    try:
        # Convert audio bytes to numpy array
        audio_data = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32)

        # Transcribe with suppressed output
        with NoStdStreams():
            output = model.transcribe([audio_data])

        return output[0].text

    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for model loading."""
    global model

    logger.info("Starting transcription service...")

    load_model()
    yield

    logger.info("Shutting down transcription service...")


# Create FastAPI app with lifespan
app = FastAPI(title="Transcription Service", version="1.0.0", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Transcription Service API", "status": "running"}


@app.get("/status")
async def status():
    """Health check endpoint."""
    return Response(status_code=200, content="OK")


@app.post("/transcribe")
async def transcribe(
    raw_data: Annotated[bytes, Body(media_type="application/octet-stream")],
):
    """Transcribe audio data."""
    try:
        text = transcribe_audio(raw_data)
        return {"text": text, "success": True}
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {"error": str(e), "success": False}, 500


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "service": "transcription-service",
    }
