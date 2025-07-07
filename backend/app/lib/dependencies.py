from typing import Annotated

from fastapi import Depends
from app.services.rooms import SSEManager, RoomsService
from app.services.transcription import (
    TranscriptionService,
    BaseRemoteTranscriptionService,
)
from app.globals import httpx_client, sse_manager
from app.services.translation import (
    BaseRemoteTranslationService,
    DeepLTranslationService,
)


async def get_transcription_service() -> BaseRemoteTranscriptionService:
    return TranscriptionService(http_client=httpx_client)


async def get_translation_service() -> BaseRemoteTranslationService:
    return DeepLTranslationService(http_client=httpx_client)


async def get_sse_manager() -> SSEManager:
    return sse_manager


async def get_rooms_service(
    transcription_service: Annotated[
        TranscriptionService, Depends(get_transcription_service)
    ],
    translation_service: Annotated[
        BaseRemoteTranslationService, Depends(get_translation_service)
    ],
    sse_manager: Annotated[SSEManager, Depends(get_sse_manager)],
) -> RoomsService:
    return RoomsService(transcription_service, translation_service, sse_manager)
