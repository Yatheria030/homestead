export type Interval = "monthly" | "quarterly" | "yearly";

export interface Category {
  id: number;
  name: string;
  color: string;
  sort_order: number;
}

export interface Pocket {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  counts_to_total: boolean;
  note: string | null;
}

export interface Expense {
  id: number;
  name: string;
  category_id: number | null;
  pocket_id: number | null;
  amount_total: number;
  share_percent: number;
  interval: Interval;
  is_subscription: boolean;
  vendor: string | null;
  url: string | null;
  note: string | null;
  active: boolean;
  sort_order: number;
  category: Category | null;
  pocket: Pocket | null;
  share_amount: number;
  monthly_total: number;
  monthly_share: number;
}

export type SupplyStatus = "unknown" | "empty" | "order" | "soon" | "ok";

export interface SupplyList {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
}

export interface Supply {
  id: number;
  name: string;
  list_id: number | null;
  location: string | null;
  pack_size: string | null;
  units_per_pack: number | null;
  unit: string | null;
  days_per_pack: number | null;
  packs_per_purchase: number;
  stock_packs: number;
  stock_as_of: string | null;
  buffer_days: number;
  target_cover_days: number;
  price: number | null;
  regular_price: number | null;
  is_subscription: boolean;
  vendor: string | null;
  subscription_interval_days: number | null;
  subscription_packs: number;
  next_delivery: string | null;
  last_purchased: string | null;
  url: string | null;
  note: string | null;
  active: boolean;
  sort_order: number;
  supply_list: SupplyList | null;
  /* berechnet */
  stock_now: number;
  days_left: number | null;
  runs_out_on: string | null;
  buy_on: string | null;
  purchase_interval_days: number | null;
  days_until_purchase: number | null;
  status: SupplyStatus;
  suggested_packs: number;
  price_per_unit: number | null;
  monthly_cost: number | null;
  yearly_cost: number | null;
  yearly_savings: number | null;
  subscription_monthly: number | null;
  subscription_coverage: number | null;
}

export interface ShoppingItem {
  supply_id: number;
  name: string;
  vendor: string | null;
  list_name: string | null;
  color: string;
  status: SupplyStatus;
  days_left: number | null;
  packs: number;
  pack_label: string | null;
  price: number | null;
  total: number | null;
  is_subscription: boolean;
  url: string | null;
}

export interface ShoppingGroup {
  vendor: string;
  items: ShoppingItem[];
  total: number;
}

export interface Purchase {
  id: number;
  supply_id: number;
  purchased_on: string;
  packs: number;
  price: number | null;
  note: string | null;
}

export interface PocketSummary {
  pocket_id: number | null;
  name: string;
  color: string;
  counts_to_total: boolean;
  amount: number;
  items: string[];
}

export interface Summary {
  total_transferred: number;
  total_household: number;
  excluded: number;
  pockets: PocketSummary[];
  categories: { name: string; color: string; amount: number }[];
  expense_count: number;
  subscription_count: number;
  subscription_monthly: number;
  supplies_total: number;
  supplies_order: number;
  supplies_empty: number;
  supplies_soon: number;
  supplies_monthly: number;
  subscription_savings_yearly: number;
}

export interface BackupInfo {
  name: string;
  kind: string;
  kind_label: string;
  size: number;
  created_at: string;
  note: string | null;
}
