import { useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';

/**
 * Where a row's page leads back to: `back` (the address the admin came from) when it is the list
 * named `listName`, so its tab, category and the rest of its address are kept; else the list itself.
 */
export function listReturn(
  back: unknown,
  nameOf: (path: string) => unknown,
  listName: string
): RouteLocationRaw {
  return typeof back === 'string' && nameOf(back) === listName ? back : { name: listName };
}

/** `listReturn` for the page being shown, from the router's history. */
export function useListReturn(listName: string): RouteLocationRaw {
  const router = useRouter();
  return listReturn(
    router.options.history.state.back,
    (path) => router.resolve(path).name,
    listName
  );
}
