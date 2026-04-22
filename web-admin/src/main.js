import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import '@fortawesome/fontawesome-free/css/all.min.css'
import router from './router'
import App from './App.vue'
import './styles/theme.css'
import './styles/typography.css'
import './styles/responsive.css'

const app = createApp(App)
app.use(ElementPlus, { locale: zhCn })
app.use(router)
app.mount('#app')
