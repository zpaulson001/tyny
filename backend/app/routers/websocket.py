import os
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import numpy as np
from app.config import logger
import datetime
from typing import Annotated, Any
from collections import deque
from numpy.typing import NDArray
import wave
import asyncio
import mlx_whisper
import torch

from app.services.transcription import MLXWhisperService, TranscriptionService
from app.services.translation import LanguageCode, TranslationService

router = APIRouter()

SAMPLING_RATE = int(os.getenv("SAMPLING_RATE", "16000"))  # Default to 16kHz
BIT_DEPTH = 16
SILENCE_THRESHOLD = 2.0
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


class FeedbackTranscriptionBuffer:
    def __init__(self) -> None:
        self.previous_transcription: list[str] = []
        self.committed: list[str] = []
        self.uncommitted: list[str] = []
        self.N_WORDS = 7
        self.WORDS_CHECKED = 2

    @property
    def committed_text(self) -> str:
        return "".join(self.committed)

    @property
    def uncommitted_text(self) -> str:
        return "".join(self.uncommitted)

    def merge_transcription(self, new_transcription: list):
        previous_n_words = self.previous_transcription[-self.N_WORDS :]
        logger.info(f"Previous n words: {previous_n_words}")
        new_words = self._get_words(new_transcription)
        logger.info(f"New words: {new_words}")

        # If not enough previous words, just update and return
        if len(previous_n_words) < self.N_WORDS:
            logger.info("Extending previous transcription")
            self.previous_transcription = new_words
            self.uncommitted = new_words
            return

        # Reset match indices for each new merge attempt
        previous_index = -1
        new_index = -1

        # Break out of the outer loop as soon as we find a match
        found_match = False
        for i in range(0, len(new_words) - self.WORDS_CHECKED + 1):
            for j in range(2, self.N_WORDS):
                is_match = True
                # Check consecutive words
                for k in range(self.WORDS_CHECKED):
                    if (
                        i + k >= len(new_words)
                        or self.N_WORDS - j + k >= len(previous_n_words)
                        or new_words[i + k] != previous_n_words[self.N_WORDS - j + k]
                    ):
                        is_match = False
                        break

                if is_match:
                    previous_index = self.N_WORDS - j + self.WORDS_CHECKED - 1
                    new_index = i + self.WORDS_CHECKED - 1
                    found_match = True
                    break
            if found_match:
                break

        if previous_index != -1:
            offset = len(self.previous_transcription) - self.N_WORDS
            logger.info(f"Offset: {offset}")
            logger.info(f"Previous: {previous_n_words[:previous_index]}")
            logger.info(f"New: {new_words[new_index:]}")
            self.committed = self.previous_transcription[: offset + previous_index]
            self.uncommitted = new_words[new_index:]
            self.previous_transcription = self.committed + self.uncommitted
            logger.info(f"Committed: {self.committed}")
            logger.info(f"Uncommitted: {self.uncommitted}")
            logger.info(f"Previous transcription: {self.previous_transcription}")
        else:
            self.previous_transcription.extend(new_words)
            self.uncommitted = new_words

    def _get_words(self, segments: list):
        return [
            word["word"]
            for segment in segments
            for word in segment.get("words", [])
            if (
                segment.get("no_speech_prob", 0) <= 0.5  # Check both conditions
                and segment.get("avg_logprob", -1) > -1.0
            )  # Adjust threshold as needed
        ]


class FeedbackASRProcessor:
    def __init__(self) -> None:
        self.transcription_buffer = FeedbackTranscriptionBuffer()
        self.model = mlx_whisper
        self.previous_transcription: list[str] = []
        self.committed: list[str] = []
        self.uncommitted: list[str] = []
        self.audio_buffer = np.array([], dtype=np.float32)
        self.FEEDBACK_LENGTH = (
            4.0  # length of feedback audio provided in addition to the new audio
        )

    def process_new_chunk(self, audio_array: NDArray[np.float32]):
        self._trim_buffer()
        self.audio_buffer = np.concatenate([self.audio_buffer, audio_array])
        segments = self._transcribe(self.audio_buffer)
        logger.info(
            [word["word"] for segment in segments for word in segment.get("words", [])]
        )
        self.transcription_buffer.merge_transcription(segments)

    def _trim_buffer(self):
        if len(self.audio_buffer) > self.FEEDBACK_LENGTH * SAMPLING_RATE:
            self.audio_buffer = self.audio_buffer[
                -int(self.FEEDBACK_LENGTH * SAMPLING_RATE) :  # Note the negative index
            ]

    def _transcribe(self, audio_array: NDArray[np.float32]):
        return self.model.transcribe(
            audio_array,
            word_timestamps=True,
            condition_on_previous_text=False,
        ).get("segments")


class TimeSliceASRProcessor:
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
            audio_array,
            word_timestamps=True,
            initial_prompt=self.prompt_queue.prompt,
        ).get("segments")

    def _get_word_timestamps(self, segments: Any):
        return [
            (word["start"], word["end"], word["word"])
            for segment in segments
            for word in segment.get("words", [])
            if segment.get("no_speech_prob", 0) <= 0.8
        ]


class SileroVADService:
    def __init__(self, model_path: str = "models/snakers4_silero-vad_master"):
        self.model_path = Path(model_path)
        self.model_path.mkdir(parents=True, exist_ok=True)

        # Check if model files already exist
        model_file = self.model_path / "silero_vad.pt"
        utils_file = self.model_path / "utils.pt"

        torch.hub.set_dir("models")

        if not (model_file.exists() and utils_file.exists()):
            print("Downloading Silero VAD model...")
            # Download from remote
            model, utils = torch.hub.load(
                repo_or_dir="snakers4/silero-vad",
                model="silero_vad",
                force_reload=True,
                onnx=False,
            )

            # Save model and utils with weights_only=False
            torch.save(model.state_dict(), model_file)
            torch.save(utils, utils_file)
            print(f"Model saved to {self.model_path}")
        else:
            print("Loading local Silero VAD model...")

        # Load the local model
        model, _ = torch.hub.load(
            repo_or_dir=self.model_path,
            model="silero_vad",
            force_reload=False,
            onnx=False,
            source="local",
        )

        # Load with weights_only=False
        model.load_state_dict(torch.load(model_file, weights_only=False))
        utils = torch.load(utils_file, weights_only=False)

        self.model = model
        self.utils = utils
        print("Model loaded successfully")

    def get_speech_prob(self, audio_chunk, sampling_rate):
        WINDOW_SIZE = 512  # Process audio in chunks of 512 samples
        max_speech_prob = 0.0

        # Process audio in windows of 512 samples
        for i in range(0, len(audio_chunk), WINDOW_SIZE):
            window = audio_chunk[i : i + WINDOW_SIZE]

            if len(window) < WINDOW_SIZE:
                break

            # Convert window to PyTorch tensor
            window_tensor = torch.from_numpy(window).float()

            # Get speech probability for this window
            prob = self.model(window_tensor, sampling_rate).item()
            max_speech_prob = max(prob, max_speech_prob)

        return max_speech_prob


# Create a global instance
vad_service = SileroVADService()


class VADASRProcessor:
    def __init__(
        self,
        transcription_service: TranscriptionService,
        silence_threshold: float = 700,
        max_buffer_length: float = 30.0,
    ):
        self.transcription_service: TranscriptionService = transcription_service
        self.SILENCE_THRESHOLD_MS = silence_threshold
        self.MAX_BUFFER_LENGTH = max_buffer_length
        self.last_speech_ms = 0.0
        self.transcription: list[str] = []
        self.buffer_contains_speech = False
        self.audio_buffer = np.array([], dtype=np.float32)
        self.vad = vad_service

    def process_new_chunk(self, audio_data: bytes):
        # Convert bytes to numpy array of int16, then to float32
        audio_array = (
            np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
        )

        prob = self.vad.get_speech_prob(audio_array, SAMPLING_RATE)

        self.audio_buffer = np.concatenate([self.audio_buffer, audio_array])

        cur_ms = len(self.audio_buffer) / SAMPLING_RATE * 1000  # Convert to ms

        logger.info(f"Audio buffer length in ms: {cur_ms}")

        if prob > 0.9:
            # Update last speech timestamp when speech is detected
            self.last_speech_ms = cur_ms
            self.buffer_contains_speech = True

        logger.info(f"speech prob: {prob}")

        time_since_last_speech = cur_ms - self.last_speech_ms
        logger.info(f"Time since last speech: {time_since_last_speech}")

        # If the time since the last speech is greater than the silence threshold or the buffer is too long, process the buffer
        if (
            cur_ms - self.last_speech_ms > self.SILENCE_THRESHOLD_MS
            or cur_ms / 1000 > self.MAX_BUFFER_LENGTH
        ):
            transcription = self._process_buffer()

            if transcription:
                logger.info(f"Transcription: {transcription}")
                self.transcription.append(transcription)

            return transcription

    def _process_buffer(self):
        # Process the buffer here

        transcription = None

        if self.buffer_contains_speech:
            transcription = self.transcription_service.transcribe(self.audio_buffer)

        self._buffer_reset()

        return transcription

    def _buffer_reset(self):
        self.audio_buffer = np.array([], dtype=np.float32)
        self.last_speech_ms = 0.0
        self.buffer_contains_speech = False


# Dependency to ensure model is loaded
# def get_vad_service():
#     vad_service.initialize()
#     return vad_service


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    min_chunk_size: Annotated[float, Query()] = 1.0,
    language: Annotated[LanguageCode | None, Query()] = None,
):
    await websocket.accept()
    samples = np.array([], dtype=np.float32)
    PREV_N_SECONDS = 0.5
    prev_buffer = np.array([], dtype=np.float32)
    transcription_service = MLXWhisperService(
        model_name="mlx-community/whisper-large-v3-turbo"
    )
    asr = VADASRProcessor(transcription_service)
    full_audio = bytearray()
    time_wout_speech = 0.0

    try:
        while True:
            audio_data = await websocket.receive_bytes()
            if not audio_data:
                continue

            # new_chunk = (
            #     np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
            # )

            # prob = vad.get_speech_prob(
            #     new_chunk,
            #     SAMPLING_RATE,
            # )
            # logger.info(f"Probability of speech: {prob}")

            # if prob < 0.9:
            #     time_wout_speech = time_wout_speech + len(new_chunk) / SAMPLING_RATE
            #     prev_buffer = np.concatenate([prev_buffer, new_chunk])
            #     if len(prev_buffer) > PREV_N_SECONDS * SAMPLING_RATE:
            #         prev_buffer = prev_buffer[-int(PREV_N_SECONDS * SAMPLING_RATE) :]
            # else:
            #     if time_wout_speech > SILENCE_THRESHOLD:
            #         new_chunk = np.concatenate([prev_buffer, new_chunk])
            #         audio_data = (new_chunk * 32768.0).astype(np.int16).tobytes()
            #         prev_buffer = np.array([], dtype=np.float32)
            #     time_wout_speech = 0.0

            # logger.info(f"Time without speech: {time_wout_speech}")

            # if time_wout_speech > SILENCE_THRESHOLD:
            #     logger.info("Silence detected, continuing")
            #     continue

            # samples = np.concatenate([samples, new_chunk])
            full_audio.extend(audio_data)

            logger.info(f"Buffer size: {len(samples)} samples")
            logger.info(f"Received audio chunk of size: {len(audio_data)} bytes")

            # if len(samples) < SAMPLING_RATE * min_chunk_size:
            #     continue

            transcription = asr.process_new_chunk(audio_data)
            logger.info(f"Transcription: {transcription}")

            # samples = np.array([], dtype=np.float32)

            # Send a message to the client with committed and uncommitted texts
            await websocket.send_json(
                {
                    "event": "transcription",
                    "data": {
                        "committed": asr.transcription,
                        # "uncommitted": asr.transcription_buffer.uncommitted_text,
                    },
                }
            )

            if language:
                translation_service = TranslationService()

                # Create and run translation task
                # if asr.transcription_buffer.committed_text:
                #     asyncio.create_task(
                #         translation_service.translate(
                #             text=asr.transcription_buffer.committed_text,
                #             target_language=language,
                #             done_callback=lambda text: websocket.send_json(
                #                 {
                #                     "event": "translation",
                #                     "data": {
                #                         "text": text,
                #                         "language": language,
                #                     },
                #                 }
                #             ),
                #         )
                #     )

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

            full_audio_array = (
                np.frombuffer(full_audio, dtype=np.int16).astype(np.float32) / 32768.0
            )
            text = transcription_service.transcribe(full_audio_array)
            logger.info(f"Transcription: {text}")

            translation_service = TranslationService()
            translated_text = await translation_service.translate(
                text=text, target_language="zh"
            )
            logger.info(f"Translated text: {translated_text}")

            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"audio_recording_{timestamp}.wav"

            # Save as WAV file
            with wave.open(filename, "wb") as wav_file:
                wav_file.setnchannels(1)  # Mono audio
                wav_file.setsampwidth(
                    int(BYTES_PER_SAMPLE)
                )  # 2 bytes per sample (16-bit)
                wav_file.setframerate(SAMPLING_RATE)
                wav_file.writeframes(full_audio)

            logger.info(f"Saved audio recording to {filename}")
