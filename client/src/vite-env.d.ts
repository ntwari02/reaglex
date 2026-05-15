/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_ORIGIN?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_SERVER_URL?: string;
  readonly VITE_SEO_SSR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
