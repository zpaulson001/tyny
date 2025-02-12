# Tyny - Real-Time Translation API

Tyny is a real-time audio transcription and translation API. It's built with FastAPI and leverages different Whisper-based models to handle transcription.

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
- 🚧 Whisper model transcription
- 📝 Translation service integration
- 📝 Proper frontend app

Legend:

- ✅ Completed
- 🚧 In Progress
- 📝 Planned
