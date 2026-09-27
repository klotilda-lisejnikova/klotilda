import { computed, ref } from 'vue';
import { ApiError } from '@eleansphere/entity-core';
import type { AdminUser } from '@klotilda/domain';
import { services, session, sessionStorage } from './api';

const admin = ref<AdminUser | null>(null);
let restoration: Promise<void> | null = null;

/** Forgets the local session without calling the server (after it rejected our tokens). */
function forget(): void {
  session.end();
  admin.value = null;
}

/** A rejected session simply means "not signed in". */
async function loadStoredAdmin(): Promise<void> {
  if (!session.isSignedIn) return;
  try {
    admin.value = await services.auth.me();
  } catch (err) {
    if (!(err instanceof ApiError) || !err.isAuthError) throw err;
    forget();
  }
}

/** Who is signed in, and everything that changes it. */
export function useSession() {
  return {
    admin,
    isSignedIn: computed(() => admin.value !== null),

    /** Loads the signed-in admin on startup, once; later calls wait for that same load. */
    restore(): Promise<void> {
      restoration ??= loadStoredAdmin().catch((err: unknown) => {
        console.error('Could not restore the session:', err);
      });
      return restoration;
    },

    async signIn(email: string, password: string): Promise<void> {
      const started = await services.auth.login({ email, password });
      session.start(started);
      admin.value = started.user;
    },

    async signOut(): Promise<void> {
      const refreshToken = sessionStorage.load()?.refreshToken;
      // The session is over either way; a failed revocation must not keep anyone signed in.
      if (refreshToken) await services.auth.logout(refreshToken).catch(() => undefined);
      forget();
    },

    forget,
  };
}
