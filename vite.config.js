import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** mode=gas → single-file for Apps Script HtmlService; default → GitHub Pages */
export default defineConfig(({ mode }) => {
  const isGas = mode === 'gas';

  return {
    base: isGas ? './' : '/GovTaskPro/',
    plugins: isGas
      ? [react(), tailwindcss(), viteSingleFile()]
      : [react(), tailwindcss()],
    build: isGas
      ? {
          outDir: 'dist-gas',
          emptyOutDir: true,
          assetsInlineLimit: 100000000,
          cssCodeSplit: false,
          modulePreload: false,
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
            },
          },
        }
      : {
          outDir: 'dist',
          emptyOutDir: true,
          // Stable filenames so cached index.html does not 404 after redeploy
          rollupOptions: {
            output: {
              entryFileNames: 'assets/app.js',
              chunkFileNames: 'assets/[name].js',
              assetFileNames: 'assets/[name][extname]',
            },
          },
        },
  };
});
