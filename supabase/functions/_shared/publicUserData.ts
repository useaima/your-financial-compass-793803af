import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PUBLIC_USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PublicProfile = {
  public_user_id: string;
  first_name: string;
  last_name: string;
  country: string;
  user_type: string;
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
};

type PublicGoal = {
  id: string;
  public_user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

type PublicBudgetLimit = {
  id: string;
  public_user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
};

type PublicSpendingLog = {
  id: string;
  public_user_id: string;
  date: string;
  items: Array<{ category: string; amount: number; description: string }>;
  raw_input: string;
  total: number;
  created_at: string;
};

type PublicFinancialEntry = {
  id: string;
  public_user_id: string;
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

type PublicSubscription = {
  id: string;
  public_user_id: string;
  name: string;
  price: number;
  billing_cycle: "monthly" | "yearly";
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type DashboardSummary = {
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

function parseNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseBoolean(value: unknown) {
  return Boolean(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getPublicUserId(value: unknown) {
  if (typeof value !== "string" || !PUBLIC_USER_ID_PATTERN.test(value)) {
    throw new Error("A valid public_user_id is required.");
  }

  return value;
}

export function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase admin credentials are missing.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function calculateHealthScore({
  monthlyIncome,
  monthlyCashflow,
  totalAssets,
  totalLiabilities,
  spendingLogs,
}: {
  monthlyIncome: number;
  monthlyCashflow: number;
  totalAssets: number;
  totalLiabilities: number;
  spendingLogs: PublicSpendingLog[];
}) {
  let score = 50;

  if (monthlyIncome > 0) {
    const savingsRate = monthlyCashflow / monthlyIncome;
    if (savingsRate >= 0.3) score += 20;
    else if (savingsRate >= 0.15) score += 10;
    else if (savingsRate < 0) score -= 15;
  }

  if (totalAssets > 0) {
    const leverage = totalLiabilities / totalAssets;
    if (leverage <= 0.25) score += 12;
    else if (leverage >= 0.75) score -= 10;
  }

  if (spendingLogs.length >= 10) {
    score += 8;
  } else if (spendingLogs.length >= 4) {
    score += 4;
  }

  return clamp(Math.round(score), 10, 100);
}

function buildDashboardSummary(
  profile: PublicProfile | null,
  spendingLogs: PublicSpendingLog[],
  financialEntries: PublicFinancialEntry[],
  subscriptions: PublicSubscription[],
): DashboardSummary {
  const cashBalance = parseNumber(profile?.cash_balance);
  const monthlyIncome = parseNumber(profile?.monthly_income);
  const monthlyFixedExpenses = parseNumber(profile?.monthly_fixed_expenses);
  const totalAssets =
    cashBalance +
    financialEntries
      .filter((entry) => entry.entry_type === "asset")
      .reduce((sum, entry) => sum + parseNumber(entry.value), 0);
  const totalLiabilities = financialEntries
    .filter((entry) => entry.entry_type === "liability")
    .reduce((sum, entry) => sum + parseNumber(entry.balance), 0);
  const monthlySubscriptionTotal = subscriptions
    .filter((subscription) => subscription.is_active)
    .reduce((sum, subscription) => {
      const amount = parseNumber(subscription.price);
      return sum + (subscription.billing_cycle === "yearly" ? amount / 12 : amount);
    }, 0);
  const monthlyCashflow =
    monthlyIncome - monthlyFixedExpenses - monthlySubscriptionTotal;
  const savingsRate =
    monthlyIncome > 0 ? clamp(Math.round((monthlyCashflow / monthlyIncome) * 100), -100, 100) : 0;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const spendingThisMonth = spendingLogs
    .filter((log) => log.date.startsWith(currentMonth))
    .reduce((sum, log) => sum + parseNumber(log.total), 0);
  const latestSpendingDate = spendingLogs[0]?.date ?? null;

  return {
    cash_balance: cashBalance,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    net_worth: totalAssets - totalLiabilities,
    monthly_income: monthlyIncome,
    monthly_fixed_expenses: monthlyFixedExpenses,
    monthly_subscription_total: monthlySubscriptionTotal,
    monthly_cashflow: monthlyCashflow,
    savings_rate: savingsRate,
    health_score: calculateHealthScore({
      monthlyIncome,
      monthlyCashflow,
      totalAssets,
      totalLiabilities,
      spendingLogs,
    }),
    spending_this_month: spendingThisMonth,
    latest_spending_date: latestSpendingDate,
  };
}

export function normalizeProfile(publicUserId: string, profile: Record<string, unknown>) {
  return {
    public_user_id: publicUserId,
    first_name: String(profile.first_name ?? ""),
    last_name: String(profile.last_name ?? ""),
    country: String(profile.country ?? ""),
    user_type: profile.user_type === "business" ? "business" : "personal",
    updates_opt_in: parseBoolean(profile.updates_opt_in),
    cash_balance: parseNumber(profile.cash_balance),
    monthly_income: parseNumber(profile.monthly_income),
    monthly_fixed_expenses: parseNumber(profile.monthly_fixed_expenses),
    budgeting_focus: String(profile.budgeting_focus ?? ""),
    intent_focus: String(profile.intent_focus ?? ""),
    biggest_problem: String(profile.biggest_problem ?? ""),
    money_style: String(profile.money_style ?? ""),
    guidance_style: String(profile.guidance_style ?? ""),
    goal_focus: String(profile.goal_focus ?? ""),
    subscription_awareness: String(profile.subscription_awareness ?? ""),
    target_monthly_savings: parseNumber(profile.target_monthly_savings),
  };
}

export async function buildBootstrap(publicUserId: string) {
  const admin = createAdminClient();
  const [
    profileResult,
    goalsResult,
    budgetResult,
    logsResult,
    financialEntriesResult,
    subscriptionResult,
  ] = await Promise.all([
    admin
      .from("public_user_profiles")
      .select("*")
      .eq("public_user_id", publicUserId)
      .maybeSingle(),
    admin
      .from("public_user_goals")
      .select("*")
      .eq("public_user_id", publicUserId)
      .order("created_at", { ascending: true }),
    admin
      .from("public_user_budget_limits")
      .select("*")
      .eq("public_user_id", publicUserId)
      .order("category", { ascending: true }),
    admin
      .from("public_user_spending_logs")
      .select("*")
      .eq("public_user_id", publicUserId)
      .order("date", { ascending: false })
      .limit(120),
    admin
      .from("public_user_financial_entries")
      .select("*")
      .eq("public_user_id", publicUserId)
      .order("created_at", { ascending: true }),
    admin
      .from("public_user_subscriptions")
      .select("*")
      .eq("public_user_id", publicUserId)
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (goalsResult.error) throw goalsResult.error;
  if (budgetResult.error) throw budgetResult.error;
  if (logsResult.error) throw logsResult.error;
  if (financialEntriesResult.error) throw financialEntriesResult.error;
  if (subscriptionResult.error) throw subscriptionResult.error;

  const profile = (profileResult.data as PublicProfile | null) ?? null;
  const goals = (goalsResult.data as PublicGoal[]) ?? [];
  const budgetLimits = (budgetResult.data as PublicBudgetLimit[]) ?? [];
  const spendingLogs = (logsResult.data as PublicSpendingLog[]) ?? [];
  const financialEntries =
    (financialEntriesResult.data as PublicFinancialEntry[]) ?? [];
  const subscriptions =
    (subscriptionResult.data as PublicSubscription[]) ?? [];

  const dashboardSummary = buildDashboardSummary(
    profile,
    spendingLogs,
    financialEntries,
    subscriptions,
  );

  return {
    public_user_id: publicUserId,
    has_onboarded: Boolean(profile?.onboarding_completed),
    profile,
    goals,
    budget_limits: budgetLimits,
    spending_logs: spendingLogs,
    financial_entries: financialEntries,
    subscriptions,
    dashboard_summary: dashboardSummary,
    empty_flags: {
      has_spending_history: spendingLogs.length > 0,
      has_goals: goals.length > 0,
      has_budget_limits: budgetLimits.length > 0,
      has_subscriptions: subscriptions.length > 0,
      has_balance_sheet: financialEntries.length > 0 || dashboardSummary.cash_balance > 0,
    },
  };
}

export async function replaceOnboardingData(
  publicUserId: string,
  payload: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const normalizedProfile = normalizeProfile(
    publicUserId,
    (payload.profile as Record<string, unknown>) ?? {},
  );

  const { error: profileError } = await admin
    .from("public_user_profiles")
    .upsert({
      ...normalizedProfile,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    });

  if (profileError) throw profileError;

  await Promise.all([
    admin.from("public_user_goals").delete().eq("public_user_id", publicUserId),
    admin.from("public_user_budget_limits").delete().eq("public_user_id", publicUserId),
    admin.from("public_user_financial_entries").delete().eq("public_user_id", publicUserId),
    admin.from("public_user_subscriptions").delete().eq("public_user_id", publicUserId),
  ]);

  const goals = Array.isArray(payload.goals) ? payload.goals : [];
  const budgetLimits = Array.isArray(payload.budget_limits)
    ? payload.budget_limits
    : [];
  const financialEntries = Array.isArray(payload.financial_entries)
    ? payload.financial_entries
    : [];
  const subscriptions = Array.isArray(payload.subscriptions)
    ? payload.subscriptions
    : [];

  if (goals.length > 0) {
    const { error } = await admin.from("public_user_goals").insert(
      goals.map((goal) => ({
        public_user_id: publicUserId,
        name: String((goal as Record<string, unknown>).name ?? ""),
        target_amount: parseNumber(
          (goal as Record<string, unknown>).target_amount,
        ),
        current_amount: parseNumber(
          (goal as Record<string, unknown>).current_amount,
        ),
        deadline: String((goal as Record<string, unknown>).deadline ?? ""),
        icon: String((goal as Record<string, unknown>).icon ?? "🎯"),
      })),
    );
    if (error) throw error;
  }

  if (budgetLimits.length > 0) {
    const { error } = await admin.from("public_user_budget_limits").insert(
      budgetLimits.map((limit) => ({
        public_user_id: publicUserId,
        category: String((limit as Record<string, unknown>).category ?? ""),
        monthly_limit: parseNumber(
          (limit as Record<string, unknown>).monthly_limit,
        ),
      })),
    );
    if (error) throw error;
  }

  if (financialEntries.length > 0) {
    const { error } = await admin.from("public_user_financial_entries").insert(
      financialEntries.map((entry) => ({
        public_user_id: publicUserId,
        name: String((entry as Record<string, unknown>).name ?? ""),
        type: String((entry as Record<string, unknown>).type ?? "other"),
        entry_type:
          (entry as Record<string, unknown>).entry_type === "liability"
            ? "liability"
            : "asset",
        value: parseNumber((entry as Record<string, unknown>).value),
        cashflow: parseNumber((entry as Record<string, unknown>).cashflow),
        balance: parseNumber((entry as Record<string, unknown>).balance),
        payment: parseNumber((entry as Record<string, unknown>).payment),
        description: String((entry as Record<string, unknown>).description ?? ""),
      })),
    );
    if (error) throw error;
  }

  if (subscriptions.length > 0) {
    const { error } = await admin.from("public_user_subscriptions").insert(
      subscriptions.map((subscription) => ({
        public_user_id: publicUserId,
        name: String((subscription as Record<string, unknown>).name ?? ""),
        price: parseNumber((subscription as Record<string, unknown>).price),
        billing_cycle:
          (subscription as Record<string, unknown>).billing_cycle === "yearly"
            ? "yearly"
            : "monthly",
        category: String((subscription as Record<string, unknown>).category ?? "Other"),
        is_active: parseBoolean(
          (subscription as Record<string, unknown>).is_active ?? true,
        ),
      })),
    );
    if (error) throw error;
  }
}
