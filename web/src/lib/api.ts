import type {
  BackupInfo,
  Category,
  Expense,
  Pocket,
  Purchase,
  ShoppingGroup,
  Summary,
  Supply,
  SupplyList,
} from "../types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText} ${detail}`.trim());
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

const post = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
const patch = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
const remove = (path: string) => request<void>(path, { method: "DELETE" });

export const api = {
  summary: () => request<Summary>("/summary"),

  categories: () => request<Category[]>("/categories"),
  createCategory: (body: Partial<Category>) => post<Category>("/categories", body),
  updateCategory: (id: number, body: Partial<Category>) =>
    patch<Category>(`/categories/${id}`, body),
  deleteCategory: (id: number) => remove(`/categories/${id}`),

  pockets: () => request<Pocket[]>("/pockets"),
  createPocket: (body: Partial<Pocket>) => post<Pocket>("/pockets", body),
  updatePocket: (id: number, body: Partial<Pocket>) => patch<Pocket>(`/pockets/${id}`, body),
  deletePocket: (id: number) => remove(`/pockets/${id}`),

  expenses: () => request<Expense[]>("/expenses"),
  createExpense: (body: Partial<Expense>) => post<Expense>("/expenses", body),
  updateExpense: (id: number, body: Partial<Expense>) =>
    patch<Expense>(`/expenses/${id}`, body),
  deleteExpense: (id: number) => remove(`/expenses/${id}`),

  supplies: () => request<Supply[]>("/supplies"),
  createSupply: (body: Partial<Supply>) => post<Supply>("/supplies", body),
  updateSupply: (id: number, body: Partial<Supply>) => patch<Supply>(`/supplies/${id}`, body),
  deleteSupply: (id: number) => remove(`/supplies/${id}`),
  restock: (
    id: number,
    body?: { packs?: number; price?: number; note?: string; purchased_on?: string },
  ) => post<Supply>(`/supplies/${id}/restock`, body ?? { packs: 1 }),
  setStock: (id: number, stock_packs: number) =>
    post<Supply>(`/supplies/${id}/stock`, { stock_packs }),
  recount: (id: number, stock_packs: number) =>
    post<Supply>(`/supplies/${id}/recount`, { stock_packs }),
  purchases: (id: number) => request<Purchase[]>(`/supplies/${id}/purchases`),
  addPurchase: (
    id: number,
    body: { purchased_on: string; packs?: number; price?: number; note?: string },
  ) => post<Purchase>(`/supplies/${id}/purchases`, body),
  deletePurchase: (id: number, purchaseId: number) =>
    remove(`/supplies/${id}/purchases/${purchaseId}`),

  trash: () => request<Supply[]>("/supplies/trash"),
  restoreSupply: (id: number) => post<Supply>(`/supplies/${id}/restore`),
  purgeSupply: (id: number) => remove(`/supplies/${id}/purge`),

  supplyLists: () => request<SupplyList[]>("/supply-lists"),
  createSupplyList: (body: Partial<SupplyList>) => post<SupplyList>("/supply-lists", body),
  updateSupplyList: (id: number, body: Partial<SupplyList>) =>
    patch<SupplyList>(`/supply-lists/${id}`, body),
  deleteSupplyList: (id: number) => remove(`/supply-lists/${id}`),

  shoppingList: () => request<ShoppingGroup[]>("/shopping-list"),

  backups: () => request<BackupInfo[]>("/backups"),
  createBackup: (note?: string) => post<BackupInfo>("/backups", { note: note ?? null }),
  deleteBackup: (name: string) => remove(`/backups/${name}`),
  restoreBackup: (name: string) =>
    post<{ restored: string; safety_snapshot: string }>(`/backups/${name}/restore`),
  uploadBackup: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${BASE}/backups/upload`, { method: "POST", body: form });
    if (!response.ok) throw new Error(await response.text());
    return (await response.json()) as BackupInfo;
  },
  backupDownloadUrl: (name: string) => `${BASE}/backups/${name}/download`,
};
