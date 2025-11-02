import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/store/authStore'
import App from './App.vue'
import router from './router'
import { initializeDefaultSettings } from '@/utils/initializeSettings'
import 'material-symbols'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'
import './firebase'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const authStore = useAuthStore()
authStore.init() // 👈 start listening for auth changes

// Initialize default settings (safe - only creates if not exists)
initializeDefaultSettings().catch(console.error)

app.mount('#app')
