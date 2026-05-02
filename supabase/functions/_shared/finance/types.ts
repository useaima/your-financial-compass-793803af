export type AgentMode = "manual" | "assisted" | "autopilot";
export type ExecutionProvider = "manual_external_account" | "utg";
export type ExecutionDispatchStatus = "not_dispatched" | "dispatch_pending" | "dispatched" | "dispatch_failed";

export type FinanceProfile = {
  user_id: string;
  legacy_public_user_id: string | null;
  first_name: string;
  last_name: string;
  country: string;
  phone_number: string;
  user_type: string;
  updates_opt_in: boolean;
  model_training_opt_in: boolean;
  agent_mode: AgentMode;
  autopilot_high_risk_enabled: boolean;
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
};

export type FinanceGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

export type FinanceBudgetLimit = {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
};

export type FinanceSpendingEvent = {
  id: string;
  user_id: string;
  date: string;
  items: Array<{ category: string; amount: number; description: string }>;
  raw_input: string;
  total: number;
  source: string;
  created_at: string;
};

export type FinanceFinancialEntry = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  entry_type: "asset" | "liability";
  value: number;
  cashflow: number;
  balance: number;
  payment: number;
  description?: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceSubscription = {
  id: string;
  user_id: string;
  name: string;
  price: number;
  billing_cycle: "monthly" | "yearly";
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LegacyPublicProfile = {
  public_user_id: string;
  first_name: string;
  last_name: string;
  country: string;
  phone_number?: string;
  user_type: string;
  updates_opt_in: boolean;
  model_training_opt_in?: boolean;
  password_setup_completed?: boolean;
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
};

export type DashboardSummary = {
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
};

export type AdviceResult = {
  id: string;
  type:
    | "spending_acknowledgement"
    | "grounded_advice"
    | "budget_warning"
    | "goal_progress_nudge";
  tone: "info" | "success" | "warning";
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
};

export type SummaryResult = {
  period: "daily" | "weekly";
  status: "ready" | "needs_more_data";
  headline: string;
  body: string;
  total_spent: number;
  event_count: number;
  top_category: string | null;
  generated_at: string;
};

export type BudgetStatus = {
  category: string;
  monthly_limit: number;
  spent_this_month: number;
  remaining_amount: number;
  percent_used: number;
  status: "healthy" | "watch" | "over";
};

export type GoalStatus = {
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
};

export type PatternSummary = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  period: "weekly" | "monthly";
  amount: number;
  direction: "up" | "down" | "steady";
  confidence: "low" | "medium" | "high";
};

export type ForecastResult = {
  period_end: string;
  days_remaining: number;
  month_to_date_spending: number;
  projected_end_of_month_spend: number;
  projected_end_of_month_cash: number;
  projected_free_cash: number;
  spending_run_rate: number;
  status: "needs_more_data" | "on_track" | "watch" | "overextended";
  summary: string;
};

export type SubscriptionReview = {
  status: "clear" | "review" | "trim";
  active_count: number;
  monthly_total: number;
  flagged_count: number;
  summary: string;
  recommendations: Array<{
    id: string;
    name: string;
    action: "keep" | "review" | "cancel";
    reason: string;
    monthly_impact: number;
  }>;
};

export type AffordabilityResult = {
  amount: number;
  category: string | null;
  cadence: "one_time" | "monthly";
  projected_free_cash: number;
  health_score: number;
  status: "comfortable" | "tight" | "not_now" | "needs_more_data";
  suggested_limit: number;
  summary: string;
};

export type DraftImportSource = "csv" | "forwarded_email" | "receipt_image";

export type SensitiveActionId =
  | "generate_statement"
  | "review_draft_transaction"
  | "receipt_forwarding"
  | "security_settings"
  | "approve_request";

export type FinanceImportJob = {
  id: string;
  user_id: string;
  source: DraftImportSource;
  status: "pending_review" | "processed" | "failed";
  file_name: string | null;
  source_ref: string | null;
  imported_count: number;
  duplicate_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceDraftTransaction = {
  id: string;
  user_id: string;
  import_job_id: string | null;
  source: DraftImportSource;
  transaction_date: string;
  merchant: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
  dedupe_key: string;
  status: "pending" | "approved" | "rejected";
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

export type FinanceSensitiveActionVerification = {
  id: string;
  user_id: string;
  action_type: SensitiveActionId;
  code_hash: string;
  delivery_target: string;
  expires_at: string;
  attempt_count: number;
  verified_at: string | null;
  used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

export type AgentTask = {
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
};

export type ExecutionIntent = {
  action_type: string;
  title: string;
  description: string;
  provider?: ExecutionProvider;
  payload: Record<string, unknown>;
};

export type FinanceApprovalRequest = {
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
};

export type FinanceExecutionReceipt = {
  id: string;
  user_id: string;
  approval_request_id: string | null;
  action_type: string;
  status: "approved_pending" | "completed" | "failed" | "cancelled";
  title: string;
  description: string;
  provider: ExecutionProvider;
  dispatch_status: ExecutionDispatchStatus;
  receipt_payload: Record<string, unknown>;
  reconciliation_payload: Record<string, unknown>;
  executed_at: string;
  dispatched_at: string | null;
  reconciled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SensitiveActionCodeRequestResult = {
  verification_id: string;
  action: SensitiveActionId;
  expires_at: string;
  resend_available_at: string;
  delivery_target: string;
};

export type SensitiveActionCodeVerifyResult = {
  verification_id: string;
  action: SensitiveActionId;
  verified_at: string;
  expires_at: string;
};

export type ReceiptImageAnalysis = {
  merchant?: unknown;
  transaction_date?: unknown;
  currency?: unknown;
  total?: unknown;
  summary?: unknown;
  items?: Array<{
    description?: unknown;
    amount?: unknown;
    category?: unknown;
  }>;
};
