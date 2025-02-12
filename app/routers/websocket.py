import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.config import logger
import datetime
import wave

router = APIRouter()

SAMPLING_RATE = int(os.getenv("SAMPLING_RATE", "16000"))  # Default to 16kHz
MIN_CHUNK_SIZE = float(os.getenv("MIN_CHUNK_SIZE", "0.1"))  # Default to 100ms


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    audio_chunks = bytearray()  # Initialize as bytearray
    try:
        while True:
            audio_data = await websocket.receive_bytes()
            if not audio_data:
                continue

            audio_chunks.extend(audio_data)  # Directly append bytes
            logger.info(f"Received audio chunk of size: {len(audio_data)} bytes")
            await websocket.send_text(
                f"Received audio chunk of size: {len(audio_data)} bytes"
            )
    except WebSocketDisconnect:
        logger.info("Client disconnected")
        if audio_chunks:  # Only save if we have audio data
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"audio_recording_{timestamp}.wav"

            # Save as WAV file
            with wave.open(filename, "wb") as wav_file:
                wav_file.setnchannels(1)  # Mono audio
                wav_file.setsampwidth(2)  # 2 bytes per sample (16-bit)
                wav_file.setframerate(SAMPLING_RATE)
                wav_file.writeframes(audio_chunks)

            logger.info(f"Saved audio recording to {filename}")
