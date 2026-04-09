import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import router from './router'
import App from './App.vue'
import './styles/theme.css'

const app = createApp(App)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
