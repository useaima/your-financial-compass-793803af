import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { hasSupabaseConfig, SUPABASE_SETUP_MESSAGE } from "@/integrations/supabase/client";
import { EMPTY_DASHBOARD_SUMMARY } from "@/lib/finance";
import { getOrCreatePublicUserId } from "@/lib/publicUser";

export type UserType = "personal" | "business";
export type FinancialEntryType = "asset" | "liability";

export interface UserProfile {
  public_user_id: string;
  first_name: string;
  last_name: string;
  country: string;
  user_type: UserType;
  updates_opt_in: boolean;
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
  public_user_id?: string;
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
  public_user_id?: string;
  category: string;
  monthly_limit: number;
  created_at?: string;
  updated_at?: string;
}

export interface SpendingLogItem {
  category: string;
  amount: number;
  description: string;
}

export interface SpendingLog {
  id: string;
  public_user_id?: string;
  date: string;
  items: SpendingLogItem[];
  raw_input: string;
  total: number;
  created_at?: string;
}

export interface FinancialEntry {
  id: string;
  public_user_id?: string;
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
  public_user_id?: string;
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

export interface EmptyFlags {
  has_spending_history: boolean;
  has_goals: boolean;
  has_budget_limits: boolean;
  has_subscriptions: boolean;
  has_balance_sheet: boolean;
}

export interface BootstrapData {
  public_user_id: string;
  has_onboarded: boolean;
  profile: UserProfile | null;
  goals: UserGoal[];
  budget_limits: BudgetLimit[];
  spending_logs: SpendingLog[];
  financial_entries: FinancialEntry[];
  subscriptions: Subscription[];
  dashboard_summary: DashboardSummary;
  empty_flags: EmptyFlags;
}

export interface OnboardingPayload {
  profile: {
    first_name: string;
    last_name: string;
    country: string;
    user_type: UserType;
    updates_opt_in: boolean;
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

function createEmptyBootstrap(publicUserId: string): BootstrapData {
  return {
    public_user_id: publicUserId,
    has_onboarded: false,
    profile: null,
    goals: [],
    budget_limits: [],
    spending_logs: [],
    financial_entries: [],
    subscriptions: [],
    dashboard_summary: { ...EMPTY_DASHBOARD_SUMMARY },
    empty_flags: {
      has_spending_history: false,
      has_goals: false,
      has_budget_limits: false,
      has_subscriptions: false,
      has_balance_sheet: false,
    },
  };
}

async function invokePublicData<T>(action: string, payload: Record<string, unknown> = {}) {
  const publicUserId = getOrCreatePublicUserId();

  if (!hasSupabaseConfig) {
    if (action === "bootstrap") {
      return createEmptyBootstrap(publicUserId) as T;
    }
    throw new Error(SUPABASE_SETUP_MESSAGE);
  }

  return invokeEdgeFunction<T>("public-user-data", {
    action,
    public_user_id: publicUserId,
    ...payload,
  });
}

export function getEmptyBootstrap() {
  return createEmptyBootstrap(getOrCreatePublicUserId());
}

export async function fetchBootstrap() {
  return invokePublicData<BootstrapData>("bootstrap");
}

export async function completeOnboarding(payload: OnboardingPayload) {
  return invokePublicData<BootstrapData>("complete_onboarding", payload);
}

export async function updateProfile(payload: Partial<UserProfile>) {
  return invokePublicData<BootstrapData>("update_profile", { profile: payload });
}

export async function saveGoal(goal: Partial<UserGoal>) {
  return invokePublicData<BootstrapData>("save_goal", { goal });
}

export async function deleteGoal(goalId: string) {
  return invokePublicData<BootstrapData>("delete_goal", { goal_id: goalId });
}

export async function saveBudgetLimit(limit: Partial<BudgetLimit>) {
  return invokePublicData<BootstrapData>("save_budget_limit", { budget_limit: limit });
}

export async function deleteBudgetLimit(limitId: string) {
  return invokePublicData<BootstrapData>("delete_budget_limit", { budget_limit_id: limitId });
}

export async function saveSubscription(subscription: Partial<Subscription>) {
  return invokePublicData<BootstrapData>("save_subscription", { subscription });
}

export async function deleteSubscription(subscriptionId: string) {
  return invokePublicData<BootstrapData>("delete_subscription", { subscription_id: subscriptionId });
}

export async function saveFinancialEntry(entry: Partial<FinancialEntry>) {
  return invokePublicData<BootstrapData>("save_financial_entry", { financial_entry: entry });
}

export async function deleteFinancialEntry(entryId: string) {
  return invokePublicData<BootstrapData>("delete_financial_entry", { financial_entry_id: entryId });
}
