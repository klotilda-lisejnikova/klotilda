// The saved light/dark choice (Nuxt UI keeps it under this key), applied before the first paint.
// A file of its own, not inline, so the Content-Security-Policy can allow only the site's scripts.
try {
  const mode = localStorage.getItem('vueuse-color-scheme') || 'auto';
  const dark =
    mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
} catch {
  // Storage blocked (private mode): the page follows the light default until the app starts.
}
