import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';

export default defineConfig({
  plugins: [
    vue(),
    ui({
      ui: {
        // Moss and stone, like the website.
        colors: { primary: 'green', neutral: 'stone' },
        // Every field keeps a line free under it for its error or help text. A message that
        // appears or goes (a number committed on blur, say) then never moves the save button
        // away from under the pointer mid-click.
        formField: {
          slots: {
            root: 'pb-6',
            error: 'absolute inset-x-0 top-full mt-1 truncate',
            help: 'absolute inset-x-0 top-full mt-1 truncate',
          },
        },
      },
      // Bundle the icons the sources name instead of fetching them from the Iconify API.
      icon: {
        clientBundle: { scan: { globInclude: ['src/**/*.{vue,ts}'] } },
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5175,
  },
});
