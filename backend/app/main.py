from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import Depends, FastAPI
import onnx_asr
from transformers import pipeline
from app.lib.dependencies import get_transcription_service
from app.routers import rooms, languages
from app.globals import httpx_client, ml_models
from fastapi.middleware.cors import CORSMiddleware

from app.services.transcription import TranscriptionService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model
    # ml_models.transcription = onnx_asr.load_model("nemo-parakeet-tdt-0.6b-v2")
    # ml_models.translation = pipeline(
    #     "translation", model="facebook/nllb-200-distilled-600M"
    # )
    yield
    # Clean up the ML models and release the resources
    ml_models.clear()
    await httpx_client.aclose()


origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:5173",
]

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(rooms.router)
app.include_router(languages.router)


@app.get("/warm-up")
async def warm_up(
    transcription_service: Annotated[
        TranscriptionService, Depends(get_transcription_service)
    ],
):
    await transcription_service.warm_up()
    return {"message": "Warm up complete"}
