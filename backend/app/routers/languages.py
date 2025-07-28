from typing import Annotated

from fastapi import APIRouter, Depends

from app.lib.dependencies import get_translation_service
from app.services.translation import BaseRemoteTranslationService

router = APIRouter()


@router.get("/languages")
async def get_available_languages(
    translation_service: Annotated[
        BaseRemoteTranslationService, Depends(get_translation_service)
    ],
):
    return await translation_service.get_supported_languages()
