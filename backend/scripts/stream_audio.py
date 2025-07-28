#!/usr/bin/env python3
import asyncio
import os
import time
import requests
import soundfile as sf
import numpy as np
import argparse
from pathlib import Path
import librosa


def create_room(url):
    response = requests.post(url)
    return response.json()["room_id"]


def stream_audio(url, chunk_duration=1):
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

    # Calculate chunk size for 1s
    chunk_samples = int(sample_rate * chunk_duration)

    # Stream chunks
    for i in range(0, len(audio_data), chunk_samples):
        chunk = audio_data[i : i + chunk_samples]
        requests.post(url, data=chunk.tobytes())

        time.sleep(chunk_duration)  # Wait 1s between chunks


async def main(audio_path, language):
    base_url = f"http://localhost:{os.getenv('PORT', 3000)}"
    create_room_url = f"{base_url}/rooms"
    room_id = create_room(create_room_url)
    send_audio_url = f"{base_url}/rooms/{room_id}"
    print(f"Room ID: {room_id}")

    stream_audio(send_audio_url)


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
