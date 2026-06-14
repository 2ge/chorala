import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { widget: 'src/index.tsx' },
  format: ['iife'],
  platform: 'browser',
  target: 'es2019',
  minify: true,
  sourcemap: true,
  clean: true,
  // Single self-executing widget.js (+ map) with Preact bundled in.
  outExtension: () => ({ js: '.js' }),
  esbuildOptions(options) {
    options.jsx = 'automatic'
    options.jsxImportSource = 'preact'
    options.legalComments = 'none'
  },
})
