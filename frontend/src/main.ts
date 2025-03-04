import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import App from './App.vue';
import router from './router';
import Aura from '@primevue/themes/aura';
import './assets/main.css';
// PrimeVue components
import Card from 'primevue/card';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import Select from 'primevue/select';
import Message from 'primevue/message';
import Toolbar from 'primevue/toolbar';
import InputNumber from 'primevue/inputnumber';
import IftaLabel from 'primevue/iftalabel';
import AudioStreamer from '@/components/AudioStreamer.vue';
import TranscriptionBox from '@/components/TranscriptionBox.vue';
import TranslationBox from '@/components/TranslationBox.vue';
import 'primeicons/primeicons.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(createPinia());
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});

// Register PrimeVue components
app.component('Card', Card);
app.component('Button', Button);
app.component('ButtonGroup', ButtonGroup);
app.component('Select', Select);
app.component('Message', Message);
app.component('Toolbar', Toolbar);
app.component('InputNumber', InputNumber);
app.component('IftaLabel', IftaLabel);
app.component('TranscriptionBox', TranscriptionBox);
app.component('TranslationBox', TranslationBox);
app.component('AudioStreamer', AudioStreamer);
app.mount('#app');
