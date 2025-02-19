import { defineStore } from 'pinia';

const useTranscriptionStore = defineStore('transcription', {
  state: () => ({
    committed: '',
    uncommitted: '',
  }),
});

export default useTranscriptionStore;
