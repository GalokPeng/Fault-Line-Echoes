import { defineConfig } from 'vite'
import { handleRooms, localCache } from './server/signaling.js'

export default defineConfig({
  plugins: [
    {
      name: 'local-room-service',
      configureServer(server) {
        server.middlewares.use('/api/rooms', handleRooms(localCache()))
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/rooms', handleRooms(localCache()))
      },
    },
  ],
  build: {
    target: 'es2022',
    license: { fileName: 'licenses/third-party.md' },
    chunkSizeWarningLimit: 850,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/three/')) return 'three'
          if (id.includes('/rapier3d-compat/')) return 'physics'
        },
      },
    },
  },
})
