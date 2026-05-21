import type { AdminEntry, GraphListItem } from "@/types/task";
import { graphFetch, graphFetchAll } from "./graph";
import { SP_ADMINS_LIST_ID, SP_SITE_ID, USE_MOCK } from "./config";

// =============================================================================
// Admins list. Single-column SharePoint list whose Title field stores an
// email address (and the standard description/notes fields are reused for
// the human-friendly display name and an optional note). Every API call
// goes through this file so the mock/real boundary stays in one place.
//
// Setup (one-time, by hand in SharePoint):
//   1. Create a new SharePoint list on the Altronic_Engineering site
//      called "Admins" (or any name — only the list id matters).
//   2. Use the default Title column for the user's email address.
//   3. Add a single-line text column called `DisplayName` and another
//      called `Note`.
//   4. Set the repo variable VITE_SP_ADMINS_LIST_ID to the list id.
// =============================================================================

// In-memory store so demo mode behaves the same way (and the existing
// hardcoded admins from useIsAdmin still see the admin UI).
const MOCK_STORE: AdminEntry[] = [
  {
    id: 1,
    email: "ray.white@altronic-llc.com",
    displayName: "Ray White",
    note: "App maintainer",
  },
  {
    id: 2,
    email: "demo.user@altronic-llc.com",
    displayName: "Demo User",
    note: "Mock-mode default user — keeps the admin UI exercisable",
  },
];

function delay<T>(value: T, ms = 60): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function listAdmins(): Promise<AdminEntry[]> {
  if (USE_MOCK) {
    return delay([...MOCK_STORE]);
  }
  if (!SP_ADMINS_LIST_ID) return [];

  const path =
    `/sites/${SP_SITE_ID}/lists/${SP_ADMINS_LIST_ID}` +
    `/items?$expand=fields($select=Title,DisplayName,Note)&$top=200`;
  const items = await graphFetchAll<GraphListItem>(path);
  return items.map((it) => {
    const f = it.fields ?? {};
    return {
      id: parseInt(it.id, 10),
      email: ((f.Title as string) ?? "").trim(),
      displayName: ((f.DisplayName as string) ?? "").trim(),
      note: ((f.Note as string) ?? "").trim(),
    };
  });
}

export async function addAdmin(input: {
  email: string;
  displayName: string;
  note: string;
}): Promise<AdminEntry> {
  if (USE_MOCK) {
    const nextId = (MOCK_STORE[MOCK_STORE.length - 1]?.id ?? 0) + 1;
    const entry: AdminEntry = { id: nextId, ...input };
    MOCK_STORE.push(entry);
    return delay(entry);
  }
  if (!SP_ADMINS_LIST_ID) {
    throw new Error("Cannot add admin: VITE_SP_ADMINS_LIST_ID is not set.");
  }
  const created = await graphFetch<GraphListItem>(
    `/sites/${SP_SITE_ID}/lists/${SP_ADMINS_LIST_ID}/items`,
    {
      method: "POST",
      body: JSON.stringify({
        fields: {
          Title: input.email,
          DisplayName: input.displayName,
          Note: input.note,
        },
      }),
    },
  );
  const f = created.fields ?? {};
  return {
    id: parseInt(created.id, 10),
    email: ((f.Title as string) ?? input.email).trim(),
    displayName: ((f.DisplayName as string) ?? input.displayName).trim(),
    note: ((f.Note as string) ?? input.note).trim(),
  };
}

export async function removeAdmin(id: number): Promise<void> {
  if (USE_MOCK) {
    const idx = MOCK_STORE.findIndex((a) => a.id === id);
    if (idx >= 0) MOCK_STORE.splice(idx, 1);
    await delay(null);
    return;
  }
  if (!SP_ADMINS_LIST_ID) {
    throw new Error("Cannot remove admin: VITE_SP_ADMINS_LIST_ID is not set.");
  }
  await graphFetch(
    `/sites/${SP_SITE_ID}/lists/${SP_ADMINS_LIST_ID}/items/${id}`,
    { method: "DELETE" },
  );
}
