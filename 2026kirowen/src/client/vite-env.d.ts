/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the hosted feed service; empty means same-origin /api. */
  readonly VITE_FEED_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}