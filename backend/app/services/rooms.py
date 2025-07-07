import asyncio
from dataclasses import dataclass, field
import random
from typing import TypedDict
from fastapi import HTTPException
import numpy as np
from numpy.typing import NDArray
from app.services.transcription import TranscriptionService
from app.services.translation import BaseRemoteTranslationService


def bytes_to_float32_array(audio_bytes: bytes) -> NDArray[np.float32]:
    """
    Convert int16 bytes to a normalized float32 numpy array.

    Args:
        audio_bytes: Raw audio data as int16 bytes

    Returns:
        Normalized float32 numpy array with values in range [-1.0, 1.0]
    """
    # Convert bytes to int16 array
    int16_array = np.frombuffer(audio_bytes, dtype=np.int16)

    # Convert to float32 and normalize to [-1.0, 1.0]
    float32_array = int16_array.astype(np.float32) / 32768.0

    return float32_array


class TranscriptionMessage(TypedDict):
    committed: str
    volatile: str


class TranslationMessage(TranscriptionMessage):
    language_code: str


@dataclass
class Room:
    utterance_id: int = 0
    transcriptions: list[asyncio.Queue[TranscriptionMessage]] = field(
        default_factory=list
    )
    translations: dict[
        str,
        list[asyncio.Queue[TranslationMessage | TranscriptionMessage]],
    ] = field(default_factory=dict)


class SSEManager:
    def __init__(self) -> None:
        self.rooms: dict[str, Room] = {}

    def create_room(self) -> str:
        room_id = f"{random.randint(0, 9999):04d}"

        while room_id in self.rooms:
            room_id = f"{random.randint(0, 9999):04d}"

        self.rooms[room_id] = Room()

        return room_id

    def subscribe_to_room(
        self,
        room_id: str,
        queue: asyncio.Queue[TranscriptionMessage | TranslationMessage],
        language_code: str | list[str] | None = None,
        no_transcriptions: bool = False,
    ):
        if room_id not in self.rooms:
            raise HTTPException(status_code=404, detail="Room not found.")

        room = self.rooms[room_id]

        if not no_transcriptions:
            room.transcriptions.append(queue)

        if language_code is not None:
            lang_code_arr = (
                language_code if isinstance(language_code, list) else [language_code]
            )

            for lang_code in lang_code_arr:
                if lang_code not in room.translations:
                    room.translations[lang_code] = [queue]
                else:
                    room.translations[lang_code].append(queue)

    def get_subscribed_language_codes(self, room_id: str) -> list[str]:
        room = self.rooms[room_id]
        return list(room.translations.keys())

    def push_translation_messages(
        self, room_id: str, translation_messages: list[TranslationMessage]
    ):
        translation_queues = self.rooms[room_id].translations

        for translation_message in translation_messages:
            if translation_message["language_code"] in translation_queues:
                for queue in translation_queues[translation_message["language_code"]]:
                    queue.put_nowait(translation_message)


class RoomsService:
    def __init__(
        self,
        transcription_service: TranscriptionService,
        translation_service: BaseRemoteTranslationService,
        sse_manager: SSEManager,
    ):
        self.transcription_service = transcription_service
        self.translation_service = translation_service
        self.sse_manager = sse_manager

    async def process_audio(self, audio_data: bytes, room_id: str, is_utterance: bool):
        try:
            transcription = await self.transcription_service.transcribe(audio_data)
            utterance_id = self.sse_manager.rooms[room_id].utterance_id
            transcription_message = TranscriptionMessage(
                committed=transcription if is_utterance else None,
                volatile=transcription,
                utterance_id=utterance_id,
            )
            self.sse_manager.push_transcription_message(room_id, transcription_message)

            target_language_codes = self.sse_manager.get_subscribed_language_codes(
                room_id
            )

            translation_messages = []
            for lang_code in target_language_codes:
                translation_result = await self.translation_service.translate(
                    transcription, lang_code
                )
                translation_message = TranslationMessage(
                    committed=translation_result if is_utterance else None,
                    volatile=translation_result,
                    language_code=lang_code,
                    utterance_id=utterance_id,
                )
                translation_messages.append(translation_message)

                self.sse_manager.push_translation_messages(
                    room_id, translation_messages
                )
        except Exception as e:
            print(e)
