<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import type { FileDto } from '@eleansphere/entity-core';
import { fileUrl } from '@/app/api';
import { describeError } from '@/app/errors';
import { moveItem, useDragReorder } from '@/app/reorder';
import { resizePhoto } from '@/app/resize-image';

/** What `withImages` adds to a product's or gallery item's service; products also reorder. */
interface PhotoService {
  uploadImage(refId: string, file: Blob, sortOrder?: number): Promise<FileDto>;
  deleteImage(fileId: string): Promise<void>;
  reorderImages?(refId: string, ids: string[]): Promise<void>;
}

/** A photo on its way up, shown from the computer's copy until the upload finishes. */
interface PendingPhoto {
  key: string;
  url: string;
}

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

const props = defineProps<{
  service: PhotoService;
  /** The saved row the photos belong to. */
  refId: string;
  photos: FileDto[];
  /** One photo only (a gallery picture): a new one replaces it. */
  single?: boolean;
}>();
const emit = defineEmits<{ changed: [] }>();

const toast = useToast();
const busy = ref(false);
/** The photos as shown: moved at once on a reorder, before the server confirms it. */
const ordered = ref<FileDto[]>([...props.photos]);
const pending = ref<PendingPhoto[]>([]);
/** What the drop zone holds; emptied again as soon as the upload starts. */
const chosen = ref<File[] | File | null>(null);

watch(
  () => props.photos,
  (photos) => (ordered.value = [...photos])
);

/** Products reorder their photos; a gallery picture has just one. */
const canReorder = computed(() => !props.single && props.service.reorderImages !== undefined);

const drag = useDragReorder<'photos'>((_group, from, to) => move(from, to));

async function run(task: () => Promise<void>) {
  busy.value = true;
  try {
    await task();
  } catch (err) {
    toast.add({ title: describeError(err), color: 'error' });
  } finally {
    busy.value = false;
    emit('changed');
  }
}

function showPending(files: File[]) {
  pending.value = files.map((file, index) => ({
    key: `${index}-${file.name}`,
    url: URL.createObjectURL(file),
  }));
}

function clearPending() {
  for (const photo of pending.value) URL.revokeObjectURL(photo.url);
  pending.value = [];
}

onBeforeUnmount(clearPending);

function upload(value: File[] | File | null | undefined) {
  const files = value ? [value].flat() : [];
  chosen.value = null;
  if (files.length === 0 || busy.value) return;
  const picked = props.single ? files.slice(0, 1) : files;
  showPending(picked);
  void run(async () => {
    try {
      await uploadAll(picked);
    } finally {
      clearPending();
    }
    toast.add({ title: picked.length > 1 ? 'Fotky nahrány' : 'Fotka nahrána', color: 'success' });
  });
}

/**
 * Every file is scaled down before anything is sent, so a file the browser can't read changes
 * nothing; a replaced photo is deleted only once its successor is up. New photos go after the
 * last one.
 */
async function uploadAll(files: File[]) {
  const resized: Blob[] = [];
  for (const file of files) resized.push(await resizePhoto(file));
  const replaced = props.single ? [...props.photos] : [];
  const start = props.single
    ? 0
    : Math.max(-1, ...props.photos.map((photo) => photo.sortOrder)) + 1;
  for (const [index, photo] of resized.entries()) {
    await props.service.uploadImage(props.refId, photo, start + index);
  }
  for (const photo of replaced) await props.service.deleteImage(photo.id);
}

function rejected() {
  toast.add({ title: 'Nahrát jde jen fotka (JPG, PNG nebo WebP).', color: 'error' });
}

function remove(photo: FileDto) {
  void run(async () => {
    await props.service.deleteImage(photo.id);
    toast.add({ title: 'Fotka smazána', color: 'success' });
  });
}

/** Shows the new order at once; a refused one puts the saved order back. */
function move(from: number, to: number) {
  const reorder = props.service.reorderImages;
  if (!reorder || busy.value) return;
  ordered.value = moveItem(ordered.value, from, to);
  const ids = ordered.value.map((photo) => photo.id);
  void run(async () => {
    try {
      await reorder.call(props.service, props.refId, ids);
    } catch (err) {
      ordered.value = [...props.photos];
      throw err;
    }
  });
}
</script>

<template>
  <div class="space-y-4">
    <ul
      v-if="ordered.length || pending.length"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3"
      :aria-busy="busy"
      @dragover.prevent
      @drop.prevent
    >
      <li
        v-for="(photo, index) in ordered"
        :key="photo.id"
        class="group relative overflow-hidden rounded-lg bg-elevated ring-2 ring-transparent transition"
        :class="{
          'cursor-grab': canReorder && !busy,
          'opacity-40': drag.isDragged('photos', index),
          'ring-primary': drag.isTarget('photos', index),
        }"
        v-bind="canReorder && !busy ? drag.handlers('photos', index) : {}"
      >
        <img
          :src="fileUrl(photo)"
          alt=""
          class="pointer-events-none aspect-[3/4] w-full object-cover"
        />
        <UBadge
          v-if="!single && index === 0"
          label="Hlavní"
          color="neutral"
          variant="solid"
          size="sm"
          class="absolute top-2 left-2"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="solid"
          size="xs"
          class="absolute top-2 right-2"
          aria-label="Smazat fotku"
          :disabled="busy"
          @click="remove(photo)"
        />
        <div v-if="canReorder && ordered.length > 1" class="absolute right-2 bottom-2 flex gap-1">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="solid"
            size="xs"
            aria-label="Posunout dopředu"
            :disabled="busy || index === 0"
            @click="move(index, index - 1)"
          />
          <UButton
            icon="i-lucide-arrow-right"
            color="neutral"
            variant="solid"
            size="xs"
            aria-label="Posunout dozadu"
            :disabled="busy || index === ordered.length - 1"
            @click="move(index, index + 1)"
          />
        </div>
      </li>
      <li
        v-for="photo in pending"
        :key="photo.key"
        class="relative overflow-hidden rounded-lg bg-elevated"
      >
        <img :src="photo.url" alt="" class="aspect-[3/4] w-full object-cover opacity-50" />
        <UIcon
          name="i-lucide-loader-circle"
          class="absolute inset-0 m-auto size-8 animate-spin text-highlighted"
        />
      </li>
    </ul>

    <UFileUpload
      v-model="chosen"
      :accept="ACCEPTED_TYPES"
      :multiple="!single"
      :preview="false"
      reset
      :disabled="busy"
      icon="i-lucide-image-up"
      :label="
        single && ordered.length
          ? 'Přetáhněte sem novou fotku'
          : single
            ? 'Přetáhněte sem fotku'
            : 'Přetáhněte sem fotky'
      "
      description="nebo klikněte a vyberte je v počítači (JPG, PNG, WebP)"
      class="min-h-32"
      @update:model-value="upload"
      @reject="rejected"
    />
    <p class="text-xs text-muted">
      <template v-if="!single">
        První fotka je hlavní. Pořadí změníte přetažením fotky nebo šipkami.
      </template>
      Fotky se před nahráním zmenší na web (delší strana 2048 px, WebP). Na webu se zobrazují na
      výšku 3 : 4, fotka na šířku se po stranách ořízne.
    </p>
  </div>
</template>
