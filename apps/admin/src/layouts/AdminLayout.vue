<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';
import type { RouteLocationRaw } from 'vue-router';
import { useSession } from '@/app/session';
import { PAGE_ACTIONS_ID, PAGE_HEADING_ID } from '@/components/page-header';
import AdminSearch from './AdminSearch.vue';
import BrandMark from '@/components/BrandMark.vue';

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

/** The sidebar as a slide-over on phones and tablets. */
const sidebarOpen = ref(false);

const navigation = computed<NavigationMenuItem[]>(() =>
  NAV_ITEMS.map((item) => ({
    label: item.label,
    icon: item.icon,
    to: item.to,
    active: isCurrent(item),
    // The phone's slide-over closes on its own only when the route changes.
    onSelect: () => {
      sidebarOpen.value = false;
    },
  }))
);

/** The sections in the search palette: plain links, without the nav's active state. */
const searchPages = NAV_ITEMS.map((item) => ({ label: item.label, icon: item.icon, to: item.to }));

const queryClient = useQueryClient();

async function signOut() {
  await session.signOut();
  queryClient.clear();
  await router.push({ name: 'sign-in' });
}

const email = computed(() => session.admin.value?.email ?? '');
const accountMenu = computed<DropdownMenuItem[][]>(() => [
  [{ type: 'label', label: email.value }],
  [{ label: 'Odhlásit se', icon: 'i-lucide-log-out', onSelect: () => void signOut() }],
]);
</script>

<template>
  <UDashboardGroup unit="rem" storage="local" storage-key="klotilda-admin">
    <UDashboardSidebar
      id="sidebar"
      v-model:open="sidebarOpen"
      collapsible
      :default-size="15"
      :min-size="12"
      :max-size="20"
      :collapsed-size="4"
      resizable
      :ui="{ root: 'bg-elevated/40', footer: 'border-t border-default py-3' }"
    >
      <template #header="{ collapsed }">
        <RouterLink :to="{ name: 'overview' }" class="flex min-w-0 items-center gap-2">
          <BrandMark />
          <span v-if="!collapsed" class="truncate">
            <span class="font-semibold text-highlighted">Klotilda</span>
            <span class="ml-1 text-xs text-muted">admin</span>
          </span>
        </RouterLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" tooltip class="bg-default ring-default" />
        <UNavigationMenu
          :items="navigation"
          :collapsed="collapsed"
          orientation="vertical"
          tooltip
          aria-label="Hlavní"
        />
      </template>

      <template #footer="{ collapsed }">
        <div
          class="flex w-full min-w-0 items-center gap-1.5"
          :class="{ 'flex-col-reverse': collapsed }"
        >
          <UDropdownMenu
            :items="accountMenu"
            :content="{ align: 'start', side: 'top' }"
            :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
          >
            <UButton
              :avatar="{ text: email.charAt(0).toUpperCase(), size: 'xs' }"
              :label="collapsed ? undefined : email"
              :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
              color="neutral"
              variant="ghost"
              :square="collapsed"
              class="min-w-0 flex-1"
              :ui="{ label: 'truncate', trailingIcon: 'ms-auto text-dimmed' }"
              aria-label="Účet"
            />
          </UDropdownMenu>
          <!-- Stays when collapsed: the only light/dark switch on a desktop. -->
          <UColorModeButton />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="main" :ui="{ body: 'block p-4 pb-24 sm:p-6 sm:pb-24 lg:pb-8' }">
      <template #header>
        <UDashboardNavbar :ui="{ left: 'flex-1' }">
          <template #leading>
            <UDashboardSidebarCollapse class="hidden lg:inline-flex" />
            <!-- The page's back arrow and title: see PageHeader.vue. -->
            <div :id="PAGE_HEADING_ID" class="flex min-w-0 flex-1 items-center gap-1.5" />
          </template>
          <template #right>
            <div :id="PAGE_ACTIONS_ID" class="flex items-center gap-2" />
            <!-- Below lg the sidebar is a slide-over: the search stays one tap away up here. -->
            <UDashboardSearchButton collapsed class="lg:hidden" />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <!-- Keyed by path: new and edit share a form, which must not keep the other's state. -->
        <RouterView v-slot="{ Component, route: current }">
          <component :is="Component" :key="current.path" />
        </RouterView>
      </template>
    </UDashboardPanel>

    <AdminSearch :pages="searchPages" />

    <!-- Phone and tablet: the sections along the bottom edge. -->
    <nav
      class="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-default bg-default/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
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
  </UDashboardGroup>
</template>
