<template>
  <main>
    <AudioStreamer />
    <div class="transcription-container">
      <TranscriptionBox class="transcription-box" />
      <TranslationBox class="transcription-box" />
    </div>
  </main>
</template>

<style scoped>
main {
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 800px;
  height: 100%;
  border: 1px solid red;
}

.transcription-box {
  width: 100%;
}

.transcription-container {
  display: flex;
  gap: 1rem;
}
</style>
