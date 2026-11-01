<script setup lang="ts">
import { computed } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { GALLERY_ROWS } from '@klotilda/domain';
import type { GalleryItemWithImages, GalleryRow } from '@klotilda/domain';
import type { PaginatedResponse } from '@eleansphere/entity-core';
import PageHeader from '@/components/PageHeader.vue';
import { fileUrl, services } from '@/app/api';
import { describeError } from '@/app/errors';
import { focusMoveButton, moveButtonKey, moveItem, useDragReorder } from '@/app/reorder';
import type { MoveDirection } from '@/app/reorder';

type GalleryPage = PaginatedResponse<GalleryItemWithImages>;

const GALLERY_QUERY_KEY = ['gallery'];

const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending, isError } = useQuery({
  queryKey: GALLERY_QUERY_KEY,
  queryFn: () => services.gallery.getAll() as Promise<GalleryPage>,
});

/** The gallery as the landing page lays it out: row by row, each in the order set. */
const rows = computed(() =>
  GALLERY_ROWS.map((row) => ({
    row,
    items: (data.value?.data ?? []).filter((item) => item.row === row),
  }))
);

interface RowReorder {
  row: GalleryRow;
  items: GalleryItemWithImages[];
  /** An arrow's move: its button gets the focus back. */
  arrow?: { id: string; direction: MoveDirection };
}

/**
 * A row in its new order, saved at once (`reorderRow`): the page shows it before the answer and
 * goes back to the saved order if the save fails.
 */
const reorder = useMutation({
  mutationFn: ({ row, items }: RowReorder) =>
    services.gallery.reorderRow(
      row,
      items.map((item) => item.id)
    ),
  onMutate: async ({ items, arrow }) => {
    await queryClient.cancelQueries({ queryKey: GALLERY_QUERY_KEY });
    const previous = queryClient.getQueryData<GalleryPage>(GALLERY_QUERY_KEY);
    queryClient.setQueryData<GalleryPage>(GALLERY_QUERY_KEY, (page) => withOrder(page, items));
    if (arrow) void focusMoveButton(arrow.id, arrow.direction);
    return { previous };
  },
  onError: (err, _reorder, context) => {
    queryClient.setQueryData(GALLERY_QUERY_KEY, context?.previous);
    toast.add({ title: describeError(err), color: 'error' });
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: GALLERY_QUERY_KEY }),
});

/** The cached gallery with `items` (one row) numbered in their new order. */
function withOrder(
  page: GalleryPage | undefined,
  items: GalleryItemWithImages[]
): GalleryPage | undefined {
  if (!page) return page;
  const positions = new Map(items.map((item, position) => [item.id, position]));
  const data = page.data
    .map((item) => ({ ...item, sortOrder: positions.get(item.id) ?? item.sortOrder }))
    .sort(byRowThenOrder);
  return { ...page, data };
}

/** The landing page's order (`GALLERY_ORDER`). */
function byRowThenOrder(a: GalleryItemWithImages, b: GalleryItemWithImages): number {
  return a.row - b.row || a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);
}

function itemsOf(row: GalleryRow): GalleryItemWithImages[] {
  return rows.value.find((entry) => entry.row === row)?.items ?? [];
}

function move(row: GalleryRow, from: number, to: number, arrow?: RowReorder['arrow']) {
  if (reorder.isPending.value) return;
  reorder.mutate({ row, items: moveItem(itemsOf(row), from, to), arrow });
}

function moveByArrow(row: GalleryRow, index: number, direction: MoveDirection) {
  const item = itemsOf(row)[index];
  if (!item) return;
  move(row, index, direction === 'back' ? index - 1 : index + 1, { id: item.id, direction });
}

const drag = useDragReorder<GalleryRow>(move);
</script>

<template>
  <PageHeader title="Galerie">
    <template #actions>
      <UButton :to="{ name: 'gallery-new' }" icon="i-lucide-plus" label="Nová fotka" />
    </template>
  </PageHeader>

  <p class="mb-6 max-w-2xl text-sm text-muted">
    Galerie na úvodní stránce má dvě řady. Pořadí v řadě změníte přetažením fotky nebo šipkami, řadu
    v detailu fotky.
  </p>

  <UAlert v-if="isError" title="Galerii se nepodařilo načíst." color="error" variant="soft" />
  <USkeleton v-else-if="isPending" class="h-64 w-full" />
  <div v-else class="space-y-8">
    <section v-for="{ row, items } in rows" :key="row">
      <h2 class="mb-3 font-semibold text-highlighted">{{ row }}. řada</h2>
      <p v-if="items.length === 0" class="text-sm text-muted">Prázdná.</p>
      <ul
        v-else
        class="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6"
        @dragover.prevent
        @drop.prevent
      >
        <li
          v-for="(item, index) in items"
          :key="item.id"
          class="rounded-lg ring-2 ring-transparent transition"
          :class="{
            'cursor-grab': true,
            'opacity-40': drag.isDragged(row, index),
            'ring-primary': drag.isTarget(row, index),
          }"
          v-bind="drag.handlers(row, index)"
        >
          <RouterLink
            draggable="false"
            :to="{ name: 'gallery-item', params: { id: item.id } }"
            class="block overflow-hidden rounded-lg bg-default ring ring-default transition hover:ring-primary"
          >
            <div class="relative aspect-[3/4] bg-elevated">
              <img
                v-if="item.images[0]"
                draggable="false"
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
            <p class="truncate p-2 text-sm">{{ item.title_cs }}</p>
          </RouterLink>
          <div v-if="items.length > 1" class="mt-1 flex justify-center gap-1">
            <UButton
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Posunout ${item.title_cs} dopředu`"
              :disabled="index === 0"
              :data-move="moveButtonKey(item.id, 'back')"
              @click="moveByArrow(row, index, 'back')"
            />
            <UButton
              icon="i-lucide-arrow-right"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Posunout ${item.title_cs} dozadu`"
              :disabled="index === items.length - 1"
              :data-move="moveButtonKey(item.id, 'forward')"
              @click="moveByArrow(row, index, 'forward')"
            />
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
