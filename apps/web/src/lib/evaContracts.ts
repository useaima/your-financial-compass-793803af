export type UserType = "personal" | "business";
export type FinancialEntryType = "asset" | "liability";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface UserProfile {
  user_id: string;
  legacy_public_user_id: string | null;
  first_name: string;
  last_name: string;
  country: string;
  phone_number: string;
  user_type: UserType;
  updates_opt_in: boolean;
  model_training_opt_in: boolean;
  password_setup_completed: boolean;
  cash_balance: number;
  monthly_income: number;
  monthly_fixed_expenses: number;
  budgeting_focus: string;
  intent_focus: string;
  biggest_problem: string;
  money_style: string;
  guidance_style: string;
  goal_focus: string;
  subscription_awareness: string;
  target_monthly_savings: number;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserGoal {
  id: string;
  user_id?: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  icon: string;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetLimit {
  id: string;
  user_id?: string;
  category: string;
  monthly_limit: number;
  created_at?: string;
  updated_at?: string;
}

export interface SpendingEventItem {
  category: string;
  amount: number;
  description: string;
}

export interface SpendingEvent {
  id: string;
  user_id?: string;
  date: string;
  items: SpendingEventItem[];
  raw_input: string;
  total: number;
  source: string;
  created_at?: string;
}

export interface FinancialEntry {
  id: string;
  user_id?: string;
  name: string;
  type: string;
  entry_type: FinancialEntryType;
  value: number;
  cashflow: number;
  balance: number;
  payment: number;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Subscription {
  id: string;
  user_id?: string;
  name: string;
  price: number;
  billing_cycle: "monthly" | "yearly";
  category: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardSummary {
  cash_balance: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  monthly_income: number;
  monthly_fixed_expenses: number;
  monthly_subscription_total: number;
  monthly_cashflow: number;
  savings_rate: number;
  health_score: number;
  spending_this_month: number;
  latest_spending_date: string | null;
}

export interface PatternSummary {
  id: string;
  title: string;
  body: string;
  category: string | null;
  period: "weekly" | "monthly";
  amount: number;
  direction: "up" | "down" | "steady";
  confidence: "low" | "medium" | "high";
}

export interface ForecastResult {
  period_end: string;
  days_remaining: number;
  month_to_date_spending: number;
  projected_end_of_month_spend: number;
  projected_end_of_month_cash: number;
  projected_free_cash: number;
  spending_run_rate: number;
  status: "needs_more_data" | "on_track" | "watch" | "overextended";
  summary: string;
}

export interface SubscriptionReviewItem {
  id: string;
  name: string;
  action: "keep" | "review" | "cancel";
  reason: string;
  monthly_impact: number;
}

export interface SubscriptionReview {
  status: "clear" | "review" | "trim";
  active_count: number;
  monthly_total: number;
  flagged_count: number;
  summary: string;
  recommendations: SubscriptionReviewItem[];
}

export interface AffordabilityResult {
  amount: number;
  category: string | null;
  cadence: "one_time" | "monthly";
  projected_free_cash: number;
  health_score: number;
  status: "comfortable" | "tight" | "not_now" | "needs_more_data";
  suggested_limit: number;
  summary: string;
}

export type AdviceType =
  | "spending_acknowledgement"
  | "grounded_advice"
  | "budget_warning"
  | "goal_progress_nudge";

export type AdviceTone = "info" | "success" | "warning";

export interface AdviceResult {
  id: string;
  type: AdviceType;
  tone: AdviceTone;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
}

export type SummaryPeriod = "daily" | "weekly";

export interface SummaryResult {
  period: SummaryPeriod;
  status: "ready" | "needs_more_data";
  headline: string;
  body: string;
  total_spent: number;
  event_count: number;
  top_category: string | null;
  generated_at: string;
}

export interface BudgetStatus {
  category: string;
  monthly_limit: number;
  spent_this_month: number;
  remaining_amount: number;
  percent_used: number;
  status: "healthy" | "watch" | "over";
}

export interface GoalStatus {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  remaining_amount: number;
  progress_percent: number;
  deadline: string;
  days_remaining: number;
  monthly_contribution_needed: number;
  status: "on_track" | "needs_attention" | "achieved";
}

export type ImportSource = "csv" | "forwarded_email" | "receipt_image";

export interface ImportJob {
  id: string;
  user_id?: string;
  source: ImportSource;
  status: "pending_review" | "processed" | "failed";
  file_name: string | null;
  source_ref: string | null;
  imported_count: number;
  duplicate_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DraftTransaction {
  id: string;
  user_id?: string;
  import_job_id: string | null;
  source: ImportSource;
  transaction_date: string;
  merchant: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
  dedupe_key: string;
  status: "pending" | "approved" | "rejected";
  raw_payload: Record<string, unknown> | null;
  created_at?: string;
  reviewed_at?: string | null;
}

export interface NotificationItem {
  id: string;
  user_id?: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmptyFlags {
  has_spending_history: boolean;
  has_goals: boolean;
  has_budget_limits: boolean;
  has_subscriptions: boolean;
  has_balance_sheet: boolean;
}

export interface MigrationState {
  legacy_public_user_id: string | null;
  migrated_from_public: boolean;
}

export interface BootstrapData {
  user_id: string;
  email: string | null;
  has_onboarded: boolean;
  migration: MigrationState;
  profile: UserProfile | null;
  goals: UserGoal[];
  budget_limits: BudgetLimit[];
  spending_events: SpendingEvent[];
  spending_logs: SpendingEvent[];
  financial_entries: FinancialEntry[];
  subscriptions: Subscription[];
  dashboard_summary: DashboardSummary;
  advice: AdviceResult[];
  summaries: SummaryResult[];
  pattern_summaries: PatternSummary[];
  forecast: ForecastResult | null;
  subscription_review: SubscriptionReview | null;
  budget_statuses: BudgetStatus[];
  goal_statuses: GoalStatus[];
  import_jobs: ImportJob[];
  draft_transactions: DraftTransaction[];
  notifications: NotificationItem[];
  empty_flags: EmptyFlags;
}

export interface OnboardingPayload {
  profile: {
    first_name: string;
    last_name: string;
    country: string;
    phone_number: string;
    user_type: UserType;
    updates_opt_in: boolean;
    model_training_opt_in?: boolean;
    password_setup_completed: boolean;
    cash_balance: number;
    monthly_income: number;
    monthly_fixed_expenses: number;
    budgeting_focus: string;
    intent_focus: string;
    biggest_problem: string;
    money_style: string;
    guidance_style: string;
    goal_focus: string;
    subscription_awareness: string;
    target_monthly_savings: number;
  };
  goals: Array<{
    name: string;
    target_amount: number;
    current_amount: number;
    deadline: string;
    icon: string;
  }>;
  budget_limits: Array<{
    category: string;
    monthly_limit: number;
  }>;
  financial_entries: Array<{
    name: string;
    type: string;
    entry_type: FinancialEntryType;
    value: number;
    cashflow: number;
    balance: number;
    payment: number;
    description?: string | null;
  }>;
  subscriptions: Array<{
    name: string;
    price: number;
    billing_cycle: "monthly" | "yearly";
    category: string;
    is_active: boolean;
  }>;
}

export interface AgentTask {
  id: string;
  user_id: string;
  task_type: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  reason: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  trace_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionIntent {
  action_type: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
}

export interface ApprovalRequest {
  id: string;
  user_id: string;
  action_type: string;
  risk_class: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "expired";
  title: string;
  description: string;
  request_payload: Record<string, unknown>;
  execution_intent: ExecutionIntent | Record<string, unknown>;
  expires_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToolResult<TData = Record<string, unknown>> {
  ok: boolean;
  tool: string;
  data: TData;
  message?: string;
}
