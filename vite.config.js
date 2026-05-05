import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/AppPortal/%E3%82%B8%E3%83%A0%E8%A8%98%E9%8C%B2%E3%82%A2%E3%83%97%E3%83%AA/',
})
