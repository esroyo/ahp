// @ts-check
import { defineConfig } from 'astro/config';
import denoAstro from '@deno/astro-adapter';
import denoVite from "@deno/vite-plugin";

// https://astro.build/config
export default defineConfig({
    adapter: denoAstro(),
    image: {
        layout: 'full-width',
        responsiveStyles: true,
    },
    output: 'static',
    vite: {
      plugins: [denoVite()],
    },
});
