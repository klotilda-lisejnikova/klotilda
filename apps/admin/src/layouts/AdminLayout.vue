<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';
import type { RouteLocationRaw } from 'vue-router';
import { useSession } from '@/app/session';
import { confirmLeave, hasUnsavedChanges } from '@/app/unsaved-changes';
import { PAGE_ACTIONS_ID, PAGE_HEADING_ID } from '@/components/page-header';
import AdminSearch from './AdminSearch.vue';
import BrandMark from '@/components/BrandMark.vue';

interface NavItem {
  to: RouteLocationRaw;
  label: string;
  icon: string;
  exact?: boolean;
  /** Under "Nastavení" in the sidebar; not on the phone's bottom bar, which holds five. */
  settings?: boolean;
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
  { to: { name: 'shipping-methods' }, label: 'Doprava', icon: 'i-lucide-truck', settings: true },
  { to: { name: 'payment-methods' }, label: 'Platby', icon: 'i-lucide-wallet', settings: true },
  { to: { name: 'email-templates' }, label: 'E-maily', icon: 'i-lucide-mail', settings: true },
  { to: { name: 'seller' }, label: 'Prodávající', icon: 'i-lucide-store', settings: true },
  { to: { name: 'site-texts' }, label: 'Texty webu', icon: 'i-lucide-type', settings: true },
  {
    to: { name: 'legal-documents' },
    label: 'Právní texty',
    icon: 'i-lucide-scale',
    settings: true,
  },
];
const BOTTOM_BAR_ITEMS = NAV_ITEMS.filter((item) => !item.settings);

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

function toNavigationItem(item: NavItem): NavigationMenuItem {
  return {
    label: item.label,
    icon: item.icon,
    to: item.to,
    active: isCurrent(item),
    // The phone's slide-over closes on its own only when the route changes.
    onSelect: () => {
      sidebarOpen.value = false;
    },
  };
}

/** The sections, then the shop's settings under their own heading. */
const navigation = computed<NavigationMenuItem[][]>(() => [
  NAV_ITEMS.filter((item) => !item.settings).map(toNavigationItem),
  [
    { label: 'Nastavení', type: 'label' },
    ...NAV_ITEMS.filter((item) => item.settings).map(toNavigationItem),
  ],
]);

/** The sections in the search palette: plain links, without the nav's active state. */
const searchPages = NAV_ITEMS.map((item) => ({ label: item.label, icon: item.icon, to: item.to }));

const queryClient = useQueryClient();

async function signOut() {
  if (hasUnsavedChanges.value && !(await confirmLeave())) return;
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

    <!--
      Below lg the bottom padding clears the bottom nav, which also keeps a form's save bar above
      it; the scroll padding keeps a focused field clear of both.
    -->
    <UDashboardPanel
      id="main"
      :ui="{
        body: 'block scroll-pb-40 p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:scroll-pb-24 lg:pb-8',
      }"
    >
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
        v-for="item in BOTTOM_BAR_ITEMS"
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
