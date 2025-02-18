import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import numpy as np
from app.config import logger
import datetime
import mlx_whisper
from typing import Any
from collections import deque
from numpy.typing import NDArray
import wave

router = APIRouter()

SAMPLING_RATE = int(os.getenv("SAMPLING_RATE", "16000"))  # Default to 16kHz
MIN_CHUNK_SIZE = 0.5
BIT_DEPTH = 16
BYTES_PER_SAMPLE = BIT_DEPTH / 8


class PromptQueue:
    def __init__(self):
        self.queue = deque(maxlen=200)
        self.prompt = ""

    def insert(self, prompt: list[tuple[Any, Any, str]]):
        self.queue.extend(prompt)
        self.prompt = "".join([word[2] for word in self.queue])


class TranscriptionBuffer:
    MAX_MATCH = 5

    def __init__(self) -> None:
        self.last_confirmed_ts = 0.0
        self.committed: list[tuple[Any, Any, str]] = []
        self.uncommitted: list[tuple[Any, Any, str]] | None = None

    @property
    def committed_text(self) -> str:
        return "".join(word[2] for word in self.committed)

    @property
    def uncommitted_text(self) -> str:
        return "".join(word[2] for word in self.uncommitted) if self.uncommitted else ""

    def update(self, new_words: list[tuple[Any, Any, str]]) -> None:

        if self.uncommitted is None:
            self.uncommitted = new_words
            return

        new_words = [word for word in new_words if word[0] >= self.last_confirmed_ts]

        logger.info(f"New words: {new_words}")

        # Iterate over pairs of words from uncommitted and new transcription
        for prev_word, curr_word in zip(self.uncommitted, new_words):
            # If we find a match, mark this as the last confirmed word
            match_count = 0
            if (
                match_count <= self.MAX_MATCH
                and prev_word[2] == curr_word[2]
                and prev_word[1] > curr_word[0]
            ):
                match_count += 1
                self.last_confirmed_ts = prev_word[1]
                self.committed.append(prev_word)
            else:
                break

        self.uncommitted = [
            word for word in new_words if word[0] >= self.last_confirmed_ts
        ]


class ASRProcessor:
    def __init__(self):
        self.model = mlx_whisper
        self.last_trim_ts = 0.0
        self.full_transcription = ""
        self.transcription_buffer = TranscriptionBuffer()
        self.audio_buffer = np.array([], dtype=np.float32)
        self.prompt_queue = PromptQueue()

    def process_new_chunk(self, audio_array: NDArray[np.float32]):
        self.audio_buffer = np.concatenate([self.audio_buffer, audio_array])
        logger.info(
            f"Audio buffer length in seconds: {len(self.audio_buffer) / SAMPLING_RATE}"
        )
        segments = self._transcribe(self.audio_buffer)
        word_timestamps = self._get_word_timestamps(segments)
        self.transcription_buffer.update(word_timestamps)

        if self.transcription_buffer.last_confirmed_ts > 15.0:
            logger.info(
                "Buffer size exceeded 15 seconds, moving commited text to prompt queue"
            )
            self.prompt_queue.insert(self.transcription_buffer.committed)

            self.full_transcription = (
                self.full_transcription + self.transcription_buffer.committed_text
            )

            logger.info(f"Prompt queue: {self.prompt_queue.prompt}")
            self.transcription_buffer.committed.clear()

            # Trim audio buffer to start from last confirmed timestamp
            logger.info(
                f"Audio buffer length in seconds: {len(self.audio_buffer) / SAMPLING_RATE}"
            )
            trim_samples = int(
                self.transcription_buffer.last_confirmed_ts * SAMPLING_RATE
            )
            self.audio_buffer = self.audio_buffer[trim_samples:]
            logger.info(
                f"Audio buffer length in seconds after trimming: {len(self.audio_buffer) / SAMPLING_RATE}"
            )

            self.transcription_buffer.last_confirmed_ts = 0.0

    def _transcribe(self, audio_array: NDArray[np.float32]):
        return self.model.transcribe(
            audio_array, word_timestamps=True, initial_prompt=self.prompt_queue.prompt
        ).get("segments")

    def _get_word_timestamps(self, segments: Any):
        return [
            (word["start"], word["end"], word["word"])
            for segment in segments
            for word in segment.get("words", [])
            if segment.get("no_speech_prob", 0) <= 0.9
        ]


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    byte_buffer = bytearray()
    asr = ASRProcessor()
    full_audio = np.array([], dtype=np.float32)

    try:
        while True:
            audio_data = await websocket.receive_bytes()
            if not audio_data:
                continue

            byte_buffer.extend(audio_data)
            logger.info(f"Buffer size: {len(byte_buffer)} bytes")
            logger.info(f"Received audio chunk of size: {len(audio_data)} bytes")

            if len(byte_buffer) < SAMPLING_RATE * BYTES_PER_SAMPLE * MIN_CHUNK_SIZE:
                continue

            # Convert buffer to numpy array and append to audio_chunks
            new_chunk = (
                np.frombuffer(byte_buffer, dtype=np.int16).astype(np.float32) / 32768.0
            )

            full_audio = np.concatenate([full_audio, new_chunk])

            asr.process_new_chunk(new_chunk)

            logger.info(f"Text committed: {asr.transcription_buffer.committed_text}")
            logger.info(
                f"Text uncommitted: {asr.transcription_buffer.uncommitted_text}"
            )
            logger.info(f"Last confirmed: {asr.transcription_buffer.last_confirmed_ts}")

            byte_buffer.clear()

            # Send a message to the client with committed and uncommitted texts
            await websocket.send_json(
                {
                    "committed": asr.full_transcription
                    + asr.transcription_buffer.committed_text,
                    "uncommitted": asr.transcription_buffer.uncommitted_text,
                }
            )
    except WebSocketDisconnect:
        logger.info("Client disconnected")
        if len(full_audio) > 0:  # Only save if we have audio data

            # Librosa approach

            # sf = soundfile.SoundFile(
            #     io.BytesIO(audio_chunks),
            #     channels=1,
            #     endian="LITTLE",
            #     samplerate=SAMPLING_RATE,
            #     subtype="PCM_16",
            #     format="RAW",
            # )
            # audio, _ = librosa.load(sf, sr=SAMPLING_RATE, dtype=np.float32)

            # ----------------------------------------------------------------

            # Numpy approach
            # assumes input is already PCM_16 at 16kHz

            # Convert bytes to numpy array of int16, then to float32
            # audio_array = audio_chunks.astype(np.int16).astype(np.float32)
            # Normalize to [-1, 1]
            # audio_array = audio_array / 32768.0

            # ----------------------------------------------------------------

            text = mlx_whisper.transcribe(full_audio)["text"]
            logger.info(f"Transcription: {text}")

            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"audio_recording_{timestamp}.wav"

            # Save as WAV file
            with wave.open(filename, "wb") as wav_file:
                wav_file.setnchannels(1)  # Mono audio
                wav_file.setsampwidth(2)  # 2 bytes per sample (16-bit)
                wav_file.setframerate(SAMPLING_RATE)
                wav_file.writeframes(full_audio)

            logger.info(f"Saved audio recording to {filename}")
