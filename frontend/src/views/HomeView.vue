<template>
  <main>
    <AudioStreamer />
    <TranscriptionBox class="transcription-box" />
  </main>
</template>

<style scoped>
main {
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 800px;
}

.transcription-box {
  width: 100%;
}
</style>
