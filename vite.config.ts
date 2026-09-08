import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

const isElectron = process.env.ELECTRON === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(isElectron
      ? [
          electron([
            {
              entry: 'electron/main.ts',
              vite: {
                build: {
                  outDir: 'dist-electron',
                },
              },
            },
            {
              entry: 'electron/preload.ts',
              onstart(options) {
                options.reload();
              },
              vite: {
                build: {
                  outDir: 'dist-electron',
                  rollupOptions: {
                    output: {
                      format: 'cjs',
                      entryFileNames: 'preload.cjs',
                    },
                  },
                },
              },
            },
          ]),
          renderer(),
        ]
      : []),
  ],
});
