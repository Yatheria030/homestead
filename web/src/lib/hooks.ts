import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Category, Expense, Pocket, Purchase, Supply, SupplyList } from "../types";

export const useSummary = () => useQuery({ queryKey: ["summary"], queryFn: api.summary });
export const useCategories = () =>
  useQuery({ queryKey: ["categories"], queryFn: api.categories });
export const usePockets = () => useQuery({ queryKey: ["pockets"], queryFn: api.pockets });
export const useExpenses = () => useQuery({ queryKey: ["expenses"], queryFn: api.expenses });
export const useSupplies = () => useQuery({ queryKey: ["supplies"], queryFn: api.supplies });
export const useSupplyLists = () =>
  useQuery({ queryKey: ["supply-lists"], queryFn: api.supplyLists });
export const useShoppingList = () =>
  useQuery({ queryKey: ["shopping-list"], queryFn: api.shoppingList });
export const useTrash = () => useQuery({ queryKey: ["trash"], queryFn: api.trash });
export const useBackups = () => useQuery({ queryKey: ["backups"], queryFn: api.backups });

/** Nach jeder Aenderung auch die Auswertung neu ziehen. */
function useInvalidating<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keys: string[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(...args),
    onSuccess: () => {
      for (const key of [...keys, "summary"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

export function useExpenseActions() {
  const update = useInvalidating(
    (id: number, body: Partial<Expense>) => api.updateExpense(id, body),
    ["expenses"],
  );
  const create = useInvalidating(
    (body: Partial<Expense>) => api.createExpense(body),
    ["expenses"],
  );
  const remove = useInvalidating((id: number) => api.deleteExpense(id), ["expenses"]);
  return {
    update: (id: number, body: Partial<Expense>) => update.mutate([id, body]),
    create: (body: Partial<Expense>) => create.mutate([body]),
    remove: (id: number) => remove.mutate([id]),
  };
}

export function useSupplyActions() {
  const update = useInvalidating(
    (id: number, body: Partial<Supply>) => api.updateSupply(id, body),
    ["supplies", "shopping-list"],
  );
  const create = useInvalidating(
    (body: Partial<Supply>) => api.createSupply(body),
    ["supplies", "shopping-list"],
  );
  const remove = useInvalidating(
    (id: number) => api.deleteSupply(id),
    ["supplies", "shopping-list", "trash"],
  );
  const restock = useInvalidating(
    (id: number, body?: { packs?: number; price?: number; purchased_on?: string }) =>
      api.restock(id, body),
    // "purchases" ist ein Praefix-Match auf ["purchases", <id>] - jeder Kauf landet
    // in der Historie, die den Drawer speist, also muss die mit veralten.
    ["supplies", "shopping-list", "purchases"],
  );
  const setStock = useInvalidating(
    (id: number, packs: number) => api.setStock(id, packs),
    ["supplies", "shopping-list"],
  );
  return {
    update: (id: number, body: Partial<Supply>) => update.mutate([id, body]),
    create: (body: Partial<Supply>) => create.mutate([body]),
    remove: (id: number) => remove.mutate([id]),
    restock: (id: number, packs = 1, price?: number, purchased_on?: string) =>
      restock.mutate([id, { packs, price, purchased_on }]),
    setStock: (id: number, packs: number) => setStock.mutate([id, packs]),
  };
}

/** Papierkorb: wiederherstellen oder endgültig entfernen. */
export function useTrashActions() {
  const restore = useInvalidating(
    (id: number) => api.restoreSupply(id),
    ["supplies", "shopping-list", "trash"],
  );
  const purge = useInvalidating((id: number) => api.purgeSupply(id), ["trash"]);
  return {
    restore: (id: number) => restore.mutate([id]),
    purge: (id: number) => purge.mutate([id]),
  };
}

/** Kaufhistorie eines einzelnen Artikels - Liste plus Nachtragen/Löschen. */
export function usePurchases(supplyId: number | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["purchases", supplyId],
    queryFn: () => api.purchases(supplyId as number),
    enabled: supplyId !== null,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["purchases", supplyId] });
    queryClient.invalidateQueries({ queryKey: ["supplies"] });
    queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const add = useMutation({
    mutationFn: (body: { purchased_on: string; packs?: number; price?: number; note?: string }) =>
      api.addPurchase(supplyId as number, body),
    onSuccess: invalidateAll,
  });
  const remove = useMutation({
    mutationFn: (purchaseId: number) => api.deletePurchase(supplyId as number, purchaseId),
    onSuccess: invalidateAll,
  });

  return {
    purchases: query.data ?? ([] as Purchase[]),
    isLoading: query.isLoading,
    add: (body: { purchased_on: string; packs?: number; price?: number; note?: string }) =>
      add.mutate(body),
    remove: (purchaseId: number) => remove.mutate(purchaseId),
  };
}

export function useSupplyListActions() {
  const create = useInvalidating(
    (body: Partial<SupplyList>) => api.createSupplyList(body),
    ["supply-lists", "supplies"],
  );
  const update = useInvalidating(
    (id: number, body: Partial<SupplyList>) => api.updateSupplyList(id, body),
    ["supply-lists", "supplies"],
  );
  const remove = useInvalidating(
    (id: number) => api.deleteSupplyList(id),
    ["supply-lists", "supplies"],
  );
  return {
    create: (body: Partial<SupplyList>) => create.mutate([body]),
    /** Warten auf den neu angelegten Eintrag – die Zelle braucht die Id zurueck. */
    createAsync: (body: Partial<SupplyList>) => create.mutateAsync([body]),
    update: (id: number, body: Partial<SupplyList>) => update.mutate([id, body]),
    remove: (id: number) => remove.mutate([id]),
  };
}

export function useMasterActions() {
  const createCategory = useInvalidating(
    (body: Partial<Category>) => api.createCategory(body),
    ["categories", "expenses"],
  );
  const updateCategory = useInvalidating(
    (id: number, body: Partial<Category>) => api.updateCategory(id, body),
    ["categories", "expenses"],
  );
  const deleteCategory = useInvalidating(
    (id: number) => api.deleteCategory(id),
    ["categories", "expenses"],
  );
  const createPocket = useInvalidating(
    (body: Partial<Pocket>) => api.createPocket(body),
    ["pockets", "expenses"],
  );
  const updatePocket = useInvalidating(
    (id: number, body: Partial<Pocket>) => api.updatePocket(id, body),
    ["pockets", "expenses"],
  );
  const deletePocket = useInvalidating(
    (id: number) => api.deletePocket(id),
    ["pockets", "expenses"],
  );
  return {
    createCategory: (body: Partial<Category>) => createCategory.mutate([body]),
    updateCategory: (id: number, body: Partial<Category>) => updateCategory.mutate([id, body]),
    deleteCategory: (id: number) => deleteCategory.mutate([id]),
    createPocket: (body: Partial<Pocket>) => createPocket.mutate([body]),
    updatePocket: (id: number, body: Partial<Pocket>) => updatePocket.mutate([id, body]),
    deletePocket: (id: number) => deletePocket.mutate([id]),
  };
}


export function useBackupActions() {
  const queryClient = useQueryClient();
  const everything = () => queryClient.invalidateQueries();

  const create = useMutation({
    mutationFn: (note?: string) => api.createBackup(note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backups"] }),
  });
  const remove = useMutation({
    mutationFn: (name: string) => api.deleteBackup(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backups"] }),
  });
  const upload = useMutation({
    mutationFn: (file: File) => api.uploadBackup(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backups"] }),
  });
  // Nach dem Zurückspielen ist jede geladene Liste veraltet
  const restore = useMutation({
    mutationFn: (name: string) => api.restoreBackup(name),
    onSuccess: everything,
  });

  return { create, remove, upload, restore };
}
