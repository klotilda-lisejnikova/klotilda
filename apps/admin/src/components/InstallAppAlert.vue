<script setup lang="ts">
import { computed } from 'vue';
import type { ButtonProps } from '@nuxt/ui';
import { useInstallPrompt } from '@/app/install-prompt';
import { useStoredChoice } from '@/app/stored-choice';

/**
 * Offers to install the admin as an app, where the browser can (Android, Chrome, Edge) or on an
 * iPhone from the Share menu. "Teď ne" hides it in this browser; the account menu keeps offering
 * it (AdminLayout).
 */
const { option, install } = useInstallPrompt();
const offer = useStoredChoice('klotilda-admin.install-offer', ['shown', 'dismissed'], 'shown');

const description = computed(() =>
  option.value === 'share-menu'
    ? 'V Safari klepněte na Sdílet a pak na „Přidat na plochu“. Administrace se pak otevře jako samostatná aplikace.'
    : 'Nainstalujte si administraci na plochu. Otevře se jako samostatná aplikace, bez lišty prohlížeče.'
);

const actions = computed<ButtonProps[]>(() => [
  ...(option.value === 'prompt'
    ? [{ label: 'Nainstalovat', icon: 'i-lucide-download', onClick: () => void install() }]
    : []),
  {
    label: 'Teď ne',
    color: 'neutral',
    variant: 'ghost',
    onClick: () => {
      offer.value = 'dismissed';
    },
  },
]);
</script>

<template>
  <UAlert
    v-if="option !== 'none' && offer === 'shown'"
    title="Administrace jako aplikace v mobilu"
    :description="description"
    icon="i-lucide-smartphone"
    color="primary"
    variant="soft"
    class="mb-4"
    :actions="actions"
  />
</template>
