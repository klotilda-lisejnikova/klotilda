<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@eleansphere/entity-core';
import { describeError } from '@/app/errors';
import { useSession } from '@/app/session';

const TOO_MANY_REQUESTS = 429;

const session = useSession();
const router = useRouter();
const route = useRoute();

const credentials = reactive({ email: '', password: '' });
const signingIn = ref(false);
const failure = ref<string | null>(null);

function describeSignInError(err: unknown): string {
  if (err instanceof ApiError && err.isAuthError) return 'Nesprávný e-mail nebo heslo.';
  if (err instanceof ApiError && err.status === TOO_MANY_REQUESTS) {
    return 'Příliš mnoho pokusů. Zkuste to za chvíli.';
  }
  return describeError(err);
}

async function signIn() {
  signingIn.value = true;
  failure.value = null;
  try {
    await session.signIn(credentials.email.trim(), credentials.password);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.replace(redirect.startsWith('/') ? redirect : '/');
  } catch (err) {
    failure.value = describeSignInError(err);
  } finally {
    signingIn.value = false;
  }
}
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-muted px-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold text-highlighted">
          Klotilda <span class="text-sm font-normal text-muted">admin</span>
        </h1>
      </template>
      <form class="space-y-4" @submit.prevent="signIn">
        <UFormField label="E-mail" name="email">
          <UInput
            v-model="credentials.email"
            type="email"
            autocomplete="username"
            required
            autofocus
            class="w-full"
          />
        </UFormField>
        <UFormField label="Heslo" name="password">
          <UInput
            v-model="credentials.password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full"
          />
        </UFormField>
        <UAlert v-if="failure" :title="failure" color="error" variant="soft" />
        <UButton type="submit" label="Přihlásit se" block :loading="signingIn" />
      </form>
    </UCard>
  </main>
</template>
