import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { hasSupabaseConfig, SUPABASE_SETUP_MESSAGE } from "@/integrations/supabase/client";
import { EMPTY_DASHBOARD_SUMMARY } from "@/lib/finance";
import type {
  AffordabilityResult,
  AgentMode,
  BootstrapData,
  BudgetLimit,
  DraftTransaction,
  FinancialEntry,
  MediaAnalysisRequest,
  MediaAnalysisResult,
  OnboardingPayload,
  ReceiptForwardingDetails,
  SensitiveActionCodeRequest,
  SensitiveActionId,
  SensitiveActionVerificationResult,
  Subscription,
  UserGoal,
  UserProfile,
} from "@/lib/evaContracts";

type WorkspaceOptions = {
  legacyPublicUserId?: string;
};

function createEmptyBootstrap(userId = "", email: string | null = null): BootstrapData {
  return {
    user_id: userId,
    email,
    has_onboarded: false,
    migration: {
      legacy_public_user_id: null,
      migrated_from_public: false,
    },
    profile: null,
    goals: [],
    budget_limits: [],
    spending_events: [],
    spending_logs: [],
    financial_entries: [],
    subscriptions: [],
    dashboard_summary: { ...EMPTY_DASHBOARD_SUMMARY },
    advice: [],
    summaries: [],
    pattern_summaries: [],
    forecast: null,
    subscription_review: null,
    budget_statuses: [],
    goal_statuses: [],
    import_jobs: [],
    draft_transactions: [],
    notifications: [],
    agent_tasks: [],
    approval_requests: [],
    action_history: [],
    empty_flags: {
      has_spending_history: false,
      has_goals: false,
      has_budget_limits: false,
      has_subscriptions: false,
      has_balance_sheet: false,
    },
  };
}

async function invokeWorkspace<T>(
  action: string,
  payload: Record<string, unknown> = {},
  options: WorkspaceOptions = {},
) {
  if (!hasSupabaseConfig) {
    if (action === "bootstrap") {
      return createEmptyBootstrap() as T;
    }
    throw new Error(SUPABASE_SETUP_MESSAGE);
  }

  return invokeEdgeFunction<T>("finance-core", {
    action,
    ...payload,
    legacy_public_user_id: options.legacyPublicUserId ?? null,
  });
}

export function getEmptyBootstrap(userId = "", email: string | null = null) {
  return createEmptyBootstrap(userId, email);
}

export async function fetchBootstrap(options: WorkspaceOptions = {}) {
  return invokeWorkspace<BootstrapData>("bootstrap", {}, options);
}

export async function completeOnboarding(
  payload: OnboardingPayload,
  options: WorkspaceOptions = {},
) {
  return invokeWorkspace<BootstrapData>("complete_onboarding", payload, options);
}

export async function updateProfile(payload: Partial<UserProfile>) {
  return invokeWorkspace<BootstrapData>("update_profile", { profile: payload });
}

export async function updateAgentMode(input: {
  agentMode: AgentMode;
  autopilotHighRiskEnabled?: boolean;
}) {
  return invokeWorkspace<BootstrapData>("update_agent_mode", {
    agent_settings: {
      agent_mode: input.agentMode,
      autopilot_high_risk_enabled: input.autopilotHighRiskEnabled ?? false,
    },
  });
}

export async function runAgentPlanner() {
  return invokeWorkspace<BootstrapData>("run_agent_planner");
}

export async function saveGoal(goal: Partial<UserGoal>) {
  return invokeWorkspace<BootstrapData>("save_goal", { goal });
}

export async function deleteGoal(goalId: string) {
  return invokeWorkspace<BootstrapData>("delete_goal", { goal_id: goalId });
}

export async function saveBudgetLimit(limit: Partial<BudgetLimit>) {
  return invokeWorkspace<BootstrapData>("save_budget_limit", { budget_limit: limit });
}

export async function deleteBudgetLimit(limitId: string) {
  return invokeWorkspace<BootstrapData>("delete_budget_limit", { budget_limit_id: limitId });
}

export async function saveSubscription(subscription: Partial<Subscription>) {
  return invokeWorkspace<BootstrapData>("save_subscription", { subscription });
}

export async function deleteSubscription(subscriptionId: string) {
  return invokeWorkspace<BootstrapData>("delete_subscription", { subscription_id: subscriptionId });
}

export async function saveFinancialEntry(entry: Partial<FinancialEntry>) {
  return invokeWorkspace<BootstrapData>("save_financial_entry", { financial_entry: entry });
}

export async function deleteFinancialEntry(entryId: string) {
  return invokeWorkspace<BootstrapData>("delete_financial_entry", { financial_entry_id: entryId });
}

export async function checkAffordability(input: {
  amount: number;
  category?: string | null;
  cadence?: "one_time" | "monthly";
}) {
  return invokeWorkspace<AffordabilityResult>("check_affordability", input);
}

export async function importCsvTransactions(csvText: string, fileName: string) {
  return invokeWorkspace<BootstrapData>("import_csv_transactions", {
    csv_text: csvText,
    file_name: fileName,
  });
}

export async function analyzeReceiptImage(imageDataUrl: string, fileName: string) {
  return invokeWorkspace<BootstrapData>("analyze_receipt_image", {
    image_data_url: imageDataUrl,
    file_name: fileName,
  });
}

export async function analyzeMedia(request: MediaAnalysisRequest) {
  return invokeWorkspace<MediaAnalysisResult>("analyze_media", request);
}

export async function reviewDraftTransaction(input: {
  draftTransactionId: string;
  decision: "approve" | "reject" | "edit";
  updates?: Partial<DraftTransaction>;
  securityVerificationId?: string | null;
}) {
  return invokeWorkspace<BootstrapData>("review_draft_transaction", {
    draft_transaction_id: input.draftTransactionId,
    decision: input.decision,
    updates: input.updates ?? null,
    security_verification_id: input.securityVerificationId ?? null,
  });
}

export async function markNotificationRead(notificationId: string) {
  return invokeWorkspace<BootstrapData>("mark_notification_read", {
    notification_id: notificationId,
  });
}

export async function requestSensitiveActionCode(action: SensitiveActionId) {
  return invokeWorkspace<SensitiveActionCodeRequest>("request_sensitive_action_code", {
    sensitive_action: action,
  });
}

export async function verifySensitiveActionCode(input: {
  action: SensitiveActionId;
  verificationId: string;
  code: string;
}) {
  return invokeWorkspace<SensitiveActionVerificationResult>("verify_sensitive_action_code", {
    sensitive_action: input.action,
    verification_id: input.verificationId,
    code: input.code,
  });
}

export async function getReceiptForwardingAddress(securityVerificationId: string) {
  return invokeWorkspace<ReceiptForwardingDetails>("get_receipt_forwarding_address", {
    security_verification_id: securityVerificationId,
  });
}

export async function proposeSubscriptionAction(input: {
  subscriptionId: string;
  proposalAction: "cancel" | "review";
  reason?: string | null;
}) {
  return invokeWorkspace<BootstrapData>("propose_subscription_action", {
    proposal: {
      subscription_id: input.subscriptionId,
      proposal_action: input.proposalAction,
      reason: input.reason ?? null,
    },
  });
}

export async function proposeBillAction(input: {
  merchant: string;
  amount?: number;
  dueDate?: string | null;
  note?: string | null;
  proposalAction: "bill_reminder" | "merchant_follow_up";
}) {
  return invokeWorkspace<BootstrapData>("propose_bill_action", {
    proposal: {
      merchant: input.merchant,
      amount: input.amount ?? 0,
      due_date: input.dueDate ?? null,
      note: input.note ?? null,
      proposal_action: input.proposalAction,
    },
  });
}

export async function approveRequest(input: {
  approvalRequestId: string;
  securityVerificationId: string;
}) {
  return invokeWorkspace<BootstrapData>("approve_request", {
    approval_request_id: input.approvalRequestId,
    security_verification_id: input.securityVerificationId,
  });
}

export async function rejectRequest(input: {
  approvalRequestId: string;
  reason?: string | null;
}) {
  return invokeWorkspace<BootstrapData>("reject_request", {
    approval_request_id: input.approvalRequestId,
    reason: input.reason ?? null,
  });
}

export async function dispatchApprovedRequest(approvalRequestId: string) {
  return invokeWorkspace<BootstrapData>("dispatch_approved_request", {
    approval_request_id: approvalRequestId,
  });
}

export async function reconcileExecutionResult(input: {
  executionReceiptId: string;
  outcome: "completed" | "failed" | "cancelled";
  note?: string | null;
}) {
  return invokeWorkspace<BootstrapData>("reconcile_execution_result", {
    reconciliation: {
      execution_receipt_id: input.executionReceiptId,
      outcome: input.outcome,
      note: input.note ?? null,
    },
  });
}
