# Tyny - Real-Time Translation

Tyny is a real-time audio transcription and translation app. This project is both an exercise to gain deeper understanding of ASR and a proof of concept for a real-time transcription and translation system that could be used at live events.

In an effort to reduce compute resources and network latency, I wanted to test how well the ASR and translation models would run on the client. The initial implementation used a combination of Whisper and NLLB models running in the browser using Huggingface's Transformers.js library. Although it could perform transcription and translation, it was significantly limited by the hardware. On my M1 Macbook Pro, it wasn't real-time and could only translate one language at a time.

To circumvent these issues, I moved inference to the cloud. For ASR, I built a micro service that uses Nvidia's open-source Parakeet models, and for translation, I use DeepL's translation API. The main backend app and the ASR micro service are built with FastAPI and deployed to Google Cloud Run. The frontend is built with Nuxt and deployed to Cloudflare Pages.

## Features

- 🎙️ Real-time audio transcription (Currently only supports English)
- 🌐 Real-time multi-language translation (English to all languages supported by DeepL)
- 📱 Event "rooms" where attendees can select their preferred language and view the live translation/transcription on their personal device

## Progress

- [x] Build basic FE to display live translation/transcription
  - [x] Configure VAD, ASR, and NLLB models to run in web workers
  - [x] Let users choose audio input source (microphone or file)
  - [x] Let users choose target language for translation
  - [x] Indicate in the toolbar when speech is detected
  - [x] Notify user when models are loading on startup
  - [x] Alert user when WebGPU is not supported
- [x] Backend system to handle transcription and translation
  - [x] Add support for multiple translation languages
  - [x] Add support for Nvidia's Parakeet models
  - [x] Provide feedback to the user every second
  - [x] Allow users to create translation "rooms" that can be joined by other users
- [x] Create a frontend system to handle translation rooms

## Chores

- [x] Migrate transcription service from Modal to Cloud Run for faster startup times
- [ ] Improve UX for mobile devices
- [ ] Migrate FE to Nuxt 4
