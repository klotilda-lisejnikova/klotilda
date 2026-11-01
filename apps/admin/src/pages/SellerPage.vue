<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { sellerFields, sellerLine } from '@klotilda/domain';
import type { Seller } from '@klotilda/domain';
import PageHeader from '@/components/PageHeader.vue';
import SaveBar from '@/components/SaveBar.vue';
import { services } from '@/app/api';
import { describeError } from '@/app/errors';
import { emptyToNull, pick } from '@/app/form-values';
import { useUnsavedChanges } from '@/app/unsaved-changes';
import { formSchema, VALIDATE_ON } from '@/app/validation';

interface SellerForm {
  name: string;
  ico: string;
  address: string;
  email: string;
  phone: string;
  registration: string;
  complete: boolean;
}

const SELLER_QUERY_KEY = ['seller'];

const toast = useToast();
const queryClient = useQueryClient();
const {
  data: seller,
  isPending,
  isError,
} = useQuery({
  queryKey: SELLER_QUERY_KEY,
  queryFn: async (): Promise<Seller | null> =>
    (await services.seller.getAll({ limit: 1 })).data[0] ?? null,
});

const form = reactive<SellerForm>({
  name: '',
  ico: '',
  address: '',
  email: '',
  phone: '',
  registration: '',
  complete: false,
});
const changes = useUnsavedChanges(form);
const schema = formSchema(sellerFields, 'patch');

/** The seller as the form edits it. */
function toForm(loaded: Seller): SellerForm {
  return {
    name: loaded.name,
    ico: loaded.ico,
    address: loaded.address,
    email: loaded.email,
    phone: loaded.phone ?? '',
    registration: loaded.registration ?? '',
    complete: loaded.complete ?? false,
  };
}

watch(
  seller,
  (loaded) => {
    if (loaded) changes.load(toForm(loaded));
  },
  { immediate: true }
);

/** How the footer and the e-mails name the seller, as typed. */
const line = computed(() => sellerLine(form));

const save = useMutation({
  mutationFn: (sent: SellerForm) =>
    services.seller.update(seller.value!.id, pick(emptyToNull({ ...sent }), changes.changed.value)),
  onSuccess: (_saved, sent) => {
    changes.markSaved(sent);
    void queryClient.invalidateQueries({ queryKey: SELLER_QUERY_KEY });
    toast.add({ title: 'Uloženo', color: 'success' });
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});
</script>

<template>
  <PageHeader title="Prodávající" />

  <p class="mb-4 max-w-2xl text-sm text-muted">
    Kdo prodává. Zákon vyžaduje jméno, IČO a sídlo. E-shop je píše pod každý e-mail a do patičky
    webu. Právní texty uvádějí údaje, které platily, když se daná verze zveřejnila; nové údaje
    převezme až další zveřejněná verze.
  </p>

  <UAlert v-if="isError" title="Údaje se nepodařilo načíst." color="error" variant="soft" />
  <UAlert
    v-else-if="!isPending && !seller"
    title="Údaje prodávajícího v databázi chybí."
    description="E-maily zatím uvádějí výchozí údaje. Řádek je potřeba doplnit v databázi."
    color="warning"
    variant="soft"
  />
  <USkeleton v-else-if="!seller" class="h-96 max-w-2xl" />
  <UForm
    v-else
    :schema="schema"
    :state="form"
    :validate-on="VALIDATE_ON"
    class="max-w-2xl space-y-4"
    @submit="save.mutate({ ...form })"
  >
    <UCard>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UFormField label="Jméno" name="name" required class="sm:col-span-2">
          <UInput v-model="form.name" class="w-full" />
        </UFormField>
        <UFormField label="IČO" name="ico" required>
          <UInput v-model="form.ico" class="w-full" inputmode="numeric" />
        </UFormField>
        <UFormField label="Telefon" name="phone">
          <UInput v-model="form.phone" class="w-full" type="tel" />
        </UFormField>
        <UFormField label="Sídlo" name="address" required class="sm:col-span-2">
          <UInput v-model="form.address" class="w-full" />
        </UFormField>
        <UFormField label="E-mail" name="email" required class="sm:col-span-2">
          <UInput v-model="form.email" class="w-full" type="email" />
        </UFormField>
        <UFormField
          label="Zápis"
          name="registration"
          help="Např. fyzická osoba podnikající podle živnostenského zákona."
          class="sm:col-span-2"
        >
          <UInput v-model="form.registration" class="w-full" />
        </UFormField>
      </div>
      <p class="mt-4 text-sm text-muted">
        Pod e-maily a v patičce webu: <span class="text-highlighted">{{ line }}</span>
      </p>
      <USwitch
        v-model="form.complete"
        label="Údaje jsou úplné"
        description="Dokud nejsou, právní stránky webu upozorňují, že jde o návrh."
        class="mt-4"
      />
    </UCard>
    <SaveBar
      :dirty="changes.dirty.value"
      :saving="save.isPending.value"
      :cancel-to="{ name: 'overview' }"
    />
  </UForm>
</template>
