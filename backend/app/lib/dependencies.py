from typing import Annotated

from fastapi import Depends
from app.services.rooms import SSEManager, RoomsService
from app.services.transcription import TranscriptionService
from app.globals import httpx_client, sse_manager
from app.services.translation import (
    DeepLTranslationService,
    NLLBService,
)


async def get_transcription_service() -> TranscriptionService:
    return TranscriptionService(http_client=httpx_client)


async def get_translation_service() -> NLLBService:
    return NLLBService(model=ml_models.translation)


async def get_sse_manager() -> SSEManager:
    return sse_manager


async def get_rooms_service(
    transcription_service: Annotated[
        TranscriptionService, Depends(get_transcription_service)
    ],
    translation_service: Annotated[NLLBService, Depends(get_translation_service)],
    sse_manager: Annotated[SSEManager, Depends(get_sse_manager)],
) -> RoomsService:
    return RoomsService(transcription_service, translation_service, sse_manager)
