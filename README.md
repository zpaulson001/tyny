# Tyny - Real-Time Translation

Tyny is a real-time audio transcription and translation app. This project is both an exercise to gain deeper understanding of ASR and a proof of concept for a real-time transcription and translation system that could be used at live events.

In an effort to reduce compute resources and network latency, I wanted to test how well the ASR and translation models would run on the client. The current implementation uses a combination of Whisper and NLLB models running in the browser.

Although the current implementation can perform transcription and translation, it can't quite do so in real-time and can only translate one language at a time. The next step is to build out a backend system that can leverage more efficient ASR models and perform simultaneous translations for multiple languages.

## Features

- 🎙️ Real-time audio transcription
- 🌍 Single language translation (English to all languages supported by NLLB-200)
- 💻 Fully local

## Progress

- ✅ Build basic FE to display live translation/transcription
  - ✅ Configure VAD, ASR, and NLLB models to run in web workers
  - ✅ Let users choose audio input source (microphone or file)
  - ✅ Let users choose target language for translation
  - ✅ Indicate in the toolbar when speech is detected
  - ✅ Notify user when models are loading on startup
  - ✅ Alert user when WebGPU is not supported
- ✅ Backend system to handle transcription and translation
  - ✅ Add support for multiple translation languages
  - ✅ Add support for Nvidia's Parakeet models
  - ✅ Provide feedback to the user every second
  - ✅ Allow users to create translation "rooms" that can be joined by other users
- 📝 Create a frontend system to handle the translation room

Legend:

- ✅ Completed
- 🚧 In Progress
- 📝 Planned
