import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { EVA_MODELS, requestGatewayCompletion } from "./evaGateway.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type FinanceProfile = {
  user_id: string;
  legacy_public_user_id: string | null;
  first_name: string;
  last_name: string;
  country: string;
  phone_number: string;
  user_type: string;
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
};

type FinanceGoal = {
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

type FinanceBudgetLimit = {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
};

type FinanceSpendingEvent = {
  id: string;
  user_id: string;
  date: string;
  items: Array<{ category: string; amount: number; description: string }>;
  raw_input: string;
  total: number;
  source: string;
  created_at: string;
};

type FinanceFinancialEntry = {
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

type FinanceSubscription = {
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

type LegacyPublicProfile = {
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

type AdviceResult = {
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

type SummaryResult = {
  period: "daily" | "weekly";
  status: "ready" | "needs_more_data";
  headline: string;
  body: string;
  total_spent: number;
  event_count: number;
  top_category: string | null;
  generated_at: string;
};

type BudgetStatus = {
  category: string;
  monthly_limit: number;
  spent_this_month: number;
  remaining_amount: number;
  percent_used: number;
  status: "healthy" | "watch" | "over";
};

type GoalStatus = {
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

type PatternSummary = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  period: "weekly" | "monthly";
  amount: number;
  direction: "up" | "down" | "steady";
  confidence: "low" | "medium" | "high";
};

type ForecastResult = {
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

type SubscriptionReview = {
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

type AffordabilityResult = {
  amount: number;
  category: string | null;
  cadence: "one_time" | "monthly";
  projected_free_cash: number;
  health_score: number;
  status: "comfortable" | "tight" | "not_now" | "needs_more_data";
  suggested_limit: number;
  summary: string;
};

type DraftImportSource = "csv" | "forwarded_email" | "receipt_image";

type FinanceImportJob = {
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

type FinanceDraftTransaction = {
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

type NotificationItem = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function parseString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeCategory(value: unknown) {
  const category = parseString(value, "Other");
  return category || "Other";
}

function toIsoDate(value: Date) {
  return value.toISOString().split("T")[0];
}

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDaysInMonth(date = new Date()) {
  return getMonthEnd(date).getDate();
}

function getMonthMetrics(
  spendingEvents: FinanceSpendingEvent[],
  date = new Date(),
) {
  const monthKey = getMonthKey(date);
  const monthStart = getMonthStart(date);
  const previousMonthStart = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const previousMonthKey = getMonthKey(previousMonthStart);
  const currentMonthEvents = spendingEvents.filter((event) => event.date.startsWith(monthKey));
  const previousMonthEvents = spendingEvents.filter((event) =>
    event.date.startsWith(previousMonthKey),
  );
  const currentMonthSpent = currentMonthEvents.reduce(
    (sum, event) => sum + parseNumber(event.total),
    0,
  );
  const previousMonthSpent = previousMonthEvents.reduce(
    (sum, event) => sum + parseNumber(event.total),
    0,
  );
  const elapsedDays = Math.max(
    1,
    Math.min(
      getDaysInMonth(date),
      Math.floor((date.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    ),
  );
  const daysInMonth = getDaysInMonth(date);

  return {
    monthKey,
    currentMonthEvents,
    previousMonthEvents,
    currentMonthSpent,
    previousMonthSpent,
    elapsedDays,
    daysInMonth,
  };
}

function parseDateInput(value: unknown, fallbackDate: string) {
  const parsed = new Date(parseString(value, fallbackDate));
  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate;
  }

  return toIsoDate(parsed);
}

function buildDraftDedupeKey(input: {
  userId: string;
  source: DraftImportSource;
  transactionDate: string;
  merchant: string;
  amount: number;
  description?: string;
}) {
  return [
    input.userId,
    input.source,
    input.transactionDate,
    input.merchant.toLowerCase().replace(/\s+/g, " ").trim(),
    input.amount.toFixed(2),
    parseString(input.description)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),
  ].join("::");
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      current = "";
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim().length > 0)) {
      rows.push(row);
    }
  }

  return rows.map((cells) => cells.map((cell) => cell.trim()));
}

function inferCategoryFromMerchant(merchant: string, description: string) {
  const haystack = `${merchant} ${description}`.toLowerCase();
  if (/(grocery|supermarket|market|grocer)/.test(haystack)) return "Groceries";
  if (/(uber|taxi|bus|train|fuel|gas|transport|matatu)/.test(haystack)) return "Transport";
  if (/(netflix|spotify|subscription|membership|plan)/.test(haystack)) return "Subscriptions";
  if (/(restaurant|coffee|cafe|lunch|dinner|food|takeout)/.test(haystack)) return "Food";
  if (/(rent|utility|internet|water|electricity|bill)/.test(haystack)) return "Bills";
  if (/(pharmacy|clinic|doctor|health)/.test(haystack)) return "Health";
  if (/(amazon|shop|mall|store|shopping)/.test(haystack)) return "Shopping";
  return "Other";
}

function readGatewayContentText(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (part && typeof part === "object" && "text" in part) {
        return typeof part.text === "string" ? part.text : "";
      }

      return "";
    })
    .join("")
    .trim();
}

function parseGatewayJson<T>(content: unknown) {
  const raw = readGatewayContentText(content);
  if (!raw) {
    return null;
  }

  const normalized = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(normalized) as T;
  } catch (error) {
    console.error("finance-core gateway JSON parse error:", error, normalized);
    return null;
  }
}

export function getLegacyPublicUserId(value: unknown) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    return null;
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

function createUserClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public credentials are missing.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
}

export async function requireAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("Authentication required.");
  }

  const userClient = createUserClient(authHeader);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function calculateHealthScore({
  monthlyIncome,
  monthlyCashflow,
  totalAssets,
  totalLiabilities,
  spendingEvents,
}: {
  monthlyIncome: number;
  monthlyCashflow: number;
  totalAssets: number;
  totalLiabilities: number;
  spendingEvents: FinanceSpendingEvent[];
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

  if (spendingEvents.length >= 10) score += 8;
  else if (spendingEvents.length >= 4) score += 4;

  return clamp(Math.round(score), 10, 100);
}

function buildDashboardSummary(
  profile: FinanceProfile | null,
  spendingEvents: FinanceSpendingEvent[],
  financialEntries: FinanceFinancialEntry[],
  subscriptions: FinanceSubscription[],
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
  const monthlyCashflow = monthlyIncome - monthlyFixedExpenses - monthlySubscriptionTotal;
  const savingsRate =
    monthlyIncome > 0 ? clamp(Math.round((monthlyCashflow / monthlyIncome) * 100), -100, 100) : 0;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const spendingThisMonth = spendingEvents
    .filter((event) => event.date.startsWith(currentMonth))
    .reduce((sum, event) => sum + parseNumber(event.total), 0);
  const latestSpendingDate = spendingEvents[0]?.date ?? null;

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
      spendingEvents,
    }),
    spending_this_month: spendingThisMonth,
    latest_spending_date: latestSpendingDate,
  };
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildCurrentMonthCategoryTotals(spendingEvents: FinanceSpendingEvent[]) {
  const currentMonth = getCurrentMonthKey();
  const totals: Record<string, number> = {};

  for (const event of spendingEvents) {
    if (!event.date.startsWith(currentMonth)) continue;

    for (const item of Array.isArray(event.items) ? event.items : []) {
      const category = String(item.category ?? "Other");
      totals[category] = (totals[category] || 0) + parseNumber(item.amount);
    }
  }

  return totals;
}

function getStatusPriority(status: BudgetStatus["status"]) {
  if (status === "over") return 0;
  if (status === "watch") return 1;
  return 2;
}

function buildBudgetStatuses(
  budgetLimits: FinanceBudgetLimit[],
  spendingEvents: FinanceSpendingEvent[],
) {
  const spendingByCategory = buildCurrentMonthCategoryTotals(spendingEvents);

  return budgetLimits
    .map<BudgetStatus>((budget) => {
      const spentThisMonth = parseNumber(spendingByCategory[budget.category]);
      const monthlyLimit = parseNumber(budget.monthly_limit);
      const percentUsed =
        monthlyLimit > 0
          ? Math.round((spentThisMonth / monthlyLimit) * 100)
          : 0;

      return {
        category: budget.category,
        monthly_limit: monthlyLimit,
        spent_this_month: spentThisMonth,
        remaining_amount: Math.max(monthlyLimit - spentThisMonth, 0),
        percent_used: clamp(percentUsed, 0, 999),
        status:
          spentThisMonth > monthlyLimit
            ? "over"
            : percentUsed >= 80
              ? "watch"
              : "healthy",
      };
    })
    .sort((left, right) => {
      const priorityDiff =
        getStatusPriority(left.status) - getStatusPriority(right.status);
      if (priorityDiff !== 0) return priorityDiff;
      return right.percent_used - left.percent_used;
    });
}

function buildGoalStatuses(
  goals: FinanceGoal[],
  dashboardSummary: DashboardSummary,
) {
  const dayMs = 1000 * 60 * 60 * 24;

  return goals
    .map<GoalStatus>((goal) => {
      const targetAmount = parseNumber(goal.target_amount);
      const currentAmount = parseNumber(goal.current_amount);
      const remainingAmount = Math.max(targetAmount - currentAmount, 0);
      const progressPercent =
        targetAmount > 0
          ? clamp(Math.round((currentAmount / targetAmount) * 100), 0, 100)
          : 0;
      const deadlineMs = new Date(goal.deadline).getTime();
      const rawDaysRemaining = Number.isFinite(deadlineMs)
        ? Math.ceil((deadlineMs - Date.now()) / dayMs)
        : 0;
      const daysRemaining = Math.max(rawDaysRemaining, 0);
      const monthsRemaining = Math.max(Math.ceil(daysRemaining / 30), 1);
      const monthlyContributionNeeded =
        remainingAmount > 0 ? Math.ceil(remainingAmount / monthsRemaining) : 0;
      const status: GoalStatus["status"] =
        remainingAmount <= 0
          ? "achieved"
          : dashboardSummary.monthly_cashflow >= monthlyContributionNeeded &&
              daysRemaining > 0
            ? "on_track"
            : "needs_attention";

      return {
        id: goal.id,
        name: goal.name,
        icon: goal.icon,
        target_amount: targetAmount,
        current_amount: currentAmount,
        remaining_amount: remainingAmount,
        progress_percent: progressPercent,
        deadline: goal.deadline,
        days_remaining: daysRemaining,
        monthly_contribution_needed: monthlyContributionNeeded,
        status,
      };
    })
    .sort((left, right) => {
      if (left.status === "needs_attention" && right.status !== "needs_attention") return -1;
      if (left.status !== "needs_attention" && right.status === "needs_attention") return 1;
      if (left.status === "achieved" && right.status !== "achieved") return 1;
      if (left.status !== "achieved" && right.status === "achieved") return -1;
      return left.days_remaining - right.days_remaining;
    });
}

function summarizeWindow(
  period: SummaryResult["period"],
  spendingEvents: FinanceSpendingEvent[],
  budgetStatuses: BudgetStatus[],
  goalStatuses: GoalStatus[],
) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (period === "daily" ? 0 : 6));

  const relevantEvents = spendingEvents.filter(
    (event) => new Date(event.date) >= since,
  );
  const categoryTotals: Record<string, number> = {};

  for (const event of relevantEvents) {
    for (const item of Array.isArray(event.items) ? event.items : []) {
      const category = String(item.category ?? "Other");
      categoryTotals[category] = (categoryTotals[category] || 0) + parseNumber(item.amount);
    }
  }

  const topCategoryEntry = Object.entries(categoryTotals).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const topCategory = topCategoryEntry?.[0] ?? null;
  const topCategoryAmount = parseNumber(topCategoryEntry?.[1]);
  const totalSpent = relevantEvents.reduce(
    (sum, event) => sum + parseNumber(event.total),
    0,
  );
  const budgetAlert = budgetStatuses.find(
    (status) => status.status === "over" || status.status === "watch",
  );
  const goalAttention = goalStatuses.find((goal) => goal.status === "needs_attention");

  if (relevantEvents.length === 0) {
    return {
      period,
      status: "needs_more_data",
      headline:
        period === "daily"
          ? "No spending logged today yet"
          : "Your weekly summary will sharpen as you keep logging",
      body:
        period === "daily"
          ? "Log your first expense today and eva will turn it into a grounded daily pulse."
          : "You need a few more real logs this week before eva can confidently summarize your trend.",
      total_spent: 0,
      event_count: 0,
      top_category: null,
      generated_at: new Date().toISOString(),
    } satisfies SummaryResult;
  }

  const cadence = period === "daily" ? "today" : "this week";
  const nextPrompt = budgetAlert
    ? `${budgetAlert.category} is ${budgetAlert.status === "over" ? "already over" : "close to"} budget, so that is the next place to tighten.`
    : goalAttention
      ? `${goalAttention.name} needs about $${goalAttention.monthly_contribution_needed} per month to stay on track.`
      : "Keep logging in real time so eva can protect your trend before spending drifts.";

  return {
    period,
    status: "ready",
    headline:
      period === "daily"
        ? `You logged $${totalSpent.toFixed(2)} ${cadence}.`
        : `You logged $${totalSpent.toFixed(2)} ${cadence} across ${relevantEvents.length} record${relevantEvents.length === 1 ? "" : "s"}.`,
    body: topCategory
      ? `${topCategory} led your spending at $${topCategoryAmount.toFixed(2)} ${cadence}. ${nextPrompt}`
      : nextPrompt,
    total_spent: totalSpent,
    event_count: relevantEvents.length,
    top_category: topCategory,
    generated_at: new Date().toISOString(),
  } satisfies SummaryResult;
}

function buildSummaries(
  spendingEvents: FinanceSpendingEvent[],
  budgetStatuses: BudgetStatus[],
  goalStatuses: GoalStatus[],
) {
  return [
    summarizeWindow("daily", spendingEvents, budgetStatuses, goalStatuses),
    summarizeWindow("weekly", spendingEvents, budgetStatuses, goalStatuses),
  ];
}

function buildPatternSummaries(spendingEvents: FinanceSpendingEvent[]) {
  const now = new Date();
  const { currentMonthEvents, previousMonthEvents } = getMonthMetrics(spendingEvents, now);
  const recentWeekStart = new Date(now);
  recentWeekStart.setDate(recentWeekStart.getDate() - 6);
  const previousWeekStart = new Date(now);
  previousWeekStart.setDate(previousWeekStart.getDate() - 13);
  const previousWeekEnd = new Date(now);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);

  const weeklyTotals: Record<string, { current: number; previous: number }> = {};
  const monthlyTotals: Record<string, { current: number; previous: number }> = {};

  for (const event of currentMonthEvents) {
    for (const item of event.items ?? []) {
      const category = normalizeCategory(item.category);
      monthlyTotals[category] = monthlyTotals[category] ?? { current: 0, previous: 0 };
      monthlyTotals[category].current += parseNumber(item.amount);
    }
  }

  for (const event of previousMonthEvents) {
    for (const item of event.items ?? []) {
      const category = normalizeCategory(item.category);
      monthlyTotals[category] = monthlyTotals[category] ?? { current: 0, previous: 0 };
      monthlyTotals[category].previous += parseNumber(item.amount);
    }
  }

  for (const event of spendingEvents) {
    const eventDate = new Date(event.date);
    for (const item of event.items ?? []) {
      const category = normalizeCategory(item.category);
      weeklyTotals[category] = weeklyTotals[category] ?? { current: 0, previous: 0 };

      if (eventDate >= recentWeekStart) {
        weeklyTotals[category].current += parseNumber(item.amount);
      } else if (eventDate >= previousWeekStart && eventDate <= previousWeekEnd) {
        weeklyTotals[category].previous += parseNumber(item.amount);
      }
    }
  }

  const buildSummary = (
    idPrefix: string,
    period: PatternSummary["period"],
    category: string,
    currentAmount: number,
    previousAmount: number,
  ): PatternSummary => {
    const delta = currentAmount - previousAmount;
    const direction: PatternSummary["direction"] =
      Math.abs(delta) < 5 ? "steady" : delta > 0 ? "up" : "down";
    const confidence: PatternSummary["confidence"] =
      currentAmount >= 120 ? "high" : currentAmount >= 50 ? "medium" : "low";
    const movementText =
      direction === "steady"
        ? "is holding close to the prior period"
        : direction === "up"
          ? `is up by $${Math.abs(delta).toFixed(2)} versus the prior period`
          : `is down by $${Math.abs(delta).toFixed(2)} versus the prior period`;

    return {
      id: `${idPrefix}-${category.toLowerCase().replace(/\s+/g, "-")}`,
      title:
        period === "weekly"
          ? `${category} is shaping this week's pattern`
          : `${category} is shaping this month's pattern`,
      body: `${category} ${movementText}, with $${currentAmount.toFixed(2)} tracked in the current ${period}.`,
      category,
      period,
      amount: currentAmount,
      direction,
      confidence,
    };
  };

  const weeklySummaries = Object.entries(weeklyTotals)
    .filter(([, totals]) => totals.current > 0)
    .sort((left, right) => right[1].current - left[1].current)
    .slice(0, 2)
    .map(([category, totals]) =>
      buildSummary("weekly-pattern", "weekly", category, totals.current, totals.previous),
    );

  const monthlySummaries = Object.entries(monthlyTotals)
    .filter(([, totals]) => totals.current > 0)
    .sort((left, right) => right[1].current - left[1].current)
    .slice(0, 2)
    .map(([category, totals]) =>
      buildSummary("monthly-pattern", "monthly", category, totals.current, totals.previous),
    );

  return [...weeklySummaries, ...monthlySummaries];
}

function buildForecastResult(
  dashboardSummary: DashboardSummary,
  spendingEvents: FinanceSpendingEvent[],
) {
  const now = new Date();
  const { currentMonthSpent, elapsedDays, daysInMonth } = getMonthMetrics(spendingEvents, now);
  const projectedEndOfMonthSpend =
    elapsedDays > 0 ? (currentMonthSpent / elapsedDays) * daysInMonth : currentMonthSpent;
  const projectedFreeCash =
    dashboardSummary.monthly_income -
    dashboardSummary.monthly_fixed_expenses -
    dashboardSummary.monthly_subscription_total -
    projectedEndOfMonthSpend;
  const projectedEndOfMonthCash = dashboardSummary.cash_balance + projectedFreeCash;
  const spendingRunRate = elapsedDays > 0 ? currentMonthSpent / elapsedDays : 0;

  let status: ForecastResult["status"] = "needs_more_data";
  if (spendingEvents.length >= 2) {
    if (projectedFreeCash >= 200) status = "on_track";
    else if (projectedFreeCash >= 0) status = "watch";
    else status = "overextended";
  }

  const summary =
    status === "needs_more_data"
      ? "Keep logging real expenses so eva can tighten the month-end forecast."
      : status === "on_track"
        ? `At the current run rate, you should finish the month with about $${projectedFreeCash.toFixed(2)} free after fixed costs, subscriptions, and variable spending.`
        : status === "watch"
          ? `At the current run rate, this month stays tight with about $${projectedFreeCash.toFixed(2)} left after planned costs.`
          : `At the current run rate, variable spending would push you about $${Math.abs(projectedFreeCash).toFixed(2)} past break-even by month end.`;

  return {
    period_end: toIsoDate(getMonthEnd(now)),
    days_remaining: Math.max(daysInMonth - elapsedDays, 0),
    month_to_date_spending: currentMonthSpent,
    projected_end_of_month_spend: Number(projectedEndOfMonthSpend.toFixed(2)),
    projected_end_of_month_cash: Number(projectedEndOfMonthCash.toFixed(2)),
    projected_free_cash: Number(projectedFreeCash.toFixed(2)),
    spending_run_rate: Number(spendingRunRate.toFixed(2)),
    status,
    summary,
  } satisfies ForecastResult;
}

function buildSubscriptionReview(
  subscriptions: FinanceSubscription[],
  dashboardSummary: DashboardSummary,
) {
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.is_active);
  const recommendations = activeSubscriptions
    .map((subscription) => {
      const monthlyImpact =
        subscription.billing_cycle === "yearly"
          ? parseNumber(subscription.price) / 12
          : parseNumber(subscription.price);
      const discretionaryCategory = /entertainment|music|video|gaming|shopping/i.test(
        subscription.category,
      );
      const action: "keep" | "review" | "cancel" =
        dashboardSummary.monthly_cashflow < 0 && discretionaryCategory && monthlyImpact >= 20
          ? "cancel"
          : monthlyImpact >= 25 || activeSubscriptions.length >= 5
            ? "review"
            : "keep";
      const reason =
        action === "cancel"
          ? "Your monthly cash flow is already under pressure, so this recurring cost is the cleanest place to cut first."
          : action === "review"
            ? "This subscription is large enough to deserve a deliberate keep-or-cut decision."
            : "This subscription currently fits the rest of your monthly plan.";

      return {
        id: subscription.id,
        name: subscription.name,
        action,
        reason,
        monthly_impact: Number(monthlyImpact.toFixed(2)),
      };
    })
    .sort((left, right) => {
      const order = { cancel: 0, review: 1, keep: 2 };
      return order[left.action] - order[right.action] || right.monthly_impact - left.monthly_impact;
    })
    .slice(0, 4);

  const flaggedCount = recommendations.filter((item) => item.action !== "keep").length;
  const status: SubscriptionReview["status"] =
    flaggedCount === 0 ? "clear" : flaggedCount >= 2 ? "trim" : "review";
  const summary =
    activeSubscriptions.length === 0
      ? "No active subscriptions are being tracked yet."
      : status === "clear"
        ? `Your ${activeSubscriptions.length} tracked subscription${activeSubscriptions.length === 1 ? "" : "s"} fit the rest of your monthly cash picture for now.`
        : status === "trim"
          ? `Recurring costs are putting noticeable pressure on monthly cash flow. Review the highlighted subscriptions first.`
          : `A few recurring costs are large enough to deserve a deliberate review before they become invisible habits.`;

  return {
    status,
    active_count: activeSubscriptions.length,
    monthly_total: Number(dashboardSummary.monthly_subscription_total.toFixed(2)),
    flagged_count: flaggedCount,
    summary,
    recommendations,
  } satisfies SubscriptionReview;
}

export function buildAffordabilityResult(input: {
  amount: number;
  category?: string | null;
  cadence?: "one_time" | "monthly";
  dashboardSummary: DashboardSummary;
  forecast: ForecastResult | null;
  budgetStatuses: BudgetStatus[];
  spendingEvents: FinanceSpendingEvent[];
}) {
  const amount = Math.max(parseNumber(input.amount), 0);
  const cadence = input.cadence === "monthly" ? "monthly" : "one_time";
  const forecast =
    input.forecast ?? buildForecastResult(input.dashboardSummary, input.spendingEvents);
  const category = input.category ? normalizeCategory(input.category) : null;
  const budgetStatus = category
    ? input.budgetStatuses.find((status) => status.category === category)
    : null;
  const monthlyBurden = cadence === "monthly" ? amount : 0;
  const oneTimeBurden = cadence === "one_time" ? amount : 0;
  const projectedFreeCash =
    forecast.projected_free_cash - monthlyBurden - (cadence === "one_time" ? amount : 0);
  const suggestedLimit = Math.max(
    0,
    Number(
      (
        category && budgetStatus
          ? Math.min(budgetStatus.remaining_amount, Math.max(forecast.projected_free_cash, 0))
          : Math.max(forecast.projected_free_cash * 0.35, 0)
      ).toFixed(2),
    ),
  );

  let status: AffordabilityResult["status"] = "needs_more_data";
  if (input.spendingEvents.length >= 2) {
    if (projectedFreeCash >= 150 && (!budgetStatus || budgetStatus.status === "healthy")) {
      status = "comfortable";
    } else if (projectedFreeCash >= 0) {
      status = "tight";
    } else {
      status = "not_now";
    }
  }

  const summary =
    status === "needs_more_data"
      ? "eva needs a little more real spending history before it can answer confidently. Log a few more expenses first."
      : status === "comfortable"
        ? `Yes, this looks manageable right now. After accounting for your current forecast, you would still have about $${projectedFreeCash.toFixed(2)} of room left.`
        : status === "tight"
          ? `You can probably afford this, but it would leave only about $${projectedFreeCash.toFixed(2)} of cushion based on the current forecast.`
          : `Not comfortably right now. Based on the current forecast, this would push you about $${Math.abs(projectedFreeCash).toFixed(2)} past your safe monthly buffer.`;

  return {
    amount,
    category,
    cadence,
    projected_free_cash: Number(projectedFreeCash.toFixed(2)),
    health_score: input.dashboardSummary.health_score,
    status,
    suggested_limit: suggestedLimit,
    summary,
  } satisfies AffordabilityResult;
}

function buildAdvice(
  dashboardSummary: DashboardSummary,
  spendingEvents: FinanceSpendingEvent[],
  budgetStatuses: BudgetStatus[],
  goalStatuses: GoalStatus[],
  subscriptions: FinanceSubscription[],
) {
  const advice: AdviceResult[] = [];
  const latestEvent = spendingEvents[0];

  if (latestEvent) {
    const itemCount = Array.isArray(latestEvent.items) ? latestEvent.items.length : 0;
    advice.push({
      id: "latest-spending",
      type: "spending_acknowledgement",
      tone: "info",
      title: "Your latest spending is already in the workspace",
      body: `eva logged ${itemCount} item${itemCount === 1 ? "" : "s"} worth $${parseNumber(latestEvent.total).toFixed(2)} on ${latestEvent.date}. That same record now powers your dashboard, summaries, and history.`,
      cta_label: "Review spending history",
      cta_href: "/spending-history",
    });
  } else {
    advice.push({
      id: "log-first-expense",
      type: "grounded_advice",
      tone: "info",
      title: "Start the loop by logging a real expense",
      body: "The fastest way to unlock grounded advice is to log one real purchase today. Once you do, eva will reflect it across history, summaries, and your dashboard.",
      cta_label: "Log an expense",
      cta_href: "/chat",
    });
  }

  const budgetAlert = budgetStatuses.find(
    (status) => status.status === "over" || status.status === "watch",
  );
  if (budgetAlert) {
    advice.push({
      id: "budget-alert",
      type: "budget_warning",
      tone: "warning",
      title:
        budgetAlert.status === "over"
          ? `${budgetAlert.category} is already over budget`
          : `${budgetAlert.category} is nearing its limit`,
      body:
        budgetAlert.status === "over"
          ? `You have spent $${budgetAlert.spent_this_month.toFixed(2)} against a $${budgetAlert.monthly_limit.toFixed(2)} limit this month. Tightening this category now will protect the rest of the month.`
          : `You have used ${budgetAlert.percent_used}% of your ${budgetAlert.category} budget this month. One or two more discretionary purchases could push it over.`,
      cta_label: "Review budgets",
      cta_href: "/budget",
    });
  } else if (dashboardSummary.monthly_cashflow < 0) {
    advice.push({
      id: "cashflow-reset",
      type: "grounded_advice",
      tone: "warning",
      title: "Your monthly plan needs breathing room",
      body: `Based on your current profile and recurring costs, you are about $${Math.abs(dashboardSummary.monthly_cashflow).toFixed(2)} below break-even each month. Use budgets and subscriptions to create a buffer before adding new goals.`,
      cta_label: "Review subscriptions",
      cta_href: "/subscriptions",
    });
  } else {
    advice.push({
      id: "cashflow-room",
      type: "grounded_advice",
      tone: "success",
      title: "You still have room to direct intentionally",
      body: `Your current monthly plan leaves about $${dashboardSummary.monthly_cashflow.toFixed(2)} after fixed costs and subscriptions. Direct that margin toward a goal before it disappears into reactive spending.`,
      cta_label: "Open goals",
      cta_href: "/goals",
    });
  }

  const goalStatus = goalStatuses.find((goal) => goal.status !== "achieved");
  if (goalStatus) {
    advice.push({
      id: "goal-progress",
      type: "goal_progress_nudge",
      tone: goalStatus.status === "on_track" ? "success" : "warning",
      title:
        goalStatus.status === "on_track"
          ? `${goalStatus.name} is still within reach`
          : `${goalStatus.name} needs a stronger monthly contribution`,
      body:
        goalStatus.status === "on_track"
          ? `You are ${goalStatus.progress_percent}% of the way there. Keeping about $${goalStatus.monthly_contribution_needed.toFixed(2)} per month pointed at this goal should keep the deadline realistic.`
          : `At the current pace, this goal needs about $${goalStatus.monthly_contribution_needed.toFixed(2)} per month. Either increase the contribution or extend the timeline so the plan stays honest.`,
      cta_label: "Review goals",
      cta_href: "/goals",
    });
  }

  if (subscriptions.length > 0 && advice.length < 4) {
    const activeSubscriptions = subscriptions.filter((subscription) => subscription.is_active);
    advice.push({
      id: "subscription-visibility",
      type: "grounded_advice",
      tone: "info",
      title: "Recurring costs are now part of the picture",
      body: `eva is tracking ${activeSubscriptions.length} active subscription${activeSubscriptions.length === 1 ? "" : "s"}, so your monthly cash flow is grounded in more than one-off spending alone.`,
      cta_label: "Open subscriptions",
      cta_href: "/subscriptions",
    });
  }

  return advice.slice(0, 4);
}

function mapLegacyProfileToFinanceProfile(
  userId: string,
  profile: Partial<LegacyPublicProfile> | Record<string, unknown>,
  legacyPublicUserId: string | null,
  existingProfile?: Partial<FinanceProfile> | null,
) {
  return {
    user_id: userId,
    legacy_public_user_id:
      legacyPublicUserId ?? existingProfile?.legacy_public_user_id ?? null,
    first_name: String(profile.first_name ?? existingProfile?.first_name ?? ""),
    last_name: String(profile.last_name ?? existingProfile?.last_name ?? ""),
    country: String(profile.country ?? existingProfile?.country ?? ""),
    phone_number: String(profile.phone_number ?? existingProfile?.phone_number ?? ""),
    user_type:
      profile.user_type === "business" || existingProfile?.user_type === "business"
        ? "business"
        : "personal",
    updates_opt_in: parseBoolean(
      profile.updates_opt_in ?? existingProfile?.updates_opt_in ?? true,
    ),
    model_training_opt_in: parseBoolean(
      profile.model_training_opt_in ?? existingProfile?.model_training_opt_in ?? false,
    ),
    password_setup_completed: parseBoolean(
      profile.password_setup_completed ?? existingProfile?.password_setup_completed ?? false,
    ),
    cash_balance: parseNumber(profile.cash_balance ?? existingProfile?.cash_balance),
    monthly_income: parseNumber(profile.monthly_income ?? existingProfile?.monthly_income),
    monthly_fixed_expenses: parseNumber(
      profile.monthly_fixed_expenses ?? existingProfile?.monthly_fixed_expenses,
    ),
    budgeting_focus: String(profile.budgeting_focus ?? existingProfile?.budgeting_focus ?? ""),
    intent_focus: String(profile.intent_focus ?? existingProfile?.intent_focus ?? ""),
    biggest_problem: String(profile.biggest_problem ?? existingProfile?.biggest_problem ?? ""),
    money_style: String(profile.money_style ?? existingProfile?.money_style ?? ""),
    guidance_style: String(profile.guidance_style ?? existingProfile?.guidance_style ?? "balanced"),
    goal_focus: String(profile.goal_focus ?? existingProfile?.goal_focus ?? ""),
    subscription_awareness: String(
      profile.subscription_awareness ?? existingProfile?.subscription_awareness ?? "",
    ),
    target_monthly_savings: parseNumber(
      profile.target_monthly_savings ?? existingProfile?.target_monthly_savings,
    ),
  };
}

export function normalizeProfile(
  userId: string,
  profile: Record<string, unknown>,
  legacyPublicUserId: string | null,
  existingProfile?: Partial<FinanceProfile> | null,
) {
  return mapLegacyProfileToFinanceProfile(userId, profile, legacyPublicUserId, existingProfile);
}

export async function buildBootstrap(userId: string, email: string | null = null) {
  const admin = createAdminClient();
  const [
    profileResult,
    goalsResult,
    budgetResult,
    eventsResult,
    financialEntriesResult,
    subscriptionResult,
    importJobsResult,
    draftTransactionsResult,
    notificationsResult,
  ] = await Promise.all([
    admin.from("finance_profiles").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("finance_goals").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    admin.from("finance_budget_limits").select("*").eq("user_id", userId).order("category", { ascending: true }),
    admin.from("finance_spending_events").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(120),
    admin.from("finance_financial_entries").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    admin.from("finance_subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("finance_import_jobs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    admin.from("finance_draft_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(80),
    admin.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (goalsResult.error) throw goalsResult.error;
  if (budgetResult.error) throw budgetResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (financialEntriesResult.error) throw financialEntriesResult.error;
  if (subscriptionResult.error) throw subscriptionResult.error;
  if (importJobsResult.error) throw importJobsResult.error;
  if (draftTransactionsResult.error) throw draftTransactionsResult.error;
  if (notificationsResult.error) throw notificationsResult.error;

  const profile = (profileResult.data as FinanceProfile | null) ?? null;
  const goals = (goalsResult.data as FinanceGoal[]) ?? [];
  const budgetLimits = (budgetResult.data as FinanceBudgetLimit[]) ?? [];
  const spendingEvents = (eventsResult.data as FinanceSpendingEvent[]) ?? [];
  const financialEntries = (financialEntriesResult.data as FinanceFinancialEntry[]) ?? [];
  const subscriptions = (subscriptionResult.data as FinanceSubscription[]) ?? [];
  const importJobs = (importJobsResult.data as FinanceImportJob[]) ?? [];
  const draftTransactions =
    (draftTransactionsResult.data as FinanceDraftTransaction[]) ?? [];
  const notifications = (notificationsResult.data as NotificationItem[]) ?? [];

  const dashboardSummary = buildDashboardSummary(
    profile,
    spendingEvents,
    financialEntries,
    subscriptions,
  );
  const budgetStatuses = buildBudgetStatuses(budgetLimits, spendingEvents);
  const goalStatuses = buildGoalStatuses(goals, dashboardSummary);
  const summaries = buildSummaries(spendingEvents, budgetStatuses, goalStatuses);
  const patternSummaries = buildPatternSummaries(spendingEvents);
  const forecast = buildForecastResult(dashboardSummary, spendingEvents);
  const subscriptionReview = buildSubscriptionReview(subscriptions, dashboardSummary);
  const advice = buildAdvice(
    dashboardSummary,
    spendingEvents,
    budgetStatuses,
    goalStatuses,
    subscriptions,
  );

  return {
    user_id: userId,
    email,
    has_onboarded: Boolean(profile?.onboarding_completed),
    migration: {
      legacy_public_user_id: profile?.legacy_public_user_id ?? null,
      migrated_from_public: Boolean(profile?.legacy_public_user_id),
    },
    profile,
    goals,
    budget_limits: budgetLimits,
    spending_events: spendingEvents,
    spending_logs: spendingEvents,
    financial_entries: financialEntries,
    subscriptions,
    dashboard_summary: dashboardSummary,
    advice,
    summaries,
    pattern_summaries: patternSummaries,
    forecast,
    subscription_review: subscriptionReview,
    budget_statuses: budgetStatuses,
    goal_statuses: goalStatuses,
    import_jobs: importJobs,
    draft_transactions: draftTransactions,
    notifications,
    empty_flags: {
      has_spending_history: spendingEvents.length > 0,
      has_goals: goals.length > 0,
      has_budget_limits: budgetLimits.length > 0,
      has_subscriptions: subscriptions.length > 0,
      has_balance_sheet: financialEntries.length > 0 || dashboardSummary.cash_balance > 0,
    },
  };
}

export async function replaceOnboardingData(
  userId: string,
  payload: Record<string, unknown>,
  legacyPublicUserId: string | null,
) {
  const admin = createAdminClient();
  const { data: existingProfile, error: existingProfileError } = await admin
    .from("finance_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProfileError) throw existingProfileError;

  const normalizedProfile = normalizeProfile(
    userId,
    (payload.profile as Record<string, unknown>) ?? {},
    legacyPublicUserId,
    existingProfile as FinanceProfile | null,
  );

  const { error: profileError } = await admin.from("finance_profiles").upsert({
    ...normalizedProfile,
    onboarding_completed: true,
    onboarding_completed_at:
      existingProfile?.onboarding_completed_at ?? new Date().toISOString(),
  });

  if (profileError) throw profileError;

  await Promise.all([
    admin.from("finance_goals").delete().eq("user_id", userId),
    admin.from("finance_budget_limits").delete().eq("user_id", userId),
    admin.from("finance_financial_entries").delete().eq("user_id", userId),
    admin.from("finance_subscriptions").delete().eq("user_id", userId),
  ]);

  const goals = Array.isArray(payload.goals) ? payload.goals : [];
  const budgetLimits = Array.isArray(payload.budget_limits) ? payload.budget_limits : [];
  const financialEntries = Array.isArray(payload.financial_entries) ? payload.financial_entries : [];
  const subscriptions = Array.isArray(payload.subscriptions) ? payload.subscriptions : [];

  if (goals.length > 0) {
    const { error } = await admin.from("finance_goals").insert(
      goals.map((goal) => ({
        user_id: userId,
        name: String((goal as Record<string, unknown>).name ?? ""),
        target_amount: parseNumber((goal as Record<string, unknown>).target_amount),
        current_amount: parseNumber((goal as Record<string, unknown>).current_amount),
        deadline: String((goal as Record<string, unknown>).deadline ?? ""),
        icon: String((goal as Record<string, unknown>).icon ?? "🎯"),
      })),
    );
    if (error) throw error;
  }

  if (budgetLimits.length > 0) {
    const { error } = await admin.from("finance_budget_limits").insert(
      budgetLimits.map((limit) => ({
        user_id: userId,
        category: String((limit as Record<string, unknown>).category ?? ""),
        monthly_limit: parseNumber((limit as Record<string, unknown>).monthly_limit),
      })),
    );
    if (error) throw error;
  }

  if (financialEntries.length > 0) {
    const { error } = await admin.from("finance_financial_entries").insert(
      financialEntries.map((entry) => ({
        user_id: userId,
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
    const { error } = await admin.from("finance_subscriptions").insert(
      subscriptions.map((subscription) => ({
        user_id: userId,
        name: String((subscription as Record<string, unknown>).name ?? ""),
        price: parseNumber((subscription as Record<string, unknown>).price),
        billing_cycle:
          (subscription as Record<string, unknown>).billing_cycle === "yearly"
            ? "yearly"
            : "monthly",
        category: String((subscription as Record<string, unknown>).category ?? "Other"),
        is_active: parseBoolean((subscription as Record<string, unknown>).is_active ?? true),
      })),
    );
    if (error) throw error;
  }
}

function normalizeDraftTransactionInput(input: {
  userId: string;
  source: DraftImportSource;
  transactionDate: string;
  merchant: string;
  category?: string;
  amount: number;
  currency?: string;
  description?: string;
  rawPayload?: Record<string, unknown>;
}) {
  const merchant = parseString(input.merchant, "Unknown merchant");
  const description = parseString(input.description, merchant);
  const transactionDate = parseDateInput(input.transactionDate, toIsoDate(new Date()));
  const amount = Math.abs(parseNumber(input.amount));
  const providedCategory = parseString(input.category);
  const category = providedCategory
    ? normalizeCategory(providedCategory)
    : inferCategoryFromMerchant(merchant, description);

  return {
    user_id: input.userId,
    source: input.source,
    transaction_date: transactionDate,
    merchant,
    category,
    amount,
    currency: parseString(input.currency, "USD") || "USD",
    description,
    dedupe_key: buildDraftDedupeKey({
      userId: input.userId,
      source: input.source,
      transactionDate,
      merchant,
      amount,
      description,
    }),
    raw_payload: input.rawPayload ?? {},
  };
}

async function finalizeImportJobStatus(
  admin: ReturnType<typeof createAdminClient>,
  importJobId: string,
  userId: string,
) {
  const { count, error: pendingError } = await admin
    .from("finance_draft_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("import_job_id", importJobId)
    .eq("status", "pending");

  if (pendingError) throw pendingError;

  const hasPending = (count ?? 0) > 0;
  const { error: updateError } = await admin
    .from("finance_import_jobs")
    .update({ status: hasPending ? "pending_review" : "processed" })
    .eq("id", importJobId)
    .eq("user_id", userId);

  if (updateError) throw updateError;
}

async function createDraftTransactions(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    userId: string;
    source: DraftImportSource;
    fileName?: string | null;
    sourceRef?: string | null;
    drafts: Array<{
      transactionDate: string;
      merchant: string;
      category?: string;
      amount: number;
      currency?: string;
      description?: string;
      rawPayload?: Record<string, unknown>;
    }>;
  },
) {
  const { data: importJob, error: importJobError } = await admin
    .from("finance_import_jobs")
    .insert({
      user_id: params.userId,
      source: params.source,
      status: "pending_review",
      file_name: params.fileName ?? null,
      source_ref: params.sourceRef ?? null,
    })
    .select("*")
    .single();

  if (importJobError) throw importJobError;

  let duplicateCount = 0;
  let importedCount = 0;

  for (const draft of params.drafts) {
    const normalized = normalizeDraftTransactionInput({
      userId: params.userId,
      source: params.source,
      transactionDate: draft.transactionDate,
      merchant: draft.merchant,
      category: draft.category,
      amount: draft.amount,
      currency: draft.currency,
      description: draft.description,
      rawPayload: draft.rawPayload,
    });

    const { error } = await admin.from("finance_draft_transactions").insert({
      ...normalized,
      import_job_id: importJob.id,
    });

    if (error) {
      const duplicateDetected =
        "code" in error && typeof error.code === "string" && error.code === "23505";
      if (duplicateDetected) {
        duplicateCount += 1;
        continue;
      }

      await admin
        .from("finance_import_jobs")
        .update({
          status: "failed",
          error_message: error.message,
          imported_count: importedCount,
          duplicate_count: duplicateCount,
        })
        .eq("id", importJob.id);
      throw error;
    }

    importedCount += 1;
  }

  const finalStatus = importedCount > 0 ? "pending_review" : "processed";
  const { error: finalizeError } = await admin
    .from("finance_import_jobs")
    .update({
      status: finalStatus,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      error_message:
        importedCount === 0 && duplicateCount > 0
          ? "Every imported row matched an existing draft or approved transaction."
          : null,
    })
    .eq("id", importJob.id);

  if (finalizeError) throw finalizeError;

  return {
    importJobId: importJob.id,
    importedCount,
    duplicateCount,
  };
}

type ReceiptImageAnalysis = {
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

export async function analyzeReceiptImage(
  userId: string,
  imageDataUrl: string,
  fileName: string | null = null,
) {
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error("Please upload a valid receipt photo.");
  }

  const response = await requestGatewayCompletion({
    model: EVA_MODELS.conversation,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract structured spending data from receipt, supermarket slip, or till-check images. Return only valid JSON with this shape: " +
          '{"merchant":"string","transaction_date":"YYYY-MM-DD","currency":"USD","total":0,"summary":"string","items":[{"description":"string","amount":0,"category":"Food"}]}. ' +
          "Allowed categories: Food, Transport, Entertainment, Shopping, Bills, Health, Education, Subscriptions, Groceries, Personal Care, Other. " +
          "If line items are readable, return multiple items. If only the total is readable, return one item using the best description you can ground from the image. " +
          "Do not invent hidden items. Use Other when the category is unclear.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Analyze this receipt photo and extract grounded spending data. ` +
              `File name: ${fileName ?? "receipt-photo"}.`,
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
            },
          },
        ],
      },
    ],
  });

  if (!response?.ok) {
    if (response) {
      console.error("receipt analysis gateway error:", response.status, await response.text());
    }
    throw new Error("We could not analyze that receipt photo right now.");
  }

  const responseData = await response.json().catch(() => null);
  const parsed = parseGatewayJson<ReceiptImageAnalysis>(
    responseData?.choices?.[0]?.message?.content,
  );

  if (!parsed) {
    throw new Error("We could not read the receipt clearly enough. Try a sharper photo.");
  }

  const merchant = parseString(
    parsed.merchant,
    fileName?.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "Receipt photo",
  );
  const summary = parseString(parsed.summary, merchant);
  const transactionDate = parseDateInput(parsed.transaction_date ?? new Date(), toIsoDate(new Date()));
  const currency = parseString(parsed.currency, "USD") || "USD";
  const total = Math.abs(parseNumber(parsed.total));
  const analyzedItems = Array.isArray(parsed.items)
    ? parsed.items
        .map((item) => ({
          description: parseString(item?.description, summary),
          amount: Math.abs(parseNumber(item?.amount)),
          category: (() => {
            const providedCategory = parseString(item?.category);
            if (providedCategory) {
              return normalizeCategory(providedCategory);
            }

            return inferCategoryFromMerchant(merchant, parseString(item?.description, summary));
          })(),
        }))
        .filter((item) => item.amount > 0)
    : [];

  const drafts =
    analyzedItems.length > 0
      ? analyzedItems.map((item) => ({
          transactionDate,
          merchant,
          category: item.category,
          amount: item.amount,
          currency,
          description: item.description,
          rawPayload: {
            file_name: fileName,
            analysis: parsed,
          },
        }))
      : total > 0
        ? [
            {
              transactionDate,
              merchant,
              category: inferCategoryFromMerchant(merchant, summary),
              amount: total,
              currency,
              description: summary,
              rawPayload: {
                file_name: fileName,
                analysis: parsed,
              },
            },
          ]
        : [];

  if (drafts.length === 0) {
    throw new Error("We could not find any amounts in that photo. Try a clearer receipt image.");
  }

  const admin = createAdminClient();
  return createDraftTransactions(admin, {
    userId,
    source: "receipt_image",
    fileName,
    sourceRef: fileName,
    drafts,
  });
}

export async function importCsvTransactions(
  userId: string,
  csvText: string,
  fileName: string | null = null,
) {
  const admin = createAdminClient();
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new Error("The CSV file does not contain enough rows to import.");
  }

  const headers = rows[0].map((header) => header.toLowerCase().trim());
  const dataRows = rows.slice(1);
  const dateIndex = headers.findIndex((header) => /date/.test(header));
  const merchantIndex = headers.findIndex((header) => /merchant|vendor|payee|store|name/.test(header));
  const amountIndex = headers.findIndex((header) => /amount|total|debit|value/.test(header));
  const categoryIndex = headers.findIndex((header) => /category/.test(header));
  const descriptionIndex = headers.findIndex((header) => /description|memo|note/.test(header));

  if (dateIndex < 0 || merchantIndex < 0 || amountIndex < 0) {
    throw new Error("CSV must include date, merchant, and amount columns.");
  }

  const drafts = dataRows
    .map((cells) => ({
      transactionDate: parseDateInput(cells[dateIndex], toIsoDate(new Date())),
      merchant: parseString(cells[merchantIndex], "Imported transaction"),
      category: categoryIndex >= 0 ? normalizeCategory(cells[categoryIndex]) : undefined,
      amount: Math.abs(parseNumber(cells[amountIndex])),
      description:
        descriptionIndex >= 0
          ? parseString(cells[descriptionIndex], parseString(cells[merchantIndex]))
          : parseString(cells[merchantIndex]),
      rawPayload: {
        row: cells,
        headers,
      },
    }))
    .filter((draft) => draft.amount > 0 && draft.merchant);

  if (drafts.length === 0) {
    throw new Error("No valid transactions were found in that CSV file.");
  }

  return createDraftTransactions(admin, {
    userId,
    source: "csv",
    fileName,
    drafts,
  });
}

export async function ingestForwardedReceipt(input: {
  userId: string;
  sourceRef?: string | null;
  subject?: string;
  text?: string;
  amount?: unknown;
  merchant?: unknown;
  transactionDate?: unknown;
  category?: unknown;
}) {
  const admin = createAdminClient();
  const subject = parseString(input.subject);
  const text = parseString(input.text);
  const merchant =
    parseString(input.merchant) ||
    subject.replace(/^fwd:\s*/i, "").split(/[-|:]/)[0]?.trim() ||
    "Forwarded receipt";
  const amount =
    parseNumber(input.amount) ||
    parseNumber(text.match(/(?:total|amount|paid)[^0-9]{0,12}(\d+(?:\.\d{1,2})?)/i)?.[1]);
  const transactionDate = parseDateInput(
    input.transactionDate ?? text.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1] ?? new Date(),
    toIsoDate(new Date()),
  );

  if (!amount || !merchant) {
    throw new Error("The forwarded receipt did not include enough information to create a draft transaction.");
  }

  return createDraftTransactions(admin, {
    userId: input.userId,
    source: "forwarded_email",
    sourceRef: input.sourceRef ?? null,
    drafts: [
      {
        transactionDate,
        merchant,
        category: normalizeCategory(input.category) || inferCategoryFromMerchant(merchant, text),
        amount,
        description: subject || text.slice(0, 120) || merchant,
        rawPayload: {
          subject,
          text,
          source_ref: input.sourceRef ?? null,
        },
      },
    ],
  });
}

export async function reviewDraftTransaction(
  userId: string,
  input: {
    draftId: string;
    decision: "approve" | "reject" | "edit";
    updates?: Record<string, unknown>;
  },
) {
  const admin = createAdminClient();
  const { data: draft, error: draftError } = await admin
    .from("finance_draft_transactions")
    .select("*")
    .eq("id", input.draftId)
    .eq("user_id", userId)
    .maybeSingle();

  if (draftError) throw draftError;
  if (!draft) {
    throw new Error("We could not find that draft transaction.");
  }

  const updates = input.updates ?? {};
  const normalized = normalizeDraftTransactionInput({
    userId,
    source: draft.source,
    transactionDate: updates.transaction_date ?? draft.transaction_date,
    merchant: updates.merchant ?? draft.merchant,
    category: updates.category ?? draft.category,
    amount: updates.amount ?? draft.amount,
    currency: updates.currency ?? draft.currency,
    description: updates.description ?? draft.description,
    rawPayload:
      (typeof updates.raw_payload === "object" && updates.raw_payload !== null
        ? (updates.raw_payload as Record<string, unknown>)
        : draft.raw_payload) ?? {},
  });

  const now = new Date().toISOString();
  const finalDecision = input.decision === "edit" ? "approve" : input.decision;

  if (finalDecision === "approve") {
    const { error: insertError } = await admin.from("finance_spending_events").insert({
      user_id: userId,
      date: normalized.transaction_date,
      items: [
        {
          category: normalized.category,
          amount: normalized.amount,
          description: normalized.description,
        },
      ],
      raw_input: normalized.description,
      total: normalized.amount,
      source:
        draft.source === "csv"
          ? "csv_import"
          : draft.source === "receipt_image"
            ? "receipt_image"
            : "forwarded_email",
    });

    if (insertError) throw insertError;
  }

  const { error: updateError } = await admin
    .from("finance_draft_transactions")
    .update({
      ...normalized,
      status: finalDecision === "approve" ? "approved" : "rejected",
      reviewed_at: now,
    })
    .eq("id", draft.id)
    .eq("user_id", userId);

  if (updateError) throw updateError;

  if (draft.import_job_id) {
    await finalizeImportJobStatus(admin, draft.import_job_id, userId);
  }
}

export async function generateScheduledSummaries() {
  const admin = createAdminClient();
  const { data: profiles, error: profilesError } = await admin
    .from("finance_profiles")
    .select("user_id, updates_opt_in, onboarding_completed")
    .eq("onboarding_completed", true);

  if (profilesError) throw profilesError;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  let dailyCreated = 0;
  let weeklyCreated = 0;

  for (const profile of profiles ?? []) {
    if (!profile.updates_opt_in) continue;

    const bootstrap = await buildBootstrap(profile.user_id);
    const [dailySummary, weeklySummary] = bootstrap.summaries ?? [];
    const candidateSummaries = [
      {
        type: "summary_daily",
        summary: dailySummary,
        since: todayStart.toISOString(),
      },
      {
        type: "summary_weekly",
        summary: weeklySummary,
        since: weekStart.toISOString(),
      },
    ];

    for (const candidate of candidateSummaries) {
      if (!candidate.summary || candidate.summary.status !== "ready") continue;

      const { count, error: countError } = await admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.user_id)
        .eq("type", candidate.type)
        .gte("created_at", candidate.since);

      if (countError) throw countError;
      if ((count ?? 0) > 0) continue;

      const { error: insertError } = await admin.from("notifications").insert({
        user_id: profile.user_id,
        type: candidate.type,
        title: candidate.summary.headline,
        body: candidate.summary.body,
      });

      if (insertError) throw insertError;

      if (candidate.type === "summary_daily") dailyCreated += 1;
      if (candidate.type === "summary_weekly") weeklyCreated += 1;
    }
  }

  return {
    ok: true,
    daily_created: dailyCreated,
    weekly_created: weeklyCreated,
  };
}

export async function migrateLegacyPublicData(
  userId: string,
  legacyPublicUserId: string | null,
) {
  if (!legacyPublicUserId) {
    return false;
  }

  const admin = createAdminClient();
  const { data: existingProfile, error: existingProfileError } = await admin
    .from("finance_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProfileError) throw existingProfileError;
  if (existingProfile) {
    return false;
  }

  const [
    profileResult,
    goalsResult,
    budgetResult,
    logsResult,
    financialEntriesResult,
    subscriptionResult,
  ] = await Promise.all([
    admin.from("public_user_profiles").select("*").eq("public_user_id", legacyPublicUserId).maybeSingle(),
    admin.from("public_user_goals").select("*").eq("public_user_id", legacyPublicUserId),
    admin.from("public_user_budget_limits").select("*").eq("public_user_id", legacyPublicUserId),
    admin.from("public_user_spending_logs").select("*").eq("public_user_id", legacyPublicUserId),
    admin.from("public_user_financial_entries").select("*").eq("public_user_id", legacyPublicUserId),
    admin.from("public_user_subscriptions").select("*").eq("public_user_id", legacyPublicUserId),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (goalsResult.error) throw goalsResult.error;
  if (budgetResult.error) throw budgetResult.error;
  if (logsResult.error) throw logsResult.error;
  if (financialEntriesResult.error) throw financialEntriesResult.error;
  if (subscriptionResult.error) throw subscriptionResult.error;

  const legacyProfile = (profileResult.data as LegacyPublicProfile | null) ?? null;
  const goals = goalsResult.data ?? [];
  const budgetLimits = budgetResult.data ?? [];
  const spendingLogs = logsResult.data ?? [];
  const financialEntries = financialEntriesResult.data ?? [];
  const subscriptions = subscriptionResult.data ?? [];

  const hasAnyData =
    Boolean(legacyProfile) ||
    goals.length > 0 ||
    budgetLimits.length > 0 ||
    spendingLogs.length > 0 ||
    financialEntries.length > 0 ||
    subscriptions.length > 0;

  if (!hasAnyData) {
    return false;
  }

  const profilePayload = mapLegacyProfileToFinanceProfile(
    userId,
    legacyProfile ?? {},
    legacyPublicUserId,
    null,
  );

  const { error: profileInsertError } = await admin.from("finance_profiles").upsert({
    ...profilePayload,
    onboarding_completed: legacyProfile?.onboarding_completed ?? false,
    onboarding_completed_at: legacyProfile?.onboarding_completed_at ?? null,
  });

  if (profileInsertError) throw profileInsertError;

  if (goals.length > 0) {
    const { error } = await admin.from("finance_goals").insert(
      goals.map((goal) => ({
        user_id: userId,
        name: String(goal.name ?? ""),
        target_amount: parseNumber(goal.target_amount),
        current_amount: parseNumber(goal.current_amount),
        deadline: String(goal.deadline ?? new Date().toISOString().split("T")[0]),
        icon: String(goal.icon ?? "🎯"),
        created_at: goal.created_at,
        updated_at: goal.updated_at,
      })),
    );
    if (error) throw error;
  }

  if (budgetLimits.length > 0) {
    const { error } = await admin.from("finance_budget_limits").insert(
      budgetLimits.map((limit) => ({
        user_id: userId,
        category: String(limit.category ?? ""),
        monthly_limit: parseNumber(limit.monthly_limit),
        created_at: limit.created_at,
        updated_at: limit.updated_at,
      })),
    );
    if (error) throw error;
  }

  if (spendingLogs.length > 0) {
    const { error } = await admin.from("finance_spending_events").insert(
      spendingLogs.map((log) => ({
        user_id: userId,
        date: String(log.date ?? new Date().toISOString().split("T")[0]),
        items: Array.isArray(log.items) ? log.items : [],
        raw_input: String(log.raw_input ?? ""),
        total: parseNumber(log.total),
        source: "legacy_public_migration",
        created_at: log.created_at,
      })),
    );
    if (error) throw error;
  }

  if (financialEntries.length > 0) {
    const { error } = await admin.from("finance_financial_entries").insert(
      financialEntries.map((entry) => ({
        user_id: userId,
        name: String(entry.name ?? ""),
        type: String(entry.type ?? "other"),
        entry_type: entry.entry_type === "liability" ? "liability" : "asset",
        value: parseNumber(entry.value),
        cashflow: parseNumber(entry.cashflow),
        balance: parseNumber(entry.balance),
        payment: parseNumber(entry.payment),
        description: String(entry.description ?? ""),
        created_at: entry.created_at,
        updated_at: entry.updated_at,
      })),
    );
    if (error) throw error;
  }

  if (subscriptions.length > 0) {
    const { error } = await admin.from("finance_subscriptions").insert(
      subscriptions.map((subscription) => ({
        user_id: userId,
        name: String(subscription.name ?? ""),
        price: parseNumber(subscription.price),
        billing_cycle: subscription.billing_cycle === "yearly" ? "yearly" : "monthly",
        category: String(subscription.category ?? "Other"),
        is_active: parseBoolean(subscription.is_active ?? true),
        created_at: subscription.created_at,
        updated_at: subscription.updated_at,
      })),
    );
    if (error) throw error;
  }

  return true;
}
