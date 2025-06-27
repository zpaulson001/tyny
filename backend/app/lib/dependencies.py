from typing import Annotated

from fastapi import Depends
from app.routers.rooms import SSEManager
from app.services.rooms import RoomsService
from app.services.transcription import ParakeetService
from app.globals import ml_models, sse_manager
from app.services.translation import NLLBService


async def get_transcription_service() -> ParakeetService:
    return ParakeetService(model=ml_models.transcription)


async def get_translation_service() -> NLLBService:
    return NLLBService(model=ml_models.translation)


async def get_sse_manager() -> SSEManager:
    return sse_manager


async def get_rooms_service(
    transcription_service: Annotated[
        ParakeetService, Depends(get_transcription_service)
    ],
    translation_service: Annotated[NLLBService, Depends(get_translation_service)],
    sse_manager: Annotated[SSEManager, Depends(get_sse_manager)],
) -> RoomsService:
    return RoomsService(transcription_service, translation_service, sse_manager)
