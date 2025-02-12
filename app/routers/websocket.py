import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..config import logger
import datetime
import wave

router = APIRouter()

SAMPLING_RATE = int(os.getenv("SAMPLING_RATE"))
MIN_CHUNK_SIZE = float(os.getenv("MIN_CHUNK_SIZE"))


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    audio_chunks = []  # Store raw PCM chunks
    try:
        while True:
            audio_data = await websocket.receive_bytes()

            if not audio_data:
                continue

            audio_chunks.append(audio_data)
            logger.info(f"Received audio chunk of size: {len(audio_data)} bytes")
            await websocket.send_text(
                f"Received audio chunk of size: {len(audio_data)} bytes"
            )
    except WebSocketDisconnect:
        logger.info("Client disconnected")
        if audio_chunks:  # Only save if we have audio data
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"audio_recording_{timestamp}.wav"

            # Combine all chunks and write as WAV
            with wave.open(filename, "wb") as wav_file:
                wav_file.setnchannels(1)  # Mono audio
                wav_file.setsampwidth(2)  # 2 bytes per sample (16-bit)
                wav_file.setframerate(SAMPLING_RATE)

                # Write all chunks to the WAV file
                for chunk in audio_chunks:
                    wav_file.writeframes(chunk)

            logger.info(f"Saved audio recording to {filename}")
