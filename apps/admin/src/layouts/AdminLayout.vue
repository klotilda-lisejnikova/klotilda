<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import type { RouteLocationRaw } from 'vue-router';
import { useSession } from '@/app/session';

interface NavItem {
  to: RouteLocationRaw;
  label: string;
  icon: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: { name: 'overview' },
    label: 'Přehled',
    icon: 'i-lucide-layout-dashboard',
    // Every page sits under "/": only the overview itself counts as being there.
    exact: true,
  },
  { to: { name: 'orders' }, label: 'Objednávky', icon: 'i-lucide-receipt' },
  { to: { name: 'products' }, label: 'Produkty', icon: 'i-lucide-package' },
  { to: { name: 'categories' }, label: 'Kategorie', icon: 'i-lucide-tags' },
  { to: { name: 'gallery' }, label: 'Galerie', icon: 'i-lucide-images' },
];

const session = useSession();
const router = useRouter();
const route = useRoute();

/** A section is lit on its list and on everything under it: `/orders` and `/orders/ord…`. */
function isCurrent(item: NavItem): boolean {
  const path = router.resolve(item.to).path;
  return item.exact ? route.path === path : route.path.startsWith(path);
}
const queryClient = useQueryClient();

async function signOut() {
  await session.signOut();
  queryClient.clear();
  await router.push({ name: 'sign-in' });
}
</script>

<template>
  <div class="min-h-dvh bg-muted md:flex">
    <!-- Phone: the name, light/dark and sign-out on top, the sections along the bottom edge. -->
    <header
      class="sticky top-0 z-10 flex items-center border-b border-default bg-default px-4 py-2 md:hidden"
    >
      <RouterLink :to="{ name: 'overview' }" class="mr-auto font-semibold text-highlighted">
        Klotilda <span class="text-xs font-normal text-muted">admin</span>
      </RouterLink>
      <UColorModeButton />
      <UButton
        icon="i-lucide-log-out"
        color="neutral"
        variant="ghost"
        aria-label="Odhlásit se"
        @click="signOut"
      />
    </header>

    <!-- Desktop: a sidebar. -->
    <aside
      class="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-default bg-default px-3 py-5 md:flex"
    >
      <RouterLink :to="{ name: 'overview' }" class="mb-6 px-3">
        <span class="text-lg font-semibold text-highlighted">Klotilda</span>
        <span class="ml-1 text-xs text-muted">admin</span>
      </RouterLink>
      <nav class="flex flex-1 flex-col gap-1" aria-label="Hlavní">
        <RouterLink
          v-for="item in NAV_ITEMS"
          :key="item.label"
          v-slot="{ href, navigate }"
          :to="item.to"
          custom
        >
          <UButton
            :href="href"
            :icon="item.icon"
            :label="item.label"
            :color="isCurrent(item) ? 'primary' : 'neutral'"
            :variant="isCurrent(item) ? 'soft' : 'ghost'"
            class="w-full"
            @click="navigate"
          />
        </RouterLink>
      </nav>
      <div class="border-t border-default pt-4">
        <UColorModeSelect class="mb-3 w-full" aria-label="Vzhled" />
        <p class="truncate px-3 pb-2 text-xs text-muted">{{ session.admin.value?.email }}</p>
        <UButton
          icon="i-lucide-log-out"
          label="Odhlásit se"
          color="neutral"
          variant="ghost"
          class="w-full"
          @click="signOut"
        />
      </div>
    </aside>

    <main class="min-w-0 flex-1 px-4 pt-6 pb-24 md:px-8 md:py-8">
      <RouterView />
    </main>

    <nav
      class="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-default bg-default pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Hlavní"
    >
      <RouterLink
        v-for="item in NAV_ITEMS"
        :key="item.label"
        v-slot="{ href, navigate }"
        :to="item.to"
        custom
      >
        <a
          :href="href"
          class="flex flex-col items-center gap-0.5 py-2 text-[0.65rem]"
          :class="isCurrent(item) ? 'text-primary' : 'text-muted'"
          :aria-current="isCurrent(item) ? 'page' : undefined"
          @click="navigate"
        >
          <UIcon :name="item.icon" class="size-5" />
          {{ item.label }}
        </a>
      </RouterLink>
    </nav>
  </div>
</template>
