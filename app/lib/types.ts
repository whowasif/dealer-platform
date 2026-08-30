// -----------------------------------------------------------------------------
// Shared domain types. Column names mirror the PostgreSQL schema exactly.
// -----------------------------------------------------------------------------

export type RoleName =
  | "super_admin"
  | "hq_admin"
  | "hq_finance"
  | "hq_operations"
  | "divisional_head"
  | "district_head"
  | "upazila_representative";

export interface UserRow {
  id: string;
  password_hash: string | null;
  full_name: string;
  phone: string;
  personal_email: string | null;
  official_email: string | null;
  nid_number: string | null;
  status: string | null;
  created_at: string;
}

export interface RoleRow {
  id: string;
  name: RoleName;
  display_name: string;
  description: string | null;
  level: number;
}

/** A role assignment for a user, including its geographic scope. */
export interface UserRoleAssignment {
  role_id: string;
  role_name: RoleName;
  role_display_name: string;
  level: number;
  scope_division_id: string | null;
  scope_district_id: string | null;
  scope_upazila_id: string | null;
}

/** The authenticated session user, resolved server-side. */
export interface SessionUser {
  id: string;
  full_name: string;
  phone: string;
  official_email: string | null;
  roles: UserRoleAssignment[];
  /** Lowest level number = highest authority (1 = super_admin). */
  highestLevel: number;
  /** The role name that grants the highest authority. */
  primaryRole: RoleName;
}

/** Minimal JWT payload persisted in the session cookie. */
export interface SessionTokenPayload {
  sub: string; // user id
  name: string;
  phone: string;
}

export interface DivisionRow {
  id: string;
  name: string;
  bn_name: string;
  code: string;
}

export interface DistrictRow {
  id: string;
  division_id: string;
  name: string;
  bn_name: string;
  code: string;
}

export interface UpazilaRow {
  id: string;
  district_id: string;
  name: string;
  bn_name: string;
  code: string;
}

// -----------------------------------------------------------------------------
// Task 3 — Representatives, Packages, Contracts, Deposits.
// Column names mirror the PostgreSQL schema exactly.
// -----------------------------------------------------------------------------

export type PackageType = "standard" | "premium";

export type RepresentativeStatus =
  | "applied"
  | "approved"
  | "active"
  | "suspended"
  | "terminated"
  | "resigned";

export type ContractStatus =
  | "draft"
  | "pending_signature"
  | "active"
  | "expired"
  | "terminated"
  | "renewed";

export type DepositType =
  | "investment_refundable"
  | "investment_non_refundable"
  | "onboarding_fee";

export type PaymentMethod =
  | "bank_transfer"
  | "bkash"
  | "nagad"
  | "rocket"
  | "check"
  | "other_dfs";

export interface PackageRow {
  id: string;
  name: PackageType;
  display_name: string;
  investment_amount: string; // numeric comes back as string from pg
  refundable_amount: string;
  non_refundable_amount: string;
  onboarding_fee: string;
  includes_laptop: boolean;
  investment_units: string;
  monthly_maintenance_fee: string | null;
  is_active: boolean;
}

/** A row in the representatives list, joined with user + geography + package. */
export interface RepresentativeListItem {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  status: RepresentativeStatus;
  is_district_head: boolean;
  join_date: string | null;
  upazila_id: string;
  upazila_name: string;
  district_id: string;
  district_name: string;
  division_id: string;
  division_name: string;
  package_name: PackageType;
  package_display_name: string;
}

/** Full detail for a single representative. */
export interface RepresentativeDetail extends RepresentativeListItem {
  package_id: string;
  investment_amount: string;
  investment_units: string;
  refundable_balance: string;
  security_refunded: boolean;
  laptop_provided: boolean;
  laptop_serial_no: string | null;
  laptop_provided_date: string | null;
  termination_date: string | null;
  notes: string | null;
  official_email: string | null;
  upazila_is_sadar: boolean;
  package_investment_amount: string;
  package_refundable_amount: string;
  package_non_refundable_amount: string;
  package_onboarding_fee: string;
  package_includes_laptop: boolean;
  package_investment_units: string;
}

export interface ContractRow {
  id: string;
  representative_id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  term_years: number;
  renewal_fee: string | null;
  status: ContractStatus;
  signed_document_url: string | null;
  signed_at: string | null;
  renewed_from: string | null;
  created_at: string;
}

export interface DepositRow {
  id: string;
  representative_id: string;
  type: DepositType;
  amount: string;
  is_refundable: boolean;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_no: string;
  verified: boolean;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
}

/** The district head that a representative reports to (rep in the sadar upazila). */
export interface DistrictHeadInfo {
  representative_id: string;
  full_name: string;
  upazila_name: string;
}

// -----------------------------------------------------------------------------
// Task 4 — Product Catalog & Central Warehouse Inventory.
// Column names mirror the PostgreSQL schema exactly.
// -----------------------------------------------------------------------------

export type ProductType = "hardware" | "software" | "service";

export type MovementType =
  | "stock_in"
  | "stock_out"
  | "sale"
  | "return"
  | "adjustment";

export interface CategoryRow {
  id: string;
  name: string;
  bn_name: string | null;
  parent_id: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

/** A category joined with its parent's name (null when top-level). */
export interface CategoryListItem extends CategoryRow {
  parent_name: string | null;
}

export interface ProductRow {
  id: string;
  category_id: string | null;
  name: string;
  bn_name: string | null;
  sku: string;
  description: string | null;
  cost_price: string; // DECIMAL -> string from node-postgres
  retail_price: string;
  wholesale_price: string | null;
  type: ProductType;
  unit: string;
  warranty_months: number;
  images: string[];
  specifications: Record<string, unknown>;
  is_active: boolean;
  min_stock_alert: number;
  created_at: string;
  updated_at: string;
}

/** A product row for the list, joined with category name + central stock. */
export interface ProductListItem {
  id: string;
  name: string;
  bn_name: string | null;
  sku: string;
  type: ProductType;
  unit: string;
  cost_price: string;
  retail_price: string;
  wholesale_price: string | null;
  is_active: boolean;
  min_stock_alert: number;
  category_id: string | null;
  category_name: string | null;
  quantity: number;
  reserved: number;
  available: number;
}

/** Full detail for a single product: row + category name + current stock. */
export interface ProductDetail extends ProductRow {
  category_name: string | null;
  quantity: number;
  reserved: number;
  available: number;
}

export interface StockRow {
  id: string;
  product_id: string;
  quantity: number;
  reserved: number;
  last_updated: string;
}

/** A movement row joined with product name + the user who created it. */
export interface MovementListItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  movement_type: MovementType;
  quantity: number;
  to_representative_id: string | null;
  reference_no: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Task 5 — Customers & Orders (warehouse orders + customer sales).
// Column names mirror the PostgreSQL schema exactly.
// -----------------------------------------------------------------------------

export type CustomerType = "retail" | "institutional" | "government";

export type OrderType = "warehouse_order" | "customer_sale";

export type OrderStatus =
  | "pending"
  | "approved"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export interface CustomerRow {
  id: string;
  representative_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: CustomerType;
  organization_name: string | null;
  upazila_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** A customer row for the list, joined with rep + geography names. */
export interface CustomerListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  type: CustomerType;
  organization_name: string | null;
  representative_id: string;
  representative_name: string;
  upazila_id: string | null;
  upazila_name: string | null;
  created_at: string;
}

/** Full detail for a single customer, joined with rep + geography. */
export interface CustomerDetail extends CustomerRow {
  representative_name: string;
  rep_user_id: string;
  rep_division_id: string;
  rep_district_id: string;
  upazila_name: string | null;
}

/** An order row for the list, joined with rep + customer names. */
export interface OrderListItem {
  id: string;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  order_date: string;
  expected_delivery: string | null;
  total_amount: string;
  discount_amount: string;
  net_amount: string;
  representative_id: string;
  representative_name: string;
  rep_user_id: string;
  customer_id: string | null;
  customer_name: string | null;
}

/** An order line item joined with product name/sku. */
export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: string;
  cost_price: string;
  subtotal: string;
}

/** A status-history entry joined with the user who made the change. */
export interface OrderStatusHistoryItem {
  id: string;
  order_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string;
  changed_by_name: string;
  notes: string | null;
  created_at: string;
}

/** Full detail for a single order: header + rep/customer + geography scope. */
export interface OrderDetail {
  id: string;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  order_date: string;
  expected_delivery: string | null;
  total_amount: string;
  discount_amount: string;
  net_amount: string;
  notes: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  representative_id: string;
  representative_name: string;
  rep_user_id: string;
  rep_division_id: string;
  rep_district_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
}

// -----------------------------------------------------------------------------
// Task 6 — Projects, Profit & Investment Distribution.
// Column names mirror the PostgreSQL schema exactly. DECIMAL money/units come
// back from node-postgres as strings; parse with Number() where doing math.
// -----------------------------------------------------------------------------

export type ProjectStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "profit_distributed"
  | "cancelled";

export type BeneficiaryRole =
  | "representative"
  | "district_head"
  | "divisional_head"
  | "hq";

export type DistributionType = "profit_share" | "investment_return";

export type PayoutSchedule = "monthly" | "annual";

export type DistributionStatus = "pending" | "approved" | "paid";

/** A row from profit_distribution_config (versioned three-way split). */
export interface ProfitConfigRow {
  id: string;
  representative_percentage: string;
  hq_percentage: string;
  investment_percentage: string;
  effective_from: string;
  effective_to: string | null;
  created_by: string | null;
  created_at: string;
}

/** A row from investment_pool_config (versioned per-unit amount). */
export interface InvestmentConfigRow {
  id: string;
  per_unit_amount: string;
  total_working_capital: string | null;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  created_at: string;
}

/** Inputs for creating a project (financials pre-parsed to numbers). */
export interface ProjectInput {
  representative_id: string;
  customer_id: string | null;
  title: string;
  description: string | null;
  project_value: number;
  vat_tax_percentage: number;
  vat_tax_amount: number;
  total_cost: number;
  status: "draft" | "in_progress";
}

/** A project row for the list, joined with rep + geography + customer names. */
export interface ProjectListItem {
  id: string;
  project_number: string;
  title: string;
  status: ProjectStatus;
  project_value: string;
  net_profit: string;
  profit_year: number | null;
  completed_date: string | null;
  created_at: string;
  representative_id: string;
  representative_name: string;
  rep_user_id: string;
  upazila_id: string;
  upazila_name: string;
  district_id: string;
  district_name: string;
  division_id: string;
  division_name: string;
  customer_id: string | null;
  customer_name: string | null;
}

/** Full detail for a single project: financials + split + scope. */
export interface ProjectDetail {
  id: string;
  project_number: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  project_value: string;
  vat_tax_percentage: string;
  vat_tax_amount: string;
  total_cost: string;
  net_profit: string;
  rep_share_amount: string;
  hq_share_amount: string;
  investment_share_amount: string;
  investment_return_per_unit: string;
  completed_date: string | null;
  profit_year: number | null;
  created_at: string;
  updated_at: string;
  representative_id: string;
  representative_name: string;
  rep_user_id: string;
  rep_investment_units: string;
  rep_is_district_head: boolean;
  upazila_id: string;
  upazila_name: string;
  upazila_is_sadar: boolean;
  district_id: string;
  district_name: string;
  division_id: string;
  division_name: string;
  customer_id: string | null;
  customer_name: string | null;
}

/** A project_distributions row joined with the beneficiary's name. */
export interface DistributionRow {
  id: string;
  project_id: string;
  project_number: string;
  project_title: string;
  beneficiary_user_id: string | null;
  beneficiary_rep_id: string | null;
  beneficiary_role: BeneficiaryRole;
  beneficiary_name: string;
  distribution_type: DistributionType;
  units: string;
  rate_or_percentage: string | null;
  amount: string;
  payout_schedule: PayoutSchedule;
  payout_year: number | null;
  payout_month: number | null;
  status: DistributionStatus;
  paid_date: string | null;
  payout_reference: string | null;
  created_at: string;
}
