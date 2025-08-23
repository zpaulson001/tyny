from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import Depends, FastAPI
from app.lib.dependencies import get_transcription_service
from app.routers import rooms, languages
from app.globals import httpx_client
from app.config import settings
from fastapi.middleware.cors import CORSMiddleware

from app.services.transcription import GCPTranscriptionService as TranscriptionService


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

    await httpx_client.aclose()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(rooms.router)
app.include_router(languages.router)


@app.get("/wake-up")
async def wake_up(
    transcription_service: Annotated[
        TranscriptionService, Depends(get_transcription_service)
    ],
):
    await transcription_service.wake_up()
    return {"message": "Wake up complete"}


@app.get("/health")
async def health():
    return {"message": "OK"}
