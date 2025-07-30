/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // add other environment variables here as needed
  readonly VITE_GOOGLE_CLIENT_ID: string; // for Google Sign-In
  // You can add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}