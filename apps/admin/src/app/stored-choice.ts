import { shallowRef, watch } from 'vue';
import type { ShallowRef } from 'vue';

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode): the choice lasts until the page is left.
  }
}

/**
 * One of `choices`, remembered in this browser under `key`: what was picked last, or `fallback`
 * when nothing (or something no longer offered) was stored.
 */
export function useStoredChoice<Choice extends string>(
  key: string,
  choices: readonly Choice[],
  fallback: Choice
): ShallowRef<Choice> {
  const stored = readStored(key);
  const initial = choices.find((candidate) => candidate === stored) ?? fallback;
  // A generic `Choice` defeats `shallowRef`'s overloads; the value is a `Choice` all the same.
  const choice = shallowRef(initial) as ShallowRef<Choice>;
  watch(choice, (value) => writeStored(key, value));
  return choice;
}
