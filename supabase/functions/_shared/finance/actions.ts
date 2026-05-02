import { buildBootstrap, normalizeProfile, replaceOnboardingData } from "./bootstrap.ts";
import { createAdminClient } from "./db.ts";
import { buildAffordabilityResult } from "./intelligence.ts";
import {
  approveRequest,
  dispatchApprovedRequest,
  getApprovalRequest,
  listActionHistory,
  listApprovalRequests,
  proposeBillAction,
  proposeSubscriptionAction,
  recordExecutionReceipt,
  reconcileExecutionResult,
  rejectRequest,
  runAgentPlanner,
  syncExecutionReceipt,
  updateAgentMode,
} from "./execution.ts";
import {
  analyzeReceiptImage as analyzeReceiptImageImport,
  buildReceiptForwardingDetails as buildReceiptForwardingAddress,
  importCsvTransactions as importCsvTransactionsImport,
  reviewDraftTransaction as reviewDraftTransactionImport,
} from "./imports.ts";
import { migrateLegacyPublicData } from "./migration.ts";
import {
  consumeSensitiveActionVerification,
  requestSensitiveActionCode,
  verifySensitiveActionCode,
} from "./security.ts";
import { parseNumber } from "./utils.ts";

type WorkspaceUser = {
  id: string;
  email: string | null;
};

async function updateProfile(user: WorkspaceUser, profile: Record<string, unknown>, legacyPublicUserId: string | null) {
  const admin = createAdminClient();
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
    onboarding_completed_at: existingProfile?.onboarding_completed_at ?? null,
  });

  if (error) throw error;
}

async function saveGoal(userId: string, goal: Record<string, unknown>) {
  const admin = createAdminClient();
  const payload = {
    id: typeof goal.id === "string" && goal.id ? goal.id : undefined,
    user_id: userId,
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
        .eq("user_id", userId)
    : await admin.from("finance_goals").insert(payload);

  if (error) throw error;
}

async function deleteGoal(userId: string, goalId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("finance_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);
  if (error) throw error;
}

async function saveBudgetLimit(userId: string, budgetLimit: Record<string, unknown>) {
  const admin = createAdminClient();
  const payload = {
    id: typeof budgetLimit.id === "string" && budgetLimit.id ? budgetLimit.id : undefined,
    user_id: userId,
    category: String(budgetLimit.category ?? ""),
    monthly_limit: parseNumber(budgetLimit.monthly_limit),
  };
  const { error } = payload.id
    ? await admin
        .from("finance_budget_limits")
        .update(payload)
        .eq("id", payload.id)
        .eq("user_id", userId)
    : await admin.from("finance_budget_limits").insert(payload);
  if (error) throw error;
}

async function deleteBudgetLimit(userId: string, budgetLimitId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("finance_budget_limits")
    .delete()
    .eq("id", budgetLimitId)
    .eq("user_id", userId);
  if (error) throw error;
}

async function saveSubscription(userId: string, subscription: Record<string, unknown>) {
  const admin = createAdminClient();
  const payload = {
    id: typeof subscription.id === "string" && subscription.id ? subscription.id : undefined,
    user_id: userId,
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
        .eq("user_id", userId)
    : await admin.from("finance_subscriptions").insert(payload);
  if (error) throw error;
}

async function deleteSubscription(userId: string, subscriptionId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("finance_subscriptions")
    .delete()
    .eq("id", subscriptionId)
    .eq("user_id", userId);
  if (error) throw error;
}

async function saveFinancialEntry(userId: string, financialEntry: Record<string, unknown>) {
  const admin = createAdminClient();
  const payload = {
    id:
      typeof financialEntry.id === "string" && financialEntry.id
        ? financialEntry.id
        : undefined,
    user_id: userId,
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
        .eq("user_id", userId)
    : await admin.from("finance_financial_entries").insert(payload);
  if (error) throw error;
}

async function deleteFinancialEntry(userId: string, entryId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("finance_financial_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);
  if (error) throw error;
}

async function markNotificationRead(userId: string, notificationId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function handleFinanceCoreAction(params: {
  body: Record<string, unknown>;
  user: WorkspaceUser;
  legacyPublicUserId: string | null;
}) {
  const { body, user, legacyPublicUserId } = params;
  const action = String(body.action ?? "bootstrap");

  if (legacyPublicUserId) {
    await migrateLegacyPublicData(user.id, legacyPublicUserId);
  }

  if (action === "bootstrap") {
    return buildBootstrap(user.id, user.email);
  }

  if (action === "complete_onboarding") {
    await replaceOnboardingData(user.id, body, legacyPublicUserId);
    return buildBootstrap(user.id, user.email);
  }

  if (action === "update_profile") {
    await updateProfile(
      user,
      (body.profile as Record<string, unknown>) ?? {},
      legacyPublicUserId,
    );
    return buildBootstrap(user.id, user.email);
  }

  if (action === "update_agent_mode") {
    await updateAgentMode(
      user.id,
      (body.agent_settings as Record<string, unknown>) ?? {},
    );
    return buildBootstrap(user.id, user.email);
  }

  if (action === "run_agent_planner") {
    await runAgentPlanner(user.id);
    return buildBootstrap(user.id, user.email);
  }

  if (action === "save_goal") {
    await saveGoal(user.id, (body.goal as Record<string, unknown>) ?? {});
    return buildBootstrap(user.id, user.email);
  }

  if (action === "delete_goal") {
    await deleteGoal(user.id, String(body.goal_id ?? ""));
    return buildBootstrap(user.id, user.email);
  }

  if (action === "save_budget_limit") {
    await saveBudgetLimit(user.id, (body.budget_limit as Record<string, unknown>) ?? {});
    return buildBootstrap(user.id, user.email);
  }

  if (action === "delete_budget_limit") {
    await deleteBudgetLimit(user.id, String(body.budget_limit_id ?? ""));
    return buildBootstrap(user.id, user.email);
  }

  if (action === "save_subscription") {
    await saveSubscription(user.id, (body.subscription as Record<string, unknown>) ?? {});
    return buildBootstrap(user.id, user.email);
  }

  if (action === "delete_subscription") {
    await deleteSubscription(user.id, String(body.subscription_id ?? ""));
    return buildBootstrap(user.id, user.email);
  }

  if (action === "save_financial_entry") {
    await saveFinancialEntry(user.id, (body.financial_entry as Record<string, unknown>) ?? {});
    return buildBootstrap(user.id, user.email);
  }

  if (action === "delete_financial_entry") {
    await deleteFinancialEntry(user.id, String(body.financial_entry_id ?? ""));
    return buildBootstrap(user.id, user.email);
  }

  if (action === "check_affordability") {
    const bootstrap = await buildBootstrap(user.id, user.email);
    return buildAffordabilityResult({
      amount: parseNumber(body.amount),
      category: typeof body.category === "string" ? body.category : null,
      cadence: body.cadence === "monthly" ? "monthly" : "one_time",
      dashboardSummary: bootstrap.dashboard_summary,
      forecast: bootstrap.forecast,
      budgetStatuses: bootstrap.budget_statuses,
      spendingEvents: bootstrap.spending_events,
    });
  }

  if (action === "request_sensitive_action_code") {
    return requestSensitiveActionCode(
      user.id,
      user.email,
      body.sensitive_action,
    );
  }

  if (action === "verify_sensitive_action_code") {
    return verifySensitiveActionCode(user.id, {
      action: body.sensitive_action,
      verificationId: body.verification_id,
      code: body.code,
    });
  }

  if (action === "get_receipt_forwarding_address") {
    await consumeSensitiveActionVerification(
      user.id,
      "receipt_forwarding",
      body.security_verification_id,
    );

    return buildReceiptForwardingAddress(user.id);
  }

  if (action === "import_csv_transactions") {
    const csvText = String(body.csv_text ?? "");
    const fileName = typeof body.file_name === "string" ? body.file_name : null;
    await importCsvTransactionsImport(user.id, csvText, fileName);
    return buildBootstrap(user.id, user.email);
  }

  if (action === "analyze_receipt_image") {
    const imageDataUrl = String(body.image_data_url ?? "");
    const fileName = typeof body.file_name === "string" ? body.file_name : null;
    await analyzeReceiptImageImport(user.id, imageDataUrl, fileName);
    return buildBootstrap(user.id, user.email);
  }

  if (action === "review_draft_transaction") {
    const draftId = String(body.draft_transaction_id ?? "");
    const decision =
      body.decision === "reject" ? "reject" : body.decision === "edit" ? "edit" : "approve";
    await reviewDraftTransactionImport(user.id, {
      draftId,
      decision,
      securityVerificationId:
        typeof body.security_verification_id === "string"
          ? body.security_verification_id
          : null,
      updates:
        body.updates && typeof body.updates === "object"
          ? (body.updates as Record<string, unknown>)
          : undefined,
    });
    return buildBootstrap(user.id, user.email);
  }

  if (action === "list_approval_requests") {
    return listApprovalRequests(user.id);
  }

  if (action === "get_approval_request") {
    return getApprovalRequest(user.id, String(body.approval_request_id ?? ""));
  }

  if (action === "list_action_history") {
    return listActionHistory(user.id);
  }

  if (action === "propose_subscription_action") {
    await proposeSubscriptionAction(
      user.id,
      (body.proposal as Record<string, unknown>) ?? {},
    );
    return buildBootstrap(user.id, user.email);
  }

  if (action === "propose_bill_action") {
    await proposeBillAction(
      user.id,
      (body.proposal as Record<string, unknown>) ?? {},
    );
    return buildBootstrap(user.id, user.email);
  }

  if (action === "approve_request") {
    await approveRequest(
      user.id,
      String(body.approval_request_id ?? ""),
      typeof body.security_verification_id === "string"
        ? body.security_verification_id
        : null,
    );
    return buildBootstrap(user.id, user.email);
  }

  if (action === "reject_request") {
    await rejectRequest(
      user.id,
      String(body.approval_request_id ?? ""),
      typeof body.reason === "string" ? body.reason : null,
    );
    return buildBootstrap(user.id, user.email);
  }

  if (action === "record_execution_receipt") {
    return recordExecutionReceipt(
      user.id,
      (body.receipt as Record<string, unknown>) ?? {},
    );
  }

  if (action === "dispatch_approved_request") {
    await dispatchApprovedRequest(user.id, String(body.approval_request_id ?? ""));
    return buildBootstrap(user.id, user.email);
  }

  if (action === "sync_execution_receipt") {
    await syncExecutionReceipt(
      user.id,
      (body.receipt as Record<string, unknown>) ?? {},
    );
    return buildBootstrap(user.id, user.email);
  }

  if (action === "reconcile_execution_result") {
    await reconcileExecutionResult(
      user.id,
      (body.reconciliation as Record<string, unknown>) ?? {},
    );
    return buildBootstrap(user.id, user.email);
  }

  if (action === "mark_notification_read") {
    await markNotificationRead(user.id, String(body.notification_id ?? ""));
    return buildBootstrap(user.id, user.email);
  }

  return buildBootstrap(user.id, user.email);
}
