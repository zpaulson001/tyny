import asyncio
import os
import sys
from pathlib import Path
import modal

app = modal.App("parakeet-transcriber")

# ## Volume for caching model weights

# We use a [Modal Volume](https://modal.com/docs/guide/volumes) to cache the model weights.
# This allows us to avoid downloading the model weights every time we start a new instance.

# For more on storing models on Modal, see [this guide](https://modal.com/docs/guide/model-weights).

model_cache = modal.Volume.from_name("parakeet-model-cache", create_if_missing=True)

# ## Configuring dependencies

# The model runs remotely inside a container on Modal. We can define the environment
# and install our Python dependencies in that container's [`Image`](https://modal.com/docs/guide/images).

# For finicky setups like NeMO's, we recommend using the official NVIDIA CUDA Docker images from Docker Hub.
# You'll need to install Python and pip with the `add_python` option because the image
# doesn't have these by default.

image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.8.0-cudnn-devel-ubuntu22.04", add_python="3.12"
    )
    .env(
        {
            "HF_HUB_ENABLE_HF_TRANSFER": "1",
            "HF_HOME": "/cache",  # cache directory for Hugging Face models
            "DEBIAN_FRONTEND": "noninteractive",
            "CXX": "g++",
            "CC": "g++",
        }
    )
    # .apt_install("ffmpeg")
    .pip_install(
        "hf_transfer==0.1.9",
        "huggingface_hub[hf-xet]==0.31.2",
        "nemo_toolkit[asr]==2.3.1",
        "cuda-python==12.8.0",
        "fastapi==0.116.0",
        "numpy<2",
    )
    .entrypoint([])  # silence chatty logs by container on start
)

END_OF_STREAM = (
    b"END_OF_STREAM_8f13d09"  # byte sequence indicating a stream is finished
)


@app.cls(volumes={"/cache": model_cache}, gpu="t4", image=image)
# @modal.concurrent(max_inputs=14, target_inputs=10)
class Parakeet:
    @modal.enter()
    def load(self):
        import logging

        import nemo.collections.asr as nemo_asr

        # silence chatty logs from nemo
        logging.getLogger("nemo_logger").setLevel(logging.CRITICAL)

        self.model = nemo_asr.models.ASRModel.from_pretrained(
            model_name="nvidia/parakeet-tdt-0.6b-v2"
        )

    def transcribe(self, audio_bytes: bytes) -> str:
        import numpy as np

        audio_data = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32)

        with NoStdStreams():  # hide output, see https://github.com/NVIDIA/NeMo/discussions/3281#discussioncomment-2251217
            output = self.model.transcribe([audio_data])

        return output[0].text

    @modal.asgi_app(requires_proxy_auth=True)
    def web(self):
        from fastapi import FastAPI, Response, Body
        from typing import Annotated

        web_app = FastAPI()

        @web_app.get("/status")
        async def status():
            return Response(status_code=200)

        @web_app.post("/transcribe")
        async def transcribe(
            raw_data: Annotated[bytes, Body(media_type="application/octet-stream")],
        ):
            return {"text": self.transcribe(raw_data)}

        return web_app


class NoStdStreams(object):
    def __init__(self):
        self.devnull = open(os.devnull, "w")

    def __enter__(self):
        self._stdout, self._stderr = sys.stdout, sys.stderr
        self._stdout.flush(), self._stderr.flush()
        sys.stdout, sys.stderr = self.devnull, self.devnull

    def __exit__(self, exc_type, exc_value, traceback):
        sys.stdout, sys.stderr = self._stdout, self._stderr
        self.devnull.close()
