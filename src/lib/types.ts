export type BatchType = string;
export type GroupType = 'blend' | 'single_origin';

export interface Component {
  id: string;
  name: string;
  pct: number;
}

export interface RoastGroup {
  id: string;
  label: string;
  batch_type: BatchType;
  roast_loss_pct: number;
  type: GroupType;
  components: Component[];
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  lbs: number;
  group_id: string;
  active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  product_id: string;
  qty: number;
  production_date: string;
  import_batch_id?: string | null; // NULL = manual, non-NULL = CSV import
}

export interface Leftover {
  group_id: string;
  lbs: number;
  tenant_id: string;
}

export interface BatchOverride {
  batch_type: BatchType;
  weight_lbs: number;
}

export interface ProductionSummary {
  id: string;
  production_date: string;
  summary: any;
  saved_at: string;
}

export interface PackagingType {
  id: string;
  label: string;
  size_oz: number;
  on_hand_count: number;
  active: boolean;
  required_count?: number;
  projected_remaining?: number;
  starting_count?: number | null;
  filled_count?: number;
  ending_count?: number | null;
}

export interface UntrackedPackagingRequirement {
  size_oz: number;
  required_count: number;
}

export interface ImportAlias {
  id: string;
  alias_name: string;
  product_id: string;
  active: boolean;
  created_at: string;
}

export interface CsvFormatConfig {
  productNameColumn: string | { template: string };
  quantityColumn: string;
  aggregate?: boolean;
}

export interface CsvFormat {
  id: string;
  name: string;
  description: string | null;
  config: CsvFormatConfig;
  active: boolean;
  created_at: string;
}

// Auth types
export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export type Units = 'lbs' | 'kg';

export interface User {
  id: string;
  username: string;
  email: string;
  tenant_id: string;
  preferred_units: Units;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}
