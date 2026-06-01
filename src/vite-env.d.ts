/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK: string;
  readonly VITE_AZURE_CLIENT_ID: string;
  readonly VITE_AZURE_TENANT_ID: string;
  readonly VITE_SP_SITE_ID: string;
  readonly VITE_SP_LIST_ID: string;
  readonly VITE_SP_PROJECTS_LIST_ID: string;
  readonly VITE_SP_TEST_RESULTS_LIST_ID: string;
  readonly VITE_SP_EIRS_LIST_ID: string;
  readonly VITE_SP_ADMINS_LIST_ID: string;
  readonly VITE_SP_EIR_ROLES_LIST_ID: string;
  readonly VITE_SP_SITE_URL: string;
  readonly VITE_SHARED_MAILBOX: string;
  readonly VITE_APP_MANAGER_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
