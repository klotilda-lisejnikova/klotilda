import { AuthSession, createWebSessionStorage } from '@eleansphere/entity-core';
import type { FileDto } from '@eleansphere/entity-core';
import { createServices } from '@klotilda/domain';

const SESSION_STORAGE_KEY = 'klotilda-admin.session';

/** A trailing `/api` is dropped: the clients add it, and the old admin's setting included it. */
const API_SUFFIX = /\/api\/?$/;

export const apiBaseUrl: string = import.meta.env.VITE_API_URL.replace(API_SUFFIX, '');

let reportSessionExpired: () => void = () => undefined;

/** Runs when the refresh token is rejected: back to sign-in. Set once, after the router exists. */
export function onSessionExpired(handle: () => void): void {
  reportSessionExpired = handle;
}

export const sessionStorage = createWebSessionStorage(SESSION_STORAGE_KEY);

/** The signed-in admin's tokens; renews the access token behind every request. */
export const session = new AuthSession({
  baseUrl: apiBaseUrl,
  storage: sessionStorage,
  onSessionExpired: () => reportSessionExpired(),
});

/** `services.products`, `services.gallery`, `services.orders`, `services.auth`. */
export const services = createServices(apiBaseUrl, session);

/**
 * Where the browser loads a photo from: an absolute bucket URL, or — without a bucket, locally —
 * the API's own `/api/files/:id`, which lives on the API's origin.
 */
export function fileUrl(file: Pick<FileDto, 'url'>): string {
  return file.url.startsWith('/') ? `${apiBaseUrl}${file.url}` : file.url;
}
