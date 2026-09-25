import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

const isElectron = process.env.ELECTRON === 'true';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
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
                  // The plugin defaults to ESM because package.json is "type": "module",
                  // but Electron can only load a sandboxed preload as CommonJS.
                  lib: {
                    entry: 'electron/preload.ts',
                    formats: ['cjs'],
                    fileName: () => 'preload.cjs',
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
