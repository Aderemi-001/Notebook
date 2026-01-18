import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        id: 'notebook-remi',
        name: 'Notebook',
        short_name: 'Notebook',
        description: 'AI study companion for students',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en-US',
        dir: 'ltr',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Daily Review',
            short_name: 'Review',
            url: '/daily-review',
            icons: [{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Create Set',
            short_name: 'Create',
            url: '/create',
            icons: [{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' }]
          }
        ],
        categories: ['education', 'productivity'],
        launch_handler: {
          client_mode: ['focus-existing', 'auto']
        },
        protocol_handlers: [
          {
            protocol: 'web+notebook',
            url: '/?protocol=%s'
          }
        ],
        file_handlers: [
          {
            action: '/',
            accept: {
              'application/pdf': ['.pdf'],
              'text/plain': ['.txt'],
              'application/json': ['.json'],
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png']
            }
          }
        ],
        share_target: {
          action: '/create',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
        note_taking: {
          new_note_url: '/notebook/new'
        },
        widgets: [
          {
            name: "Notebook Stats",
            description: "Quick look at your study progress",
            tag: "notebook-stats",
            ms_ac_template: "widget-template.json",
            data: "widget-data.json",
            type: "application/json",
            screenshots: [
              {
                src: "/pwa-512.png",
                sizes: "512x512",
                type: "image/png",
                label: "Stats Widget"
              }
            ],
            icons: [
              {
                src: "/pwa-192.png",
                sizes: "192x192",
                type: "image/png"
              }
            ]
          }
        ],
        edge_side_panel: {
          preferred_width: 400
        }
      } as any,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        importScripts: ['/periodic-sync-handler.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              backgroundSync: {
                name: 'sync-queue',
                options: {
                  maxRetentionTime: 60 * 24 // 24 hours
                }
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfjs': ['pdfjs-dist'],
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            '@supabase/supabase-js',
            '@tanstack/react-query',
            'lucide-react'
          ],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['unpdf', 'pdfjs-dist']
  },
}));