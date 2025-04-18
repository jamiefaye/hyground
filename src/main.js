import './assets/main.css'
import { createApp } from 'vue'
import router from './router/index.js'
import App from './Hyground.vue'

createApp(App)
.use(router)
.mount('#app')

const urlParams = new URLSearchParams(window.location.search);  
const myParam = urlParams.get('edit');
if (myParam) router.push({name: 'editor'});