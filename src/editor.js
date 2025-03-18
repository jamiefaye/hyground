import './assets/main.css'
import { createApp } from 'vue'
import router from './router/index.js'
import App from './Hyground.vue'

createApp(App)
.use(router)
.mount('#app')
router.push({name: 'editor'})