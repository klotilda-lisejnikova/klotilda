<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import { useSession } from '@/app/session';

const NAV_ITEMS = [
  { to: { name: 'orders' }, label: 'Objednávky', icon: 'i-lucide-receipt' },
  { to: { name: 'products' }, label: 'Produkty', icon: 'i-lucide-package' },
  { to: { name: 'categories' }, label: 'Kategorie', icon: 'i-lucide-tags' },
  { to: { name: 'gallery' }, label: 'Galerie', icon: 'i-lucide-images' },
] as const;

const session = useSession();
const router = useRouter();
const queryClient = useQueryClient();

async function signOut() {
  await session.signOut();
  queryClient.clear();
  await router.push({ name: 'sign-in' });
}
</script>

<template>
  <div class="min-h-dvh bg-muted md:flex">
    <aside
      class="sticky top-0 z-10 flex items-center gap-2 border-b border-default bg-default px-4 py-2 md:h-dvh md:w-60 md:flex-col md:items-stretch md:border-r md:border-b-0 md:px-3 md:py-5"
    >
      <div class="mr-auto md:mr-0 md:mb-6 md:px-3">
        <span class="text-lg font-semibold tracking-wide text-highlighted">Klotilda</span>
        <span class="ml-1 text-xs text-muted">admin</span>
      </div>
      <nav class="flex gap-1 md:flex-1 md:flex-col" aria-label="Hlavní">
        <RouterLink
          v-for="item in NAV_ITEMS"
          :key="item.label"
          v-slot="{ href, navigate, isActive }"
          :to="item.to"
          custom
        >
          <UButton
            :href="href"
            :icon="item.icon"
            :label="item.label"
            :color="isActive ? 'primary' : 'neutral'"
            :variant="isActive ? 'soft' : 'ghost'"
            class="md:w-full"
            :ui="{ label: 'max-sm:sr-only' }"
            @click="navigate"
          />
        </RouterLink>
      </nav>
      <div class="md:border-t md:border-default md:pt-4">
        <p class="hidden truncate px-3 pb-2 text-xs text-muted md:block">
          {{ session.admin.value?.email }}
        </p>
        <UButton
          icon="i-lucide-log-out"
          label="Odhlásit se"
          color="neutral"
          variant="ghost"
          class="md:w-full"
          :ui="{ label: 'max-sm:sr-only' }"
          @click="signOut"
        />
      </div>
    </aside>
    <main class="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
      <RouterView />
    </main>
  </div>
</template>
