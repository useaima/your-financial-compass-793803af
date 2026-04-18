import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildAffordabilityResult,
  buildBootstrap,
  corsHeaders,
  createAdminClient,
  getLegacyPublicUserId,
  importCsvTransactions,
  migrateLegacyPublicData,
  normalizeProfile,
  reviewDraftTransaction,
  replaceOnboardingData,
  requireAuthenticatedUser,
} from "../_shared/financeCore.ts";

function parseNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Keep action parsing centralized so bootstrap remains the default for new auth flows.
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "bootstrap");
    const legacyPublicUserId = getLegacyPublicUserId(body.legacy_public_user_id);
    const user = await requireAuthenticatedUser(req);
    const admin = createAdminClient();

    if (legacyPublicUserId) {
      await migrateLegacyPublicData(user.id, legacyPublicUserId);
    }

    if (action === "bootstrap") {
      const bootstrap = await buildBootstrap(user.id, user.email ?? null);
      return new Response(JSON.stringify(bootstrap), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "complete_onboarding") {
      await replaceOnboardingData(user.id, body, legacyPublicUserId);
      const bootstrap = await buildBootstrap(user.id, user.email ?? null);
      return new Response(JSON.stringify(bootstrap), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_profile") {
      const profile = (body.profile as Record<string, unknown>) ?? {};
      const { data: existingProfile, error: existingProfileError } = await admin
        .from("finance_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProfileError) throw existingProfileError;

      const mergedProfile = normalizeProfile(
        user.id,
        {
          ...(existingProfile ?? {}),
          ...profile,
        },
        legacyPublicUserId,
        existingProfile ?? null,
      );
      const { error } = await admin.from("finance_profiles").upsert({
        ...mergedProfile,
        onboarding_completed: existingProfile?.onboarding_completed ?? false,
        onboarding_completed_at:
          existingProfile?.onboarding_completed_at ?? null,
      });

      if (error) throw error;
    }

    if (action === "save_goal") {
      const goal = (body.goal as Record<string, unknown>) ?? {};
      const payload = {
        id: typeof goal.id === "string" && goal.id ? goal.id : undefined,
        user_id: user.id,
        name: String(goal.name ?? ""),
        target_amount: parseNumber(goal.target_amount),
        current_amount: parseNumber(goal.current_amount),
        deadline: String(goal.deadline ?? ""),
        icon: String(goal.icon ?? "🎯"),
      };

      const { error } = payload.id
        ? await admin
            .from("finance_goals")
            .update(payload)
            .eq("id", payload.id)
            .eq("user_id", user.id)
        : await admin.from("finance_goals").insert(payload);

      if (error) throw error;
    }

    if (action === "delete_goal") {
      const goalId = String(body.goal_id ?? "");
      const { error } = await admin
        .from("finance_goals")
        .delete()
        .eq("id", goalId)
        .eq("user_id", user.id);
      if (error) throw error;
    }

    if (action === "save_budget_limit") {
      const budgetLimit = (body.budget_limit as Record<string, unknown>) ?? {};
      const payload = {
        id: typeof budgetLimit.id === "string" && budgetLimit.id ? budgetLimit.id : undefined,
        user_id: user.id,
        category: String(budgetLimit.category ?? ""),
        monthly_limit: parseNumber(budgetLimit.monthly_limit),
      };
      const { error } = payload.id
        ? await admin
            .from("finance_budget_limits")
            .update(payload)
            .eq("id", payload.id)
            .eq("user_id", user.id)
        : await admin.from("finance_budget_limits").insert(payload);
      if (error) throw error;
    }

    if (action === "delete_budget_limit") {
      const budgetLimitId = String(body.budget_limit_id ?? "");
      const { error } = await admin
        .from("finance_budget_limits")
        .delete()
        .eq("id", budgetLimitId)
        .eq("user_id", user.id);
      if (error) throw error;
    }

    if (action === "save_subscription") {
      const subscription = (body.subscription as Record<string, unknown>) ?? {};
      const payload = {
        id: typeof subscription.id === "string" && subscription.id ? subscription.id : undefined,
        user_id: user.id,
        name: String(subscription.name ?? ""),
        price: parseNumber(subscription.price),
        billing_cycle: subscription.billing_cycle === "yearly" ? "yearly" : "monthly",
        category: String(subscription.category ?? "Other"),
        is_active: Boolean(subscription.is_active ?? true),
      };
      const { error } = payload.id
        ? await admin
            .from("finance_subscriptions")
            .update(payload)
            .eq("id", payload.id)
            .eq("user_id", user.id)
        : await admin.from("finance_subscriptions").insert(payload);
      if (error) throw error;
    }

    if (action === "delete_subscription") {
      const subscriptionId = String(body.subscription_id ?? "");
      const { error } = await admin
        .from("finance_subscriptions")
        .delete()
        .eq("id", subscriptionId)
        .eq("user_id", user.id);
      if (error) throw error;
    }

    if (action === "save_financial_entry") {
      const financialEntry = (body.financial_entry as Record<string, unknown>) ?? {};
      const payload = {
        id:
          typeof financialEntry.id === "string" && financialEntry.id
            ? financialEntry.id
            : undefined,
        user_id: user.id,
        name: String(financialEntry.name ?? ""),
        type: String(financialEntry.type ?? "other"),
        entry_type: financialEntry.entry_type === "liability" ? "liability" : "asset",
        value: parseNumber(financialEntry.value),
        cashflow: parseNumber(financialEntry.cashflow),
        balance: parseNumber(financialEntry.balance),
        payment: parseNumber(financialEntry.payment),
        description: String(financialEntry.description ?? ""),
      };
      const { error } = payload.id
        ? await admin
            .from("finance_financial_entries")
            .update(payload)
            .eq("id", payload.id)
            .eq("user_id", user.id)
        : await admin.from("finance_financial_entries").insert(payload);
      if (error) throw error;
    }

    if (action === "delete_financial_entry") {
      const entryId = String(body.financial_entry_id ?? "");
      const { error } = await admin
        .from("finance_financial_entries")
        .delete()
        .eq("id", entryId)
        .eq("user_id", user.id);
      if (error) throw error;
    }

    if (action === "check_affordability") {
      const bootstrap = await buildBootstrap(user.id, user.email ?? null);
      const affordability = buildAffordabilityResult({
        amount: parseNumber(body.amount),
        category: typeof body.category === "string" ? body.category : null,
        cadence: body.cadence === "monthly" ? "monthly" : "one_time",
        dashboardSummary: bootstrap.dashboard_summary,
        forecast: bootstrap.forecast,
        budgetStatuses: bootstrap.budget_statuses,
        spendingEvents: bootstrap.spending_events,
      });

      return new Response(JSON.stringify(affordability), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import_csv_transactions") {
      const csvText = String(body.csv_text ?? "");
      const fileName = typeof body.file_name === "string" ? body.file_name : null;
      await importCsvTransactions(user.id, csvText, fileName);
    }

    if (action === "review_draft_transaction") {
      const draftId = String(body.draft_transaction_id ?? "");
      const decision =
        body.decision === "reject" ? "reject" : body.decision === "edit" ? "edit" : "approve";
      await reviewDraftTransaction(user.id, {
        draftId,
        decision,
        updates:
          body.updates && typeof body.updates === "object"
            ? (body.updates as Record<string, unknown>)
            : undefined,
      });
      const bootstrap = await buildBootstrap(user.id, user.email ?? null);

      return new Response(JSON.stringify(bootstrap), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark_notification_read") {
      const notificationId = String(body.notification_id ?? "");
      const { error } = await admin
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);
      if (error) throw error;
    }

    const bootstrap = await buildBootstrap(user.id, user.email ?? null);
    return new Response(JSON.stringify(bootstrap), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("finance-core error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
