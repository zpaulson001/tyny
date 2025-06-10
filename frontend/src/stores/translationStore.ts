import { defineStore } from 'pinia';

const useTranslationStore = defineStore('translation', {
  state: () => ({
    zh: '',
  }),
});

export default useTranslationStore;
