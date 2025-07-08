import json
from typing import Literal


def create_sse_response(
    event_type: Literal["translation", "transcription", "error"], data: dict
):
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
