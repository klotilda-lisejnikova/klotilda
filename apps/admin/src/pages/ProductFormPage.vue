<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useRouter } from 'vue-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { DEFAULT_STOCK_COUNT, productFields } from '@klotilda/domain';
import type { ProductCategory, ProductWithImages } from '@klotilda/domain';
import ConfirmDelete from '@/components/ConfirmDelete.vue';
import PageHeader from '@/components/PageHeader.vue';
import PhotoManager from '@/components/PhotoManager.vue';
import { services } from '@/app/api';
import { describeError } from '@/app/errors';
import { emptyToNull, nullToEmpty } from '@/app/form-values';
import { CATEGORY_LABELS, toSelectItems } from '@/app/labels';
import { formSchema, VALIDATE_ON } from '@/app/validation';

const props = defineProps<{ id?: string }>();

interface ProductForm {
  name_cs: string;
  name_en: string;
  description_cs: string;
  description_en: string;
  price: number | undefined;
  category: ProductCategory;
  stockCount: number;
  active: boolean;
}

const EMPTY_FORM: ProductForm = {
  name_cs: '',
  name_en: '',
  description_cs: '',
  description_en: '',
  price: undefined,
  category: 'keramika',
  stockCount: DEFAULT_STOCK_COUNT,
  active: true,
};

const toast = useToast();
const router = useRouter();
const queryClient = useQueryClient();
const isNew = computed(() => !props.id);
const schema = computed(() => formSchema(productFields, isNew.value ? 'create' : 'patch'));
const categoryItems = toSelectItems(CATEGORY_LABELS);
const form = reactive<ProductForm>({ ...EMPTY_FORM });

const {
  data: product,
  isError,
  refetch,
} = useQuery({
  queryKey: ['product', () => props.id],
  queryFn: () => services.products.getById(props.id!) as Promise<ProductWithImages>,
  enabled: () => !isNew.value,
});

watch(
  product,
  (loaded) => {
    if (!loaded) return Object.assign(form, EMPTY_FORM);
    Object.assign(
      form,
      nullToEmpty({
        name_cs: loaded.name_cs,
        name_en: loaded.name_en,
        description_cs: loaded.description_cs,
        description_en: loaded.description_en,
      }),
      {
        price: loaded.price,
        category: loaded.category ?? EMPTY_FORM.category,
        stockCount: loaded.stockCount,
        active: loaded.active,
      }
    );
  },
  { immediate: true }
);

const save = useMutation({
  mutationFn: () => {
    const values = { ...emptyToNull({ ...form }), price: form.price ?? 0 };
    return props.id ? services.products.update(props.id, values) : services.products.create(values);
  },
  onSuccess: async (saved) => {
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    const title = isNew.value ? 'Uloženo. Teď můžete přidat fotky.' : 'Uloženo';
    toast.add({ title, color: 'success' });
    if (isNew.value) {
      await router.replace({ name: 'product', params: { id: saved.id } });
    } else {
      await refetch();
    }
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

const remove = useMutation({
  mutationFn: () => services.products.delete(props.id!),
  onSuccess: async () => {
    void queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.add({ title: 'Produkt smazán', color: 'success' });
    await router.push({ name: 'products' });
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});

function photosChanged() {
  void refetch();
  void queryClient.invalidateQueries({ queryKey: ['products'] });
}
</script>

<template>
  <PageHeader
    :title="isNew ? 'Nový produkt' : form.name_cs || 'Produkt'"
    :back="{ name: 'products' }"
  >
    <template v-if="product" #actions>
      <ConfirmDelete
        :question="`Smazat produkt ${product.name_cs}?`"
        detail="Smažou se i jeho fotky. Objednávky, ve kterých je, zůstanou."
        :loading="remove.isPending.value"
        @confirm="remove.mutate()"
      />
    </template>
  </PageHeader>

  <UAlert v-if="isError" title="Produkt se nepodařilo načíst." color="error" variant="soft" />
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
          <UFormField label="Název" name="name_cs" required>
            <UInput v-model="form.name_cs" class="w-full" />
          </UFormField>
          <UFormField label="Název anglicky" name="name_en">
            <UInput v-model="form.name_en" class="w-full" />
          </UFormField>
          <UFormField label="Popis" name="description_cs">
            <UTextarea v-model="form.description_cs" :rows="5" autoresize class="w-full" />
          </UFormField>
          <UFormField label="Popis anglicky" name="description_en">
            <UTextarea v-model="form.description_en" :rows="5" autoresize class="w-full" />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <UFormField label="Cena (Kč)" name="price" required>
            <UInputNumber v-model="form.price" :min="0" :step="10" class="w-full" />
          </UFormField>
          <UFormField label="Kategorie" name="category">
            <USelect v-model="form.category" :items="categoryItems" class="w-full" />
          </UFormField>
          <UFormField label="Kusů skladem" name="stockCount">
            <UInputNumber v-model="form.stockCount" :min="0" class="w-full" />
          </UFormField>
        </div>
        <USwitch
          v-model="form.active"
          label="V nabídce"
          description="Vypnutý produkt na webu není vidět."
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
        <UButton :to="{ name: 'products' }" label="Zrušit" color="neutral" variant="ghost" />
      </div>
    </UForm>

    <UCard class="lg:col-span-2">
      <template #header><h2 class="font-semibold">Fotky</h2></template>
      <PhotoManager
        v-if="product"
        :service="services.products"
        :ref-id="product.id"
        :photos="product.images"
        @changed="photosChanged"
      />
      <p v-else class="text-sm text-muted">Fotky přidáte, jakmile produkt uložíte.</p>
    </UCard>
  </div>
</template>
