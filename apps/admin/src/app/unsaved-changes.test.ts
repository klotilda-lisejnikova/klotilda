import { computed, reactive, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { hasUnsavedChanges, mayLeave, registerForm, trackChanges } from './unsaved-changes';

describe('trackChanges', () => {
  const loaded = () => ({ description: 'Miska', stockCount: 1 });

  it('takes loaded values and notices an edit and its undoing', () => {
    const form = reactive({ description: '', stockCount: 0 });
    const changes = trackChanges(form);
    changes.load(loaded());
    expect(form).toEqual(loaded());
    expect(changes.dirty.value).toBe(false);

    form.stockCount = 3;
    expect(changes.changed.value).toEqual(['stockCount']);
    form.stockCount = 1;
    expect(changes.dirty.value).toBe(false);
  });

  it('keeps the edited fields when the row is loaded again, and updates the others', () => {
    const form = reactive({ description: '', stockCount: 0 });
    const changes = trackChanges(form);
    changes.load(loaded());
    form.description = 'Miska, glazovaná';

    changes.load({ description: 'Miska', stockCount: 0 });
    expect(form).toEqual({ description: 'Miska, glazovaná', stockCount: 0 });
    expect(changes.changed.value).toEqual(['description']);

    changes.markSaved();
    expect(changes.dirty.value).toBe(false);
  });

  it('leaves an edit typed while a save ran unsaved', () => {
    const form = reactive({ description: '', stockCount: 0 });
    const changes = trackChanges(form);
    changes.load(loaded());
    form.description = 'Miska, glazovaná';
    const sent = { ...form };
    form.stockCount = 2;

    changes.markSaved(sent);
    expect(changes.changed.value).toEqual(['stockCount']);
  });

  it('notices a change inside a nested value', () => {
    const form = reactive({ size: { width: 1 } });
    const changes = trackChanges(form);
    form.size = { width: 9 };
    expect(changes.dirty.value).toBe(true);
  });
});

describe('leaving a form', () => {
  const ask = (answer: boolean) => async () => answer;

  it('asks only when something is unsaved and the session is still on', async () => {
    expect(await mayLeave(false, true, ask(false))).toBe(true);
    expect(await mayLeave(true, false, ask(false))).toBe(true);
    expect(await mayLeave(true, true, ask(false))).toBe(false);
    expect(await mayLeave(true, true, ask(true))).toBe(true);
  });

  it('counts a form with changes until it goes', () => {
    const edited = ref(false);
    const unregister = registerForm(computed(() => edited.value));
    expect(hasUnsavedChanges.value).toBe(false);
    edited.value = true;
    expect(hasUnsavedChanges.value).toBe(true);
    unregister();
    expect(hasUnsavedChanges.value).toBe(false);
  });
});
