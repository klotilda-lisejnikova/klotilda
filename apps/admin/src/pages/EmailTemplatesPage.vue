<script setup lang="ts">
import { reactive } from 'vue';
import { useToast } from '@nuxt/ui/composables';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { EMAIL_TEMPLATE_KEYS, EMAIL_TEMPLATES } from '@klotilda/domain';
import type { EmailTemplate } from '@klotilda/domain';
import PageHeader from '@/components/PageHeader.vue';
import { services } from '@/app/api';
import { EMAIL_TEMPLATES_QUERY_KEY, useEmailTemplates } from '@/app/email-templates';
import { describeError } from '@/app/errors';
import { EMAIL_TEMPLATE_LABELS } from '@/app/labels';

const toast = useToast();
const queryClient = useQueryClient();
const { byKey, isPending, isError } = useEmailTemplates();

const switching = reactive(new Set<string>());

const setEnabled = useMutation({
  mutationFn: ({ template, enabled }: { template: EmailTemplate; enabled: boolean }) =>
    services.emailTemplates.update(template.id, { enabled }),
  onMutate: ({ template }) => {
    switching.add(template.id);
  },
  onSuccess: (_saved, { enabled }) =>
    toast.add({ title: enabled ? 'E-mail se posílá' : 'E-mail se neposílá', color: 'success' }),
  onError: (err) => toast.add({ title: describeError(err), color: 'error' }),
  onSettled: (_saved, _err, { template }) => {
    switching.delete(template.id);
    void queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATES_QUERY_KEY });
  },
});
</script>

<template>
  <PageHeader title="E-maily" />

  <p class="mb-4 max-w-2xl text-sm text-muted">
    E-maily, které e-shop posílá sám. U každého můžete upravit předmět, nadpis a text. Položky
    objednávky, platební údaje, sledování zásilky a odkazy na obchodní podmínky do nich e-shop
    doplní sám.
  </p>

  <UAlert v-if="isError" title="E-maily se nepodařilo načíst." color="error" variant="soft" />
  <div v-else-if="isPending" class="max-w-3xl space-y-2">
    <USkeleton v-for="line in 4" :key="line" class="h-16 w-full" />
  </div>
  <ul
    v-else
    class="max-w-3xl divide-y divide-default overflow-hidden rounded-lg bg-default ring ring-default"
  >
    <li
      v-for="key in EMAIL_TEMPLATE_KEYS"
      :key="key"
      class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
    >
      <div class="mr-auto min-w-0">
        <p class="font-medium text-highlighted">{{ EMAIL_TEMPLATE_LABELS[key].name }}</p>
        <p class="text-xs text-muted">{{ EMAIL_TEMPLATE_LABELS[key].when }}</p>
      </div>
      <div class="flex items-center gap-1">
        <template v-if="byKey.get(key)">
          <USwitch
            v-if="!EMAIL_TEMPLATES[key].required"
            :model-value="byKey.get(key)!.enabled ?? true"
            :loading="switching.has(byKey.get(key)!.id)"
            label="Posílat"
            size="sm"
            class="mr-2"
            :ui="{ label: 'whitespace-nowrap' }"
            @update:model-value="
              (enabled) => setEnabled.mutate({ template: byKey.get(key)!, enabled })
            "
          />
          <span v-else class="mr-2 text-xs text-muted">Posílá se vždy</span>
        </template>
        <UButton
          icon="i-lucide-pencil"
          label="Upravit"
          color="neutral"
          variant="soft"
          :to="{ name: 'email-template', params: { templateKey: key } }"
        />
      </div>
    </li>
  </ul>
</template>
