import asyncio
from dataclasses import dataclass, field
import random
import time
from typing import TypedDict
import uuid
from fastapi import HTTPException
import numpy as np
from numpy.typing import NDArray
from app.lib.sse import create_sse_response
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
    utterance_id: int
    committed: str | None
    volatile: str | None


class TranslationMessage(TranscriptionMessage):
    language_code: str


class LanguageDict(TypedDict):
    last_ts: float
    client_ids: set[str]


@dataclass
class Room:
    utterance_id: int = 0
    last_transcription_ts: float = 0
    transcription_subscribers: set[str] = field(default_factory=set)
    translations: dict[str, LanguageDict] = field(default_factory=dict)
    client_queues: dict[
        str, asyncio.Queue[TranscriptionMessage | TranslationMessage]
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
        client_id: str,
        language_code: str | list[str] | None = None,
        no_transcriptions: bool = False,
    ):
        if room_id not in self.rooms:
            raise HTTPException(status_code=404, detail="Room not found.")

        room = self.rooms[room_id]

        if not no_transcriptions:
            room.transcription_subscribers.add(client_id)

        if language_code is not None:
            lang_code_arr = (
                language_code if isinstance(language_code, list) else [language_code]
            )

            for lang_code in lang_code_arr:
                if lang_code not in room.translations:
                    room.translations[lang_code] = LanguageDict(
                        last_ts=0, client_ids=set()
                    )
                room.translations[lang_code]["client_ids"].add(client_id)

        room.client_queues[client_id] = asyncio.Queue()

    def get_subscribed_language_codes(self, room_id: str) -> list[str]:
        room = self.rooms[room_id]
        return list(room.translations.keys())

    def push_translation_message(
        self,
        room_id: str,
        utterance_id: int,
        translation: str,
        is_utterance: bool,
        language_code: str,
        received_ts: float,
    ):
        translation_dict = self.rooms[room_id].translations

        if (
            not is_utterance
            and received_ts < translation_dict[language_code]["last_ts"]
        ):
            return

        translation_message = TranslationMessage(
            committed=translation if is_utterance else None,
            volatile=translation,
            language_code=language_code,
            utterance_id=utterance_id,
        )

        if translation_message["language_code"] in translation_dict:
            for client_id in translation_dict[translation_message["language_code"]][
                "client_ids"
            ]:
                self.rooms[room_id].client_queues[client_id].put_nowait(
                    translation_message
                )

        translation_dict[language_code]["last_ts"] = received_ts

    def push_transcription_message(
        self, room_id: str, transcription: str, is_utterance: bool, received_ts: float
    ):
        if not is_utterance and received_ts < self.rooms[room_id].last_transcription_ts:
            return

        utterance_id = self.rooms[room_id].utterance_id
        transcription_message = TranscriptionMessage(
            committed=transcription if is_utterance else None,
            volatile=transcription,
            utterance_id=utterance_id,
        )

        room = self.rooms[room_id]
        for client_id in room.transcription_subscribers:
            room.client_queues[client_id].put_nowait(transcription_message)

        self.rooms[room_id].last_transcription_ts = received_ts
        if transcription_message["committed"]:
            room.utterance_id += 1

    def unsubscribe_from_room(self, room_id: str, client_id: str):
        room = self.rooms[room_id]
        room.transcription_subscribers.discard(client_id)
        for lang_dict in room.translations.values():
            lang_dict["client_ids"].discard(client_id)
        room.client_queues.pop(client_id)


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

    def get_all_rooms(self) -> list[str]:
        return list(self.sse_manager.rooms.keys())

    def get_room(self, room_id: str) -> bool:
        return room_id in self.sse_manager.rooms

    async def process_audio(self, audio_data: bytes, room_id: str, is_utterance: bool):
        try:
            received_ts = time.time()
            transcription = await self.transcription_service.transcribe(audio_data)
            current_utterance_id = self.sse_manager.rooms[room_id].utterance_id
            self.sse_manager.push_transcription_message(
                room_id,
                transcription,
                is_utterance,
                received_ts,
            )

            target_language_codes = self.sse_manager.get_subscribed_language_codes(
                room_id
            )

            for lang_code in target_language_codes:
                received_ts = time.time()
                translation_result = await self.translation_service.translate(
                    transcription, lang_code
                )

                self.sse_manager.push_translation_message(
                    room_id,
                    current_utterance_id,
                    translation_result,
                    is_utterance,
                    language_code=lang_code,
                    received_ts=received_ts,
                )
        except Exception as e:
            print(e)

    async def listen_to_room(self, room_id: str, target_lang: list[str] | None = None):
        if room_id not in self.sse_manager.rooms:
            raise HTTPException(status_code=404, detail="Room not found.")

        client_id = str(uuid.uuid4())

        self.sse_manager.subscribe_to_room(room_id, client_id, target_lang)

        async def event_generator():
            try:
                while True:
                    # Wait for new messages in the queue
                    message = (
                        await self.sse_manager.rooms[room_id]
                        .client_queues[client_id]
                        .get()
                    )

                    print(message)

                    yield create_sse_response(
                        "translation"
                        if "language_code" in message
                        else "transcription",
                        message,
                    )

            except asyncio.CancelledError:
                # Client disconnected
                self.sse_manager.unsubscribe_from_room(room_id, client_id)
                print(f"Client disconnected from room: {room_id}")

        return event_generator
