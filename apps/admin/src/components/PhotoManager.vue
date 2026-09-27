<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import type { FileDto } from '@eleansphere/entity-core';
import { fileUrl } from '@/app/api';
import { describeError } from '@/app/errors';
import { resizePhoto } from '@/app/resize-image';

/** What `withImages` adds to a product's or gallery item's service. */
interface PhotoService {
  uploadImage(refId: string, file: Blob, sortOrder?: number): Promise<FileDto>;
  deleteImage(fileId: string): Promise<void>;
}

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
const input = ref<HTMLInputElement | null>(null);

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

function upload(event: Event) {
  const files = [...((event.target as HTMLInputElement).files ?? [])];
  if (input.value) input.value.value = '';
  if (files.length === 0) return;
  void run(async () => {
    const chosen = props.single ? files.slice(0, 1) : files;
    if (props.single) {
      for (const photo of props.photos) await props.service.deleteImage(photo.id);
    }
    const start = props.single ? 0 : props.photos.length;
    for (const [index, file] of chosen.entries()) {
      await props.service.uploadImage(props.refId, await resizePhoto(file), start + index);
    }
    toast.add({ title: chosen.length > 1 ? 'Fotky nahrány' : 'Fotka nahrána', color: 'success' });
  });
}

function remove(photo: FileDto) {
  void run(async () => {
    await props.service.deleteImage(photo.id);
    toast.add({ title: 'Fotka smazána', color: 'success' });
  });
}
</script>

<template>
  <div class="space-y-4">
    <ul v-if="photos.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <li
        v-for="(photo, index) in photos"
        :key="photo.id"
        class="group relative overflow-hidden rounded-lg bg-elevated"
      >
        <img :src="fileUrl(photo)" alt="" class="aspect-[3/4] w-full object-cover" />
        <UBadge
          v-if="!single && index === 0"
          label="Hlavní"
          color="neutral"
          variant="solid"
          size="sm"
          class="absolute bottom-2 left-2"
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
      </li>
    </ul>
    <p v-else class="text-sm text-muted">Zatím žádná fotka.</p>

    <input
      ref="input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      :multiple="!single"
      class="sr-only"
      @change="upload"
    />
    <UButton
      icon="i-lucide-upload"
      :label="single && photos.length ? 'Nahradit fotku' : single ? 'Nahrát fotku' : 'Přidat fotky'"
      color="neutral"
      variant="outline"
      :loading="busy"
      @click="input?.click()"
    />
    <p class="text-xs text-muted">
      Fotky se před nahráním zmenší na web (delší strana 2048 px, WebP). Na webu se zobrazují na
      výšku 3 : 4, fotka na šířku se po stranách ořízne.
    </p>
  </div>
</template>
