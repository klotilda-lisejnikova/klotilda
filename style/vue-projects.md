# Vue: the admin

Adopted from the open-procurement Vue guide (2026-10-31), reduced to what fits `apps/admin` (Vue 3, Vite,
Nuxt UI, Czech only). Extends [`../CLAUDE.md`](../CLAUDE.md); it does not restate the language policy, git
workflow or small-steps working style. Where the admin already has a consistent practice, the practice is
written down rather than replaced. The website (`apps/web`, Next.js) keeps its own ESLint and Prettier setup
and has no style guide here yet.

## Structure

The admin is small and flat, and stays so until it genuinely outgrows it:

```text
src/
├── app/          # domain-neutral app code: API session and services, router, validation, formatting, labels
├── components/   # shared presentational components (multi-word PascalCase .vue)
├── layouts/      # the app shell
└── pages/        # one route-level component per page (<Name>Page.vue)
```

- Data access goes through `src/app/api.ts` and the typed clients from `@klotilda/domain`, never raw
  `fetch`.
- Form rules come from the server's own (`formSchema` in `src/app/validation.ts`); don't write a second set
  of rules in a page.
- Introducing a new top-level folder (`composables/`, `stores/`, `domains/`) is a deliberate step with a
  plan, not a side effect of a feature task.

## The composable rule

A file is a composable (`use-xxx.ts`) only if it genuinely extracts **reactive state or orchestration** out
of a `.vue` file — something that would otherwise be duplicated `ref`/`computed`/`watch` wiring across two
or more places. A function returning no reactive state is not a composable regardless of a `use` prefix; it
stays with what uses it.

## Naming

- Vue components: `PascalCase.vue`, multi-word (`PhotoManager.vue`, not `Photos.vue`); pages end in `Page`.
- Hand-written TypeScript files and folders: `kebab-case` (`resize-image.ts`).

## State and components

- Express derived state via `computed`, not a second manually synced `ref`:

  ```ts
  // WRONG — second source of truth, you have to sync it manually
  const visible = ref([]);
  function reload() { visible.value = all.value.filter(...); }

  // CORRECT — defines the relationship, recomputes automatically
  const visible = computed(() => all.value.filter(...));
  ```

- Keep UI state local to the page until it is actually shared.
- Presentational components take props for input and emits for output; a page orchestrates the API calls
  and navigation.
- Don't read business state from the DOM, and don't mutate a foreign reactive object via a hidden side
  effect.

## Vue and TypeScript style

- Composition API with `<script setup lang="ts">`. SFC block order: `<script setup>`, `<template>`,
  `<style>`.
- Write top-level named operations as function declarations; arrow functions are for callbacks and short
  transforms.
- Prefer `const`. Use a ternary only when it is more readable than a branch.
- Prefer object parameters when a function has several similarly typed arguments.
- A comment explains the reason, an invariant, or an atypical exception; it doesn't repeat the code.
- Every `UFormField` keeps a line free for its message (`CLAUDE.md` → _Admin_).
- Keep components small; create a new abstraction only for a recurring problem, not a hypothetical one.

## Tests

- **Vitest**; a test sits next to the tested file as `<subject>.test.ts` (`src/app/validation.test.ts`).
- New logic in `src/app/` ships with a test covering at least its main success and error branches.
