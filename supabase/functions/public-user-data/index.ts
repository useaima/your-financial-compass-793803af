import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildBootstrap,
  corsHeaders,
  createAdminClient,
  getPublicUserId,
  normalizeProfile,
  replaceOnboardingData,
} from "../_shared/publicUserData.ts";

function parseNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const publicUserId = getPublicUserId(body.public_user_id);
    const admin = createAdminClient();

    if (!action) {
      throw new Error("An action is required.");
    }

    if (action === "bootstrap") {
      const bootstrap = await buildBootstrap(publicUserId);
      return new Response(JSON.stringify(bootstrap), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "complete_onboarding") {
      await replaceOnboardingData(publicUserId, body);
      const bootstrap = await buildBootstrap(publicUserId);
      return new Response(JSON.stringify(bootstrap), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_profile") {
      const profile = (body.profile as Record<string, unknown>) ?? {};
      const { data: existingProfile, error: existingProfileError } = await admin
        .from("public_user_profiles")
        .select("*")
        .eq("public_user_id", publicUserId)
        .maybeSingle();

      if (existingProfileError) throw existingProfileError;

      const mergedProfile = normalizeProfile(publicUserId, {
        ...(existingProfile ?? {}),
        ...profile,
      });
      const { error } = await admin
        .from("public_user_profiles")
        .upsert({
          ...mergedProfile,
          onboarding_completed: true,
          onboarding_completed_at:
            existingProfile?.onboarding_completed_at ?? new Date().toISOString(),
        });

      if (error) throw error;
    }

    if (action === "save_goal") {
      const goal = (body.goal as Record<string, unknown>) ?? {};
      const payload = {
        id: typeof goal.id === "string" && goal.id ? goal.id : undefined,
        public_user_id: publicUserId,
        name: String(goal.name ?? ""),
        target_amount: parseNumber(goal.target_amount),
        current_amount: parseNumber(goal.current_amount),
        deadline: String(goal.deadline ?? ""),
        icon: String(goal.icon ?? "🎯"),
      };

      const { error } = payload.id
        ? await admin
            .from("public_user_goals")
            .update(payload)
            .eq("id", payload.id)
            .eq("public_user_id", publicUserId)
        : await admin.from("public_user_goals").insert(payload);

      if (error) throw error;
    }

    if (action === "delete_goal") {
      const goalId = String(body.goal_id ?? "");
      const { error } = await admin
        .from("public_user_goals")
        .delete()
        .eq("id", goalId)
        .eq("public_user_id", publicUserId);
      if (error) throw error;
    }

    if (action === "save_budget_limit") {
      const budgetLimit = (body.budget_limit as Record<string, unknown>) ?? {};
      const payload = {
        id:
          typeof budgetLimit.id === "string" && budgetLimit.id
            ? budgetLimit.id
            : undefined,
        public_user_id: publicUserId,
        category: String(budgetLimit.category ?? ""),
        monthly_limit: parseNumber(budgetLimit.monthly_limit),
      };
      const { error } = payload.id
        ? await admin
            .from("public_user_budget_limits")
            .update(payload)
            .eq("id", payload.id)
            .eq("public_user_id", publicUserId)
        : await admin.from("public_user_budget_limits").insert(payload);
      if (error) throw error;
    }

    if (action === "delete_budget_limit") {
      const budgetLimitId = String(body.budget_limit_id ?? "");
      const { error } = await admin
        .from("public_user_budget_limits")
        .delete()
        .eq("id", budgetLimitId)
        .eq("public_user_id", publicUserId);
      if (error) throw error;
    }

    if (action === "save_subscription") {
      const subscription = (body.subscription as Record<string, unknown>) ?? {};
      const payload = {
        id:
          typeof subscription.id === "string" && subscription.id
            ? subscription.id
            : undefined,
        public_user_id: publicUserId,
        name: String(subscription.name ?? ""),
        price: parseNumber(subscription.price),
        billing_cycle:
          subscription.billing_cycle === "yearly" ? "yearly" : "monthly",
        category: String(subscription.category ?? "Other"),
        is_active: Boolean(subscription.is_active ?? true),
      };
      const { error } = payload.id
        ? await admin
            .from("public_user_subscriptions")
            .update(payload)
            .eq("id", payload.id)
            .eq("public_user_id", publicUserId)
        : await admin.from("public_user_subscriptions").insert(payload);
      if (error) throw error;
    }

    if (action === "delete_subscription") {
      const subscriptionId = String(body.subscription_id ?? "");
      const { error } = await admin
        .from("public_user_subscriptions")
        .delete()
        .eq("id", subscriptionId)
        .eq("public_user_id", publicUserId);
      if (error) throw error;
    }

    if (action === "save_financial_entry") {
      const financialEntry =
        (body.financial_entry as Record<string, unknown>) ?? {};
      const payload = {
        id:
          typeof financialEntry.id === "string" && financialEntry.id
            ? financialEntry.id
            : undefined,
        public_user_id: publicUserId,
        name: String(financialEntry.name ?? ""),
        type: String(financialEntry.type ?? "other"),
        entry_type:
          financialEntry.entry_type === "liability" ? "liability" : "asset",
        value: parseNumber(financialEntry.value),
        cashflow: parseNumber(financialEntry.cashflow),
        balance: parseNumber(financialEntry.balance),
        payment: parseNumber(financialEntry.payment),
        description: String(financialEntry.description ?? ""),
      };
      const { error } = payload.id
        ? await admin
            .from("public_user_financial_entries")
            .update(payload)
            .eq("id", payload.id)
            .eq("public_user_id", publicUserId)
        : await admin.from("public_user_financial_entries").insert(payload);
      if (error) throw error;
    }

    if (action === "delete_financial_entry") {
      const entryId = String(body.financial_entry_id ?? "");
      const { error } = await admin
        .from("public_user_financial_entries")
        .delete()
        .eq("id", entryId)
        .eq("public_user_id", publicUserId);
      if (error) throw error;
    }

    const bootstrap = await buildBootstrap(publicUserId);
    return new Response(JSON.stringify(bootstrap), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("public-user-data error:", error);
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
