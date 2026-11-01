import { computed, onBeforeUnmount, onMounted, shallowReactive, shallowRef } from 'vue';
import type { ComputedRef } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { useOverlay } from '@nuxt/ui/composables';
import LeaveDialog from '@/components/LeaveDialog.vue';
import { useSession } from './session';

/** Two form values compared by content. */
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Whether `form` differs from what was last loaded or saved, field by field. `load` takes the
 * server's values, `markSaved` accepts the form as it is.
 */
export function trackChanges<T extends object>(form: T) {
  const fields = Object.keys(form) as (keyof T)[];
  const baseline = shallowRef<T>({ ...form });
  /** The fields the admin changed; an update sends only these. */
  const changed = computed(() => fields.filter((name) => !same(form[name], baseline.value[name])));
  const dirty = computed(() => changed.value.length > 0);

  /**
   * The values as the server has them now. A field the admin hasn't touched takes the new value;
   * one they changed keeps their edit (a photo uploaded meanwhile reloads the row, and must
   * neither wipe the edits nor bring back a stock count a sale has taken down).
   */
  function load(values: T) {
    for (const name of fields) {
      if (same(form[name], baseline.value[name])) form[name] = values[name];
    }
    baseline.value = { ...values };
  }

  /**
   * `values` count as saved: what a save sent (an edit typed while it ran stays unsaved), or the
   * form as it is before leaving on purpose.
   */
  function markSaved(values: T = form) {
    baseline.value = { ...values };
  }

  return { changed, dirty, load, markSaved };
}

/** The dirty state of every form on screen. */
const openForms = shallowReactive(new Set<ComputedRef<boolean>>());

/** Whether any form on screen holds unsaved changes: signing out asks first then. */
export const hasUnsavedChanges = computed(() => [...openForms].some((dirty) => dirty.value));

/** Counts a form in `hasUnsavedChanges`; call the answer to count it out again. */
export function registerForm(dirty: ComputedRef<boolean>): () => void {
  openForms.add(dirty);
  return () => openForms.delete(dirty);
}

let leaveDialog: ReturnType<ReturnType<typeof useOverlay>['create']> | undefined;

/** Asks whether to drop unsaved changes; true to go on. Closing the dialog means stay. */
export async function confirmLeave(): Promise<boolean> {
  leaveDialog ??= useOverlay().create(LeaveDialog);
  return (await leaveDialog.open().result) === true;
}

/**
 * Whether a form may be left: at once when nothing is unsaved or the session has ended (the way
 * to sign-in stays open), else when the admin agrees (`ask`).
 */
export async function mayLeave(
  dirty: boolean,
  signedIn: boolean,
  ask: () => Promise<boolean>
): Promise<boolean> {
  return !dirty || !signedIn || ask();
}

/**
 * `trackChanges` for a form page, guarding the way out: another page, or another row on the same
 * page, asks first (`confirmLeave`); closing or reloading the tab gets the browser's own prompt.
 */
export function useUnsavedChanges<T extends object>(form: T) {
  const changes = trackChanges(form);
  const session = useSession();
  const unregister = registerForm(changes.dirty);

  const guard = () => mayLeave(changes.dirty.value, session.isSignedIn.value, confirmLeave);
  onBeforeRouteLeave(guard);
  onBeforeRouteUpdate((to, from) => to.path === from.path || guard());

  function guardUnload(event: BeforeUnloadEvent) {
    if (!changes.dirty.value) return;
    event.preventDefault();
    // Older browsers show their prompt only with a return value set.
    event.returnValue = '';
  }

  onMounted(() => window.addEventListener('beforeunload', guardUnload));
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', guardUnload);
    unregister();
    // A dialog still open (the session ended meanwhile) goes with the form.
    leaveDialog?.close(false);
  });

  return changes;
}
