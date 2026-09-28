<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { ApiError } from '@eleansphere/entity-core';
import { categoryFields, toSlug } from '@klotilda/domain';
import type { Category } from '@klotilda/domain';
import ConfirmDelete from '@/components/ConfirmDelete.vue';
import PageHeader from '@/components/PageHeader.vue';
import { services } from '@/app/api';
import { CATEGORIES_QUERY_KEY, useCategories } from '@/app/categories';
import { describeError } from '@/app/errors';
import { emptyToNull } from '@/app/form-values';
import { formSchema, VALIDATE_ON } from '@/app/validation';

interface CategoryForm {
  name_cs: string;
  name_en: string;
  slug: string;
}

interface Usage {
  products: number;
  gallery: number;
}

const CONFLICT = 409;
const EMPTY_FORM: CategoryForm = { name_cs: '', name_en: '', slug: '' };

const toast = useToast();
const queryClient = useQueryClient();
const { categories, isPending, isError } = useCategories();

/** How many products and gallery pictures sit in each category: one in use can't be deleted. */
const { data: usage } = useQuery({
  queryKey: ['category-usage', () => categories.value.map((category) => category.id)],
  enabled: () => categories.value.length > 0,
  queryFn: async (): Promise<Record<string, Usage>> => {
    const counts = await Promise.all(
      categories.value.map(async (category) => {
        const filter = { categoryId: category.id };
        const [products, gallery] = await Promise.all([
          services.products.getAll({ filter, limit: 1 }),
          services.gallery.getAll({ filter, limit: 1 }),
        ]);
        return [category.id, { products: products.total, gallery: gallery.total }] as const;
      })
    );
    return Object.fromEntries(counts);
  },
});

const inUse = (category: Category) => {
  const counts = usage.value?.[category.id];
  return !counts || counts.products + counts.gallery > 0;
};

/** Czech: 1 produkt, 2–4 produkty, 5 produktů. */
function countProducts(count: number): string {
  if (count === 1) return '1 produkt';
  return count >= 2 && count <= 4 ? `${count} produkty` : `${count} produktů`;
}

function describeUsage(category: Category): string {
  const counts = usage.value?.[category.id];
  if (!counts) return '';
  if (counts.products + counts.gallery === 0) return 'prázdná';
  const products = countProducts(counts.products);
  return counts.gallery ? `${products} · ${counts.gallery} v galerii` : products;
}

function refresh() {
  void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ['category-usage'] });
  void queryClient.invalidateQueries({ queryKey: ['products'] });
  void queryClient.invalidateQueries({ queryKey: ['gallery'] });
}

// ── The dialog for adding and renaming ──────────────────────────────
const editing = ref<Category | null>(null);
const dialogOpen = ref(false);
const form = reactive<CategoryForm>({ ...EMPTY_FORM });
/** A new category's slug follows its name until the admin edits the slug. */
const slugTouched = ref(false);
const isNew = computed(() => editing.value === null);
const schema = computed(() => formSchema(categoryFields, isNew.value ? 'create' : 'patch'));

function openDialog(category: Category | null) {
  editing.value = category;
  Object.assign(form, {
    name_cs: category?.name_cs ?? '',
    name_en: category?.name_en ?? '',
    slug: category?.slug ?? '',
  });
  slugTouched.value = category !== null;
  dialogOpen.value = true;
}

watch(
  () => form.name_cs,
  (name) => {
    if (!slugTouched.value) form.slug = toSlug(name);
  }
);

const nextSortOrder = computed(
  () => Math.max(-1, ...categories.value.map((category) => category.sortOrder ?? 0)) + 1
);

const save = useMutation({
  mutationFn: () => {
    const values = emptyToNull({ ...form });
    return editing.value
      ? services.categories.update(editing.value.id, values)
      : services.categories.create({ ...values, sortOrder: nextSortOrder.value });
  },
  onSuccess: () => {
    refresh();
    dialogOpen.value = false;
    toast.add({ title: 'Uloženo', color: 'success' });
  },
  onError: (err) =>
    toast.add({
      title:
        err instanceof ApiError && err.status === CONFLICT
          ? 'Kategorie s touto adresou už existuje.'
          : describeError(err),
      color: 'error',
    }),
});

// ── Order and deleting ──────────────────────────────────────────────
const reorder = useMutation({
  mutationFn: async (ordered: Category[]) => {
    const changed = ordered.filter((category, index) => category.sortOrder !== index);
    await Promise.all(
      changed.map((category) =>
        services.categories.update(category.id, { sortOrder: ordered.indexOf(category) })
      )
    );
  },
  onSettled: refresh,
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

function move(index: number, by: -1 | 1) {
  const ordered = [...categories.value];
  const [moved] = ordered.splice(index, 1);
  ordered.splice(index + by, 0, moved);
  reorder.mutate(ordered);
}

const remove = useMutation({
  mutationFn: (category: Category) => services.categories.delete(category.id),
  onSuccess: () => {
    refresh();
    toast.add({ title: 'Kategorie smazána', color: 'success' });
  },
  onError: (err) =>
    toast.add({
      title:
        err instanceof ApiError && err.status === CONFLICT
          ? 'V kategorii ještě něco je. Přesuňte to nejdřív jinam.'
          : describeError(err),
      color: 'error',
    }),
});
</script>

<template>
  <PageHeader title="Kategorie">
    <template #actions>
      <UButton icon="i-lucide-plus" label="Nová kategorie" @click="openDialog(null)" />
    </template>
  </PageHeader>

  <p class="mb-4 max-w-2xl text-sm text-muted">
    Kategorie nabízí e-shop jako filtry a galerie jako štítky u fotek. Na webu se ukážou jen ty, ve
    kterých je něco v nabídce, v pořadí jako tady.
  </p>

  <UAlert v-if="isError" title="Kategorie se nepodařilo načíst." color="error" variant="soft" />
  <div v-else-if="isPending" class="max-w-3xl space-y-2">
    <USkeleton v-for="line in 3" :key="line" class="h-16 w-full" />
  </div>
  <UCard v-else-if="categories.length === 0" class="max-w-3xl text-center text-sm text-muted">
    Zatím žádné kategorie.
  </UCard>
  <ul
    v-else
    class="max-w-3xl divide-y divide-default overflow-hidden rounded-lg bg-default ring ring-default"
  >
    <li
      v-for="(category, index) in categories"
      :key="category.id"
      class="flex items-center gap-3 px-4 py-3"
    >
      <div class="flex shrink-0 flex-col">
        <UButton
          icon="i-lucide-chevron-up"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="index === 0 || reorder.isPending.value"
          :aria-label="`Posunout ${category.name_cs} výš`"
          @click="move(index, -1)"
        />
        <UButton
          icon="i-lucide-chevron-down"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="index === categories.length - 1 || reorder.isPending.value"
          :aria-label="`Posunout ${category.name_cs} níž`"
          @click="move(index, 1)"
        />
      </div>

      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        <div class="mr-auto min-w-0">
          <p class="font-medium break-words text-highlighted">
            {{ category.name_cs }}
            <span v-if="category.name_en" class="ml-1 font-normal text-muted">
              · {{ category.name_en }}
            </span>
          </p>
          <p class="text-xs break-words text-muted">
            <code>?category={{ category.slug }}</code>
            <template v-if="describeUsage(category)"> · {{ describeUsage(category) }}</template>
          </p>
        </div>

        <div class="flex gap-1">
          <UButton
            icon="i-lucide-pencil"
            label="Upravit"
            color="neutral"
            variant="soft"
            @click="openDialog(category)"
          />
          <UTooltip v-if="inUse(category)" text="Kategorii, ve které něco je, nejde smazat.">
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              disabled
              aria-label="Smazat"
            />
          </UTooltip>
          <ConfirmDelete
            v-else
            compact
            :question="`Smazat kategorii ${category.name_cs}?`"
            :loading="remove.isPending.value"
            @confirm="remove.mutate(category)"
          />
        </div>
      </div>
    </li>
  </ul>

  <UModal
    v-model:open="dialogOpen"
    :title="isNew ? 'Nová kategorie' : `Upravit ${editing?.name_cs}`"
  >
    <template #body>
      <UForm
        id="category-form"
        :schema="schema"
        :state="form"
        :validate-on="VALIDATE_ON"
        class="space-y-4"
        @submit="save.mutate()"
      >
        <UFormField label="Název" name="name_cs" required>
          <UInput v-model="form.name_cs" class="w-full" autofocus />
        </UFormField>
        <UFormField label="Název anglicky" name="name_en">
          <UInput v-model="form.name_en" class="w-full" />
        </UFormField>
        <UFormField
          label="Adresa v e-shopu"
          name="slug"
          required
          :help="
            isNew
              ? `Vyplní se z názvu: /shop?category=${form.slug || '…'}`
              : 'Po změně přestanou fungovat staré odkazy na tuto kategorii.'
          "
        >
          <UInput v-model="form.slug" class="w-full" @update:model-value="slugTouched = true" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Zrušit" color="neutral" variant="ghost" @click="dialogOpen = false" />
        <UButton
          type="submit"
          form="category-form"
          label="Uložit"
          icon="i-lucide-save"
          :loading="save.isPending.value"
        />
      </div>
    </template>
  </UModal>
</template>
