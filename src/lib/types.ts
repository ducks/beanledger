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
}

export interface Leftover {
  group_id: string;
  lbs: number;
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

// Auth types
export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  tenant_id: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}
