#!/usr/bin/env python3
import asyncio
import os
import websockets
import soundfile as sf
import numpy as np
import argparse
from pathlib import Path
import librosa


async def stream_audio(websocket, audio_path):
    # Load the audio file
    audio_data, sample_rate = sf.read(audio_path)

    # Convert to mono if stereo
    if len(audio_data.shape) > 1:
        audio_data = audio_data.mean(axis=1)

    # Resample to 16kHz if needed
    if sample_rate != 16000:
        audio_data = librosa.resample(
            y=audio_data, orig_sr=sample_rate, target_sr=16000
        )
        sample_rate = 16000

    # Convert to 16-bit PCM
    audio_data = (audio_data * 32767).astype(np.int16)

    # Calculate chunk size for 100ms
    chunk_samples = int(sample_rate * 0.1)

    # Stream chunks
    for i in range(0, len(audio_data), chunk_samples):
        chunk = audio_data[i : i + chunk_samples]
        await websocket.send(chunk.tobytes())

        # Receive and log any response from the server with timeout
        try:
            response = await asyncio.wait_for(
                websocket.recv(), timeout=0.01
            )  # 10ms timeout
            print(f"Received from server: {response}")
        except asyncio.TimeoutError:
            pass  # No response within timeout
        except websockets.exceptions.WebSocketException:
            pass  # Connection error

        await asyncio.sleep(0.1)  # Wait 100ms between chunks


async def main(audio_path, language):
    uri = f"ws://localhost:{os.getenv('PORT', 3000)}/ws?language={language}"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri}")
            print(f"Streaming audio file: {audio_path}")
            print(f"Target language: {language}")
            await stream_audio(websocket, audio_path)
            print("Streaming completed")
    except websockets.exceptions.ConnectionClosed:
        print("Connection closed unexpectedly")
    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Stream audio file to WebSocket server"
    )
    parser.add_argument(
        "filename",
        type=str,
        nargs="?",  # Make the argument optional
        default="Your_Plans_Gods_Plans.mp3",
        help="Name of the audio file in the audio_files folder (defaults to Your_Plans_Gods_Plans.mp3)",
    )
    parser.add_argument(
        "--language",
        "-l",
        type=str,
        default="zh",
        help="Target language for translation (e.g., 'es' for Spanish, 'fr' for French, defaults to 'zh')",
    )

    args = parser.parse_args()
    audio_path = Path("audio_files") / args.filename

    if not audio_path.exists():
        print(f"Error: File {audio_path} not found")
        exit(1)

    asyncio.run(main(audio_path, args.language))
