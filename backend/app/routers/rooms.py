from typing import Annotated
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    HTTPException,
    Query,
)
import asyncio

from fastapi.responses import StreamingResponse

from app.globals import SSEManager
from app.lib.dependencies import get_rooms_service, get_sse_manager
from app.lib.sse import create_sse_response
from app.services.rooms import RoomsService, TranscriptionMessage, TranslationMessage

router = APIRouter(prefix="/rooms")


@router.post("/")
async def create_room(sse_manager: Annotated[SSEManager, Depends(get_sse_manager)]):
    room_id = sse_manager.create_room()
    print(f"Created room: {room_id}")
    return {"roomId": room_id}


@router.post("/{room_id}")
async def send_audio(
    room_id: str,
    raw_data: Annotated[bytes, Body(media_type="application/octet-stream")],
    rooms_service: Annotated[RoomsService, Depends(get_rooms_service)],
    sse_manager: Annotated[SSEManager, Depends(get_sse_manager)],
    background_tasks: BackgroundTasks,
    is_utterance: bool = False,
):
    if room_id not in sse_manager.rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found. Please create a room before sending audio.",
        )

    background_tasks.add_task(
        rooms_service.process_audio,
        raw_data,
        room_id,
        is_utterance,
    )

    return None


@router.get("/")
async def get_rooms(sse_manager: Annotated[SSEManager, Depends(get_sse_manager)]):
    return {"rooms": list(sse_manager.rooms.keys())}


@router.get("/{room_id}/events")
async def listen_to_room(
    room_id: str,
    sse_manager: Annotated[SSEManager, Depends(get_sse_manager)],
    target_lang: Annotated[list[str] | None, Query()] = None,
):
    if room_id not in sse_manager.rooms:
        raise HTTPException(status_code=404, detail="Room not found.")

    # Create a new async queue for this client
    q: asyncio.Queue[TranscriptionMessage | TranslationMessage] = asyncio.Queue()
    print(f"Subscribing to room: {room_id} with language codes: {target_lang}")
    sse_manager.subscribe_to_room(room_id, q, target_lang)

    async def event_generator():
        try:
            while True:
                # Wait for new messages in the queue
                message = await q.get()

                yield create_sse_response(
                    "translation" if "language_code" in message else "transcription",
                    message,
                )

        except asyncio.CancelledError:
            # Client disconnected
            print(f"Client disconnected from room: {room_id}")

    return StreamingResponse(event_generator(), media_type="text/event-stream")
