<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useRouter } from 'vue-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { GALLERY_ROWS, galleryItemFields } from '@klotilda/domain';
import type { GalleryItemWithImages, GalleryRow } from '@klotilda/domain';
import ConfirmDelete from '@/components/ConfirmDelete.vue';
import PageHeader from '@/components/PageHeader.vue';
import PhotoManager from '@/components/PhotoManager.vue';
import { services } from '@/app/api';
import { describeError } from '@/app/errors';
import { emptyToNull } from '@/app/form-values';
import { NO_CATEGORY, toCategoryChoice, toCategoryId, useCategories } from '@/app/categories';
import { formSchema, VALIDATE_ON } from '@/app/validation';

const props = defineProps<{ id?: string }>();

interface GalleryForm {
  title_cs: string;
  title_en: string;
  categoryId: string;
  row: GalleryRow;
  sortOrder: number;
  active: boolean;
}

const EMPTY_FORM: GalleryForm = {
  title_cs: '',
  title_en: '',
  categoryId: NO_CATEGORY,
  row: GALLERY_ROWS[0],
  sortOrder: 0,
  active: true,
};

const toast = useToast();
const router = useRouter();
const queryClient = useQueryClient();
const isNew = computed(() => !props.id);
const { selectItems } = useCategories();
const categoryItems = computed(() => [
  { value: NO_CATEGORY, label: 'Bez kategorie' },
  ...selectItems.value,
]);
const rowItems = GALLERY_ROWS.map((row) => ({ value: row, label: `${row}. řada` }));
const form = reactive<GalleryForm>({ ...EMPTY_FORM });

/** The category is picked from a list that also offers "none", so the form doesn't check it. */
const { categoryId: _categoryId, ...checkedFields } = galleryItemFields;
const schema = computed(() => formSchema(checkedFields, isNew.value ? 'create' : 'patch'));

function toValues() {
  return emptyToNull({
    ...form,
    categoryId: toCategoryId(form.categoryId),
  });
}

const {
  data: item,
  isError,
  refetch,
} = useQuery({
  queryKey: ['gallery-item', () => props.id],
  queryFn: () => services.gallery.getById(props.id!) as Promise<GalleryItemWithImages>,
  enabled: () => !isNew.value,
});

watch(
  item,
  (loaded) => {
    if (!loaded) return Object.assign(form, EMPTY_FORM);
    Object.assign(form, {
      title_cs: loaded.title_cs,
      title_en: loaded.title_en ?? '',
      categoryId: toCategoryChoice(loaded.categoryId),
      row: loaded.row,
      sortOrder: loaded.sortOrder,
      active: loaded.active,
    });
  },
  { immediate: true }
);

const save = useMutation({
  mutationFn: () =>
    props.id ? services.gallery.update(props.id, toValues()) : services.gallery.create(toValues()),
  onSuccess: async (saved) => {
    void queryClient.invalidateQueries({ queryKey: ['gallery'] });
    const title = isNew.value ? 'Uloženo. Teď nahrajte fotku.' : 'Uloženo';
    toast.add({ title, color: 'success' });
    if (isNew.value) {
      await router.replace({ name: 'gallery-item', params: { id: saved.id } });
    } else {
      await refetch();
    }
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

const remove = useMutation({
  mutationFn: () => services.gallery.delete(props.id!),
  onSuccess: async () => {
    void queryClient.invalidateQueries({ queryKey: ['gallery'] });
    toast.add({ title: 'Smazáno', color: 'success' });
    await router.push({ name: 'gallery' });
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

function photoChanged() {
  void refetch();
  void queryClient.invalidateQueries({ queryKey: ['gallery'] });
}
</script>

<template>
  <PageHeader
    :title="isNew ? 'Nová fotka do galerie' : form.title_cs || 'Galerie'"
    :back="{ name: 'gallery' }"
  >
    <template v-if="item" #actions>
      <ConfirmDelete
        :question="`Smazat ${item.title_cs} z galerie?`"
        detail="Smaže se i fotka."
        :loading="remove.isPending.value"
        @confirm="remove.mutate()"
      />
    </template>
  </PageHeader>

  <UAlert v-if="isError" title="Fotku se nepodařilo načíst." color="error" variant="soft" />
  <div v-else class="grid max-w-5xl gap-4 lg:grid-cols-5">
    <UForm
      :schema="schema"
      :state="form"
      :validate-on="VALIDATE_ON"
      class="space-y-4 lg:col-span-3"
      @submit="save.mutate()"
    >
      <UCard>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField label="Název" name="title_cs" required>
            <UInput v-model="form.title_cs" class="w-full" />
          </UFormField>
          <UFormField label="Název anglicky" name="title_en">
            <UInput v-model="form.title_en" class="w-full" />
          </UFormField>
          <UFormField label="Kategorie" name="categoryId" help="Jen štítek u fotky.">
            <USelect v-model="form.categoryId" :items="categoryItems" class="w-full" />
          </UFormField>
          <UFormField label="Řada" name="row">
            <USelect v-model="form.row" :items="rowItems" class="w-full" />
          </UFormField>
          <UFormField label="Pořadí v řadě" name="sortOrder" help="Nižší číslo je dřív.">
            <UInputNumber v-model="form.sortOrder" :min="0" class="w-full" />
          </UFormField>
        </div>
        <USwitch
          v-model="form.active"
          label="Na webu"
          description="Vypnutá fotka se v galerii nezobrazí."
          class="mt-4"
        />
      </UCard>
      <div class="flex gap-2">
        <UButton
          type="submit"
          label="Uložit"
          icon="i-lucide-save"
          :loading="save.isPending.value"
        />
        <UButton :to="{ name: 'gallery' }" label="Zrušit" color="neutral" variant="ghost" />
      </div>
    </UForm>

    <UCard class="lg:col-span-2">
      <template #header><h2 class="font-semibold">Fotka</h2></template>
      <PhotoManager
        v-if="item"
        :service="services.gallery"
        :ref-id="item.id"
        :photos="item.images"
        single
        @changed="photoChanged"
      />
      <p v-else class="text-sm text-muted">Fotku nahrajete, jakmile položku uložíte.</p>
    </UCard>
  </div>
</template>
