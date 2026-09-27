<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { GALLERY_ROWS } from '@klotilda/domain';
import type { GalleryItemWithImages } from '@klotilda/domain';
import type { PaginatedResponse } from '@eleansphere/entity-core';
import PageHeader from '@/components/PageHeader.vue';
import { fileUrl, services } from '@/app/api';

const { data, isPending, isError } = useQuery({
  queryKey: ['gallery'],
  queryFn: () => services.gallery.getAll() as Promise<PaginatedResponse<GalleryItemWithImages>>,
});

/** The gallery as the landing page lays it out: row by row, each in the order set. */
const rows = computed(() =>
  GALLERY_ROWS.map((row) => ({
    row,
    items: (data.value?.data ?? []).filter((item) => item.row === row),
  }))
);
</script>

<template>
  <PageHeader title="Galerie">
    <template #actions>
      <UButton :to="{ name: 'gallery-new' }" icon="i-lucide-plus" label="Nová fotka" />
    </template>
  </PageHeader>

  <p class="mb-6 max-w-2xl text-sm text-muted">
    Galerie na úvodní stránce má dvě řady. V každé jdou fotky podle pořadí (nižší číslo dřív).
  </p>

  <UAlert v-if="isError" title="Galerii se nepodařilo načíst." color="error" variant="soft" />
  <USkeleton v-else-if="isPending" class="h-64 w-full" />
  <div v-else class="space-y-8">
    <section v-for="{ row, items } in rows" :key="row">
      <h2 class="mb-3 font-semibold text-highlighted">{{ row }}. řada</h2>
      <p v-if="items.length === 0" class="text-sm text-muted">Prázdná.</p>
      <ul v-else class="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6">
        <li v-for="item in items" :key="item.id">
          <RouterLink
            :to="{ name: 'gallery-item', params: { id: item.id } }"
            class="block overflow-hidden rounded-lg bg-default ring ring-default transition hover:ring-primary"
          >
            <div class="relative aspect-[3/4] bg-elevated">
              <img
                v-if="item.images[0]"
                :src="fileUrl(item.images[0])"
                alt=""
                class="h-full w-full object-cover"
                :class="{ 'opacity-50': !item.active }"
              />
              <UIcon
                v-else
                name="i-lucide-image"
                class="absolute inset-0 m-auto size-8 text-dimmed"
              />
              <UBadge
                v-if="!item.active"
                label="Skrytá"
                color="neutral"
                variant="solid"
                class="absolute top-2 left-2"
              />
            </div>
            <p class="flex justify-between gap-2 p-2 text-sm">
              <span class="truncate">{{ item.title_cs }}</span>
              <span class="text-muted tabular-nums">{{ item.sortOrder }}</span>
            </p>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
