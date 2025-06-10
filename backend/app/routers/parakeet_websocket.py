from fastapi import APIRouter, WebSocket, Depends
from app.dependencies import get_parakeet_service
from app.services.transcription import ParakeetService
import wave
import tempfile
import os
from datetime import datetime
import pathlib
import numpy as np
import time

router = APIRouter()

# Create a directory for storing WAV files if it doesn't exist
WAV_STORAGE_DIR = pathlib.Path("wav_files")
WAV_STORAGE_DIR.mkdir(exist_ok=True)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    parakeet_service: ParakeetService = Depends(get_parakeet_service),
):
    await websocket.accept()
    try:
        while True:
            # Wait for binary PCM audio data from the client
            audio_data = await websocket.receive_bytes()

            array = np.frombuffer(audio_data, dtype=np.float32)

            # Scale from [-1.0, 1.0] to int16 range
            int16_array = (array * 32767).astype(np.int16)

            # Create a temporary WAV file
            with tempfile.NamedTemporaryFile(suffix=".wav") as temp_file:
                temp_path = temp_file.name

                # Open the file in write mode
                with wave.open(temp_path, "wb") as wav_file:
                    # Set parameters (assuming 16-bit PCM, 16kHz, mono)
                    wav_file.setnchannels(1)  # mono
                    wav_file.setsampwidth(2)  # 2 bytes per sample (16-bit)
                    wav_file.setframerate(16000)  # 16kHz
                    wav_file.writeframes(int16_array.tobytes())

                # Save a copy of the WAV file with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                saved_wav_path = WAV_STORAGE_DIR / f"audio_{timestamp}.wav"
                with open(temp_path, "rb") as src, open(saved_wav_path, "wb") as dst:
                    dst.write(src.read())

                start_time = time.time()
                transcription = parakeet_service.transcribe(temp_path)
                end_time = time.time()
                processing_time = end_time - start_time

                # Send confirmation with the temporary file path
                print(
                    f"Received {len(audio_data)} bytes of PCM audio data and saved to {saved_wav_path} in {processing_time} seconds"
                )

                print(f"Transcription: {transcription}")
                await websocket.send_json(
                    {
                        "type": "transcription",
                        "text": transcription.text,
                        "inference_time": processing_time,
                    }
                )
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        try:
            # Only try to close if the connection is still open
            if websocket.client_state.value != 3:  # 3 is the closed state
                await websocket.close()
        except Exception as e:
            print(f"Error closing WebSocket: {e}")
