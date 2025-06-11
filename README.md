# Tyny - Real-Time Translation API

Tyny is a real-time audio transcription and translation API. It's built with FastAPI and leverages different Whisper-based models to handle transcription. As Whisper is not designed for real-time transcription, a group of researches devised a solution as outlined in a paper titled [_Turning Whisper into Real-Time Transcription System_](https://aclanthology.org/2023.ijcnlp-demo.3.pdf) and its accompanying [GitHub repo](https://github.com/ufal/whisper_streaming?tab=readme-ov-file). This project is both an exercise to gain deeper understanding of the paper and the implementation and a proof of concept for a real-time transcription and translation system that could be used at live events.

## Features

- 🎙️ Real-time audio transcription
- 🌍 Multi-language translation support
- ⚡ Built with FastAPI and Faster Whisper
- 🔄 WebSocket streaming support

## Hurdles

- Audio conversion from browser to server
  - Browser's Media Recorder API only supports lossy formats such as (audio/webm audio/mp4, etc.) at 44.1kHz or 48kHz, but Whisper expects audio as float32 PCM with a sample rate of 16kHz.

## Progress

- ✅ Basic FastAPI server setup
- ✅ WebSocket endpoint
- ✅ Real-time audio streaming from browser to server in 100ms chunks (save chunks as WAV files on WebSocket disconnect)
- ✅ Whisper model transcription
- ✅ Test different methods of audio chunking (Breaking at pauses, breaking every x amount of time)
- ✅ Write script to stream audio files to the server for testing and evaluation
- 🚧 Translation service integration
  - 🚧 Try running NLLB in web workers on the client
- 🚧 Test hosting VAD and ASR models on BE vs FE
- 🚧 Build basic FE to display live translation/transcription
- 📝 Add support for Nvidia's Parakeet models

Legend:

- ✅ Completed
- 🚧 In Progress
- 📝 Planned
