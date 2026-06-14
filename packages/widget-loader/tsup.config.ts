import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { loader: 'src/loader.ts' },
  format: ['iife'],
  platform: 'browser',
  target: 'es2015',
  minify: true,
  sourcemap: false,
  clean: true,
  outExtension: () => ({ js: '.js' }),
})
