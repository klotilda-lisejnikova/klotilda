<script setup lang="ts">
import { cs } from '@nuxt/ui/locale';

const TOASTER = { position: 'top-center', duration: 2500 } as const;
</script>

<template>
  <UApp :locale="cs" :toaster="TOASTER">
    <RouterView />
  </UApp>
</template>
