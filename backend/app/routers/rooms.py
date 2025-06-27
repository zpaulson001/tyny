import json
from typing import Annotated
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
import asyncio

from fastapi.responses import StreamingResponse

from app.globals import SSEManager
from app.lib.dependencies import get_rooms_service, get_sse_manager
from app.lib.language_codes import LanguageCode
from app.services.rooms import RoomsService, TranscriptionMessage

router = APIRouter()


@router.post("/rooms")
async def create_room(sse_manager: Annotated[SSEManager, Depends(get_sse_manager)]):
    room_id = sse_manager.create_room()
    return {"room_id": room_id}


@router.post("/rooms/{room_id}")
async def send_audio(
    room_id: str,
    request: Request,
    rooms_service: Annotated[RoomsService, Depends(get_rooms_service)],
    sse_manager: Annotated[SSEManager, Depends(get_sse_manager)],
    background_tasks: BackgroundTasks,
    is_final: bool = False,
):
    if room_id not in sse_manager.rooms:
        raise HTTPException(
            status_code=404,
            detail="Room not found. Please create a room before sending audio.",
        )

    audio_data = await request.body()
    print(audio_data)

    for queue in sse_manager.rooms[room_id]["transcriptions"]:
        queue.put_nowait(str(audio_data))

    return None


@router.get("/rooms")
async def get_rooms(sse_manager: Annotated[SSEManager, Depends(get_sse_manager)]):
    return {"rooms": list(sse_manager.rooms.keys())}


@router.post("/rooms/{room_id}/listen")
async def listen_to_room(
    room_id: str,
    language_code: LanguageCode,
    sse_manager: Annotated[SSEManager, Depends(get_sse_manager)],
):
    if room_id not in sse_manager.rooms:
        raise HTTPException(status_code=404, detail="Room not found.")

    # Create a new async queue for this client
    q: asyncio.Queue[str] = asyncio.Queue()
    sse_manager.subscribe_to_room(room_id, q, language_code)

    async def event_generator():
        try:
            while True:
                # Wait for new messages in the queue
                message = await q.get()
                yield f"data: {json.dumps(message)}\n\n"
        except asyncio.CancelledError:
            # Client disconnected
            print(f"Client disconnected from room: {room_id}")

    return StreamingResponse(event_generator(), media_type="text/event-stream")
