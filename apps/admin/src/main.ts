import '@fontsource-variable/inter';
import './assets/main.css';
import { createApp } from 'vue';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import ui from '@nuxt/ui/vue-plugin';
import { ApiError } from '@eleansphere/entity-core';
import App from './App.vue';
import { router } from './app/router';
import { onSessionExpired } from './app/api';
import { useSession } from './app/session';

const MAX_QUERY_RETRIES = 2;
const STALE_TIME_MS = 30_000;

/** Retry only what a retry can fix: a wrong request or a missing row never gets better. */
function retryQuery(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.status < 500;
  return !isClientError && failureCount < MAX_QUERY_RETRIES;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: retryQuery, staleTime: STALE_TIME_MS } },
});

onSessionExpired(() => {
  useSession().forget();
  queryClient.clear();
  void router.push({ name: 'sign-in' });
});

createApp(App).use(ui).use(VueQueryPlugin, { queryClient }).use(router).mount('#app');
