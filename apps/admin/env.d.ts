/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The API's origin, `https://api.klotilda.cz`. */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'vue-router' {
  interface RouteMeta {
    /** Only for signed-out visitors (the sign-in page). */
    guest?: boolean;
  }
}

export {};
