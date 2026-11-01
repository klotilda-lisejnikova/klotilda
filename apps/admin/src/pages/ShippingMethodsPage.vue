<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { ApiError } from '@eleansphere/entity-core';
import {
  SHIPPING_KINDS,
  shippingMethodFields,
  TRACKING_NUMBER_PLACEHOLDER,
  toCode,
} from '@klotilda/domain';
import type { ShippingKind, ShippingMethod } from '@klotilda/domain';
import ConfirmDelete from '@/components/ConfirmDelete.vue';
import PageHeader from '@/components/PageHeader.vue';
import { services } from '@/app/api';
import { describeError } from '@/app/errors';
import { emptyToNull } from '@/app/form-values';
import { formatCzk } from '@/app/format';
import { SHIPPING_KIND_LABELS } from '@/app/labels';
import { moveButtonKey, useDragReorder, useListReorder } from '@/app/reorder';
import { SHIPPING_METHODS_QUERY_KEY, useShippingMethods } from '@/app/shipping-methods';
import { formSchema, VALIDATE_ON } from '@/app/validation';

interface MethodForm {
  name_cs: string;
  name_en: string;
  code: string;
  description_cs: string;
  description_en: string;
  price: number | undefined;
  kind: ShippingKind;
  trackingUrl: string;
  active: boolean;
}

const CONFLICT = 409;
const PRICE_STEP = 10;
const EMPTY_FORM: MethodForm = {
  name_cs: '',
  name_en: '',
  code: '',
  description_cs: '',
  description_en: '',
  price: undefined,
  kind: 'delivery',
  trackingUrl: '',
  active: true,
};
const KIND_ITEMS = SHIPPING_KINDS.map((kind) => ({
  value: kind,
  label: SHIPPING_KIND_LABELS[kind],
}));

const toast = useToast();
const queryClient = useQueryClient();
const { methods, isPending, isError } = useShippingMethods();

function refresh() {
  void queryClient.invalidateQueries({ queryKey: SHIPPING_METHODS_QUERY_KEY });
}

// ── The dialog for adding and editing ───────────────────────────────
const editing = ref<ShippingMethod | null>(null);
const dialogOpen = ref(false);
const form = reactive<MethodForm>({ ...EMPTY_FORM });
/** A new method's code follows its name until the admin edits the code. */
const codeTouched = ref(false);
const isNew = computed(() => editing.value === null);
const schema = computed(() => formSchema(shippingMethodFields, isNew.value ? 'create' : 'patch'));

function openDialog(method: ShippingMethod | null) {
  editing.value = method;
  Object.assign(form, {
    name_cs: method?.name_cs ?? '',
    name_en: method?.name_en ?? '',
    code: method?.code ?? '',
    description_cs: method?.description_cs ?? '',
    description_en: method?.description_en ?? '',
    price: method?.price ?? undefined,
    kind: method?.kind ?? EMPTY_FORM.kind,
    trackingUrl: method?.trackingUrl ?? '',
    active: method?.active ?? true,
  });
  codeTouched.value = method !== null;
  dialogOpen.value = true;
}

watch(
  () => form.name_cs,
  (name) => {
    if (!codeTouched.value) form.code = toCode(name);
  }
);

const nextSortOrder = computed(
  () => Math.max(-1, ...methods.value.map((method) => method.sortOrder ?? 0)) + 1
);

const save = useMutation({
  mutationFn: () => {
    const values = emptyToNull({
      ...form,
      price: form.price ?? 0,
      // A pickup has no parcel to follow.
      trackingUrl: form.kind === 'pickup' ? '' : form.trackingUrl,
    });
    return editing.value
      ? services.shippingMethods.update(editing.value.id, values)
      : services.shippingMethods.create({ ...values, sortOrder: nextSortOrder.value });
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
          ? 'Doprava s tímto kódem už existuje.'
          : describeError(err),
      color: 'error',
    }),
});

// ── In the shop or not ──────────────────────────────────────────────
const switching = reactive(new Set<string>());

const setActive = useMutation({
  mutationFn: ({ method, active }: { method: ShippingMethod; active: boolean }) =>
    services.shippingMethods.update(method.id, { active }),
  onMutate: ({ method }) => {
    switching.add(method.id);
  },
  onSuccess: (_saved, { active }) =>
    toast.add({ title: active ? 'Doprava je v nabídce' : 'Doprava skryta', color: 'success' }),
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
  onSettled: (_saved, _err, { method }) => {
    switching.delete(method.id);
    refresh();
  },
});

// ── Order and deleting ──────────────────────────────────────────────
const { move, moveByArrow } = useListReorder({
  queryKey: SHIPPING_METHODS_QUERY_KEY,
  items: () => methods.value,
  save: (ids) => services.shippingMethods.reorder(ids),
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
  onSettled: refresh,
});

const drag = useDragReorder<'methods'>((_group, from, to) => move(from, to));

const remove = useMutation({
  mutationFn: (method: ShippingMethod) => services.shippingMethods.delete(method.id),
  onSuccess: () => {
    refresh();
    toast.add({ title: 'Doprava smazána', color: 'success' });
  },
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
});
</script>

<template>
  <PageHeader title="Doprava">
    <template #actions>
      <UButton icon="i-lucide-plus" label="Nová doprava" @click="openDialog(null)" />
    </template>
  </PageHeader>

  <p class="mb-4 max-w-2xl text-sm text-muted">
    Způsoby dopravy, které e-shop nabízí v pokladně, v pořadí jako tady. Cenu účtuje pokladna podle
    toho, co je nastavené tady. Objednávky si pamatují název a cenu z doby objednání, takže úprava
    ani smazání dopravy starší objednávky nezmění.
  </p>

  <UAlert
    v-if="isError"
    title="Způsoby dopravy se nepodařilo načíst."
    color="error"
    variant="soft"
  />
  <div v-else-if="isPending" class="max-w-3xl space-y-2">
    <USkeleton v-for="line in 3" :key="line" class="h-16 w-full" />
  </div>
  <UCard v-else-if="methods.length === 0" class="max-w-3xl text-center text-sm text-muted">
    Zatím žádná doprava. Bez ní nejde objednat.
  </UCard>
  <ul
    v-else
    class="max-w-3xl divide-y divide-default overflow-hidden rounded-lg bg-default ring ring-default"
    @dragover.prevent
    @drop.prevent
  >
    <li
      v-for="(method, index) in methods"
      :key="method.id"
      class="flex items-center gap-3 bg-default px-4 py-3 transition"
      :class="{
        'opacity-40': drag.isDragged('methods', index),
        'bg-elevated': drag.isTarget('methods', index),
      }"
      data-drag-item
      v-bind="drag.target('methods', index)"
    >
      <span
        class="hidden shrink-0 cursor-grab text-dimmed sm:block"
        aria-hidden="true"
        v-bind="drag.source('methods', index)"
      >
        <UIcon name="i-lucide-grip-vertical" class="block size-4" />
      </span>
      <div class="flex shrink-0 flex-col">
        <UButton
          icon="i-lucide-chevron-up"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="index === 0"
          :aria-label="`Posunout ${method.name_cs} výš`"
          :data-move="moveButtonKey(method.id, 'back')"
          @click="moveByArrow(index, 'back')"
        />
        <UButton
          icon="i-lucide-chevron-down"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="index === methods.length - 1"
          :aria-label="`Posunout ${method.name_cs} níž`"
          :data-move="moveButtonKey(method.id, 'forward')"
          @click="moveByArrow(index, 'forward')"
        />
      </div>

      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        <div class="mr-auto min-w-0">
          <p class="font-medium break-words text-highlighted">
            {{ method.name_cs }}
            <span class="ml-1 font-normal text-muted tabular-nums">
              · {{ method.price === 0 ? 'zdarma' : formatCzk(method.price) }}
            </span>
          </p>
          <p class="text-xs break-words text-muted">
            {{ SHIPPING_KIND_LABELS[method.kind] }} · <code>{{ method.code }}</code>
            <template v-if="method.trackingUrl"> · se sledováním zásilky</template>
          </p>
        </div>

        <div class="flex items-center gap-1">
          <USwitch
            :model-value="method.active ?? true"
            :loading="switching.has(method.id)"
            label="V nabídce"
            size="sm"
            class="mr-2"
            :ui="{ label: 'whitespace-nowrap' }"
            @update:model-value="(active) => setActive.mutate({ method, active })"
          />
          <UButton
            icon="i-lucide-pencil"
            label="Upravit"
            color="neutral"
            variant="soft"
            @click="openDialog(method)"
          />
          <ConfirmDelete
            compact
            :question="`Smazat dopravu ${method.name_cs}?`"
            :loading="remove.isPending.value"
            @confirm="remove.mutate(method)"
          />
        </div>
      </div>
    </li>
  </ul>

  <UModal v-model:open="dialogOpen" :title="isNew ? 'Nová doprava' : `Upravit ${editing?.name_cs}`">
    <template #body>
      <UForm
        id="shipping-method-form"
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
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Cena (Kč)" name="price" required help="0 znamená zdarma.">
            <UInputNumber v-model="form.price" :min="0" :step="PRICE_STEP" class="w-full" />
          </UFormField>
          <UFormField label="Druh" name="kind" required>
            <USelect v-model="form.kind" :items="KIND_ITEMS" class="w-full" />
          </UFormField>
        </div>
        <UFormField
          label="Popis v pokladně"
          name="description_cs"
          help="Nepovinné, např. jak dlouho doručení trvá."
        >
          <UTextarea v-model="form.description_cs" :rows="2" autoresize class="w-full" />
        </UFormField>
        <UFormField label="Popis anglicky" name="description_en">
          <UTextarea v-model="form.description_en" :rows="2" autoresize class="w-full" />
        </UFormField>
        <UFormField
          v-if="form.kind === 'delivery'"
          label="Odkaz na sledování zásilky"
          name="trackingUrl"
          :help="`Místo čísla zásilky napište ${TRACKING_NUMBER_PLACEHOLDER}. Zákazník dostane odkaz v e-mailu o odeslání.`"
        >
          <UInput
            v-model="form.trackingUrl"
            class="w-full"
            :placeholder="`https://tracking.packeta.com/cs/?id=${TRACKING_NUMBER_PLACEHOLDER}`"
          />
        </UFormField>
        <UFormField
          label="Kód"
          name="code"
          required
          :help="
            isNew
              ? 'Vyplní se z názvu. Objednávky dopravu poznají podle něj.'
              : 'Po změně kódu musí zákazník s rozpracovanou objednávkou dopravu vybrat znovu a dosud neodeslané objednávky ztratí odkaz na sledování.'
          "
        >
          <UInput v-model="form.code" class="w-full" @update:model-value="codeTouched = true" />
        </UFormField>
        <USwitch
          v-model="form.active"
          label="V nabídce"
          description="Vypnutou dopravu pokladna nenabízí."
        />
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Zrušit" color="neutral" variant="ghost" @click="dialogOpen = false" />
        <UButton
          type="submit"
          form="shipping-method-form"
          label="Uložit"
          icon="i-lucide-save"
          :loading="save.isPending.value"
        />
      </div>
    </template>
  </UModal>
</template>
