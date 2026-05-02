import { createAdminClient } from "./db.ts";
import {
  buildAdvice,
  buildBudgetStatuses,
  buildDashboardSummary,
  buildForecastResult,
  buildGoalStatuses,
  buildPatternSummaries,
  buildSubscriptionReview,
  buildSummaries,
} from "./intelligence.ts";
import type {
  FinanceProfile,
  LegacyPublicProfile,
} from "./types.ts";
import { parseBoolean, parseNumber } from "./utils.ts";

function normalizeAgentMode(value: unknown): FinanceProfile["agent_mode"] {
  return value === "assisted" || value === "autopilot" ? value : "manual";
}

export function mapLegacyProfileToFinanceProfile(
  userId: string,
  profile: Partial<LegacyPublicProfile> | Record<string, unknown>,
  legacyPublicUserId: string | null,
  existingProfile?: Partial<FinanceProfile> | null,
) {
  const profileInput = profile as Record<string, unknown>;

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
    agent_mode: normalizeAgentMode(profileInput.agent_mode ?? existingProfile?.agent_mode),
    autopilot_high_risk_enabled: parseBoolean(
      profileInput.autopilot_high_risk_enabled ?? existingProfile?.autopilot_high_risk_enabled ?? false,
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
    agentTasksResult,
    approvalRequestsResult,
    actionHistoryResult,
    ...results
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
    admin.from("agent_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    admin.from("approval_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    admin.from("finance_execution_receipts").select("*").eq("user_id", userId).order("executed_at", { ascending: false }).limit(40),
    admin.from("public_user_profiles").select("is_admin").eq("user_id", userId).maybeSingle(),
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
  if (agentTasksResult.error) throw agentTasksResult.error;
  if (approvalRequestsResult.error) throw approvalRequestsResult.error;
  if (actionHistoryResult.error) throw actionHistoryResult.error;
  const publicProfileResult = results[results.length - 1];
  if (publicProfileResult.error) throw publicProfileResult.error;

  const profile = (profileResult.data as FinanceProfile | null) ?? null;
  const goals = goalsResult.data ?? [];
  const budgetLimits = budgetResult.data ?? [];
  const spendingEvents = eventsResult.data ?? [];
  const financialEntries = financialEntriesResult.data ?? [];
  const subscriptions = subscriptionResult.data ?? [];
  const importJobs = importJobsResult.data ?? [];
  const draftTransactions = draftTransactionsResult.data ?? [];
  const notifications = notificationsResult.data ?? [];
  const agentTasks = agentTasksResult.data ?? [];
  const approvalRequests = approvalRequestsResult.data ?? [];
  const actionHistory = actionHistoryResult.data ?? [];
  const isAdmin = Boolean((publicProfileResult.data as any)?.is_admin);

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
    isAdmin,
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
    agent_tasks: agentTasks,
    approval_requests: approvalRequests,
    action_history: actionHistory,
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
        is_active: Boolean((subscription as Record<string, unknown>).is_active ?? true),
      })),
    );
    if (error) throw error;
  }
}
