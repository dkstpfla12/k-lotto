/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages: https://<계정>.github.io/k-lotto/ 에 배포되므로 base를 저장소 이름에 맞춘다.
export default defineConfig({
  base: '/k-lotto/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
