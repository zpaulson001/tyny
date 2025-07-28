from typing import Annotated
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    HTTPException,
    Query,
)

from fastapi.responses import StreamingResponse

from app.globals import SSEManager
from app.lib.dependencies import get_rooms_service, get_sse_manager
from app.services.rooms import RoomsService

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
async def get_all_rooms(
    rooms_service: Annotated[RoomsService, Depends(get_rooms_service)],
):
    return {"rooms": rooms_service.get_all_rooms()}


@router.get("/{room_id}")
async def get_room(
    room_id: str, rooms_service: Annotated[RoomsService, Depends(get_rooms_service)]
):
    if not rooms_service.get_room(room_id):
        raise HTTPException(status_code=404, detail="Room not found.")
    return None


@router.get("/{room_id}/events")
async def listen_to_room(
    room_id: str,
    rooms_service: Annotated[RoomsService, Depends(get_rooms_service)],
    target_lang: Annotated[list[str] | None, Query()] = None,
):
    event_generator = await rooms_service.listen_to_room(room_id, target_lang)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
