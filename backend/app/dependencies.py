from typing import Optional
from app.services.transcription import ParakeetService

# Global variable to store the Parakeet service
_parakeet_service: Optional[ParakeetService] = None


def get_parakeet_service() -> ParakeetService:
    if _parakeet_service is None:
        raise RuntimeError("Parakeet service not initialized")
    return _parakeet_service


def set_parakeet_service(service: Optional[ParakeetService]) -> None:
    global _parakeet_service
    _parakeet_service = service
