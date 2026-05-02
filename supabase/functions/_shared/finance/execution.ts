import { createAdminClient } from "./db.ts";
import { consumeSensitiveActionVerification } from "./security.ts";
import type {
  AgentMode,
  ExecutionDispatchStatus,
  ExecutionIntent,
  ExecutionProvider,
  FinanceApprovalRequest,
  FinanceExecutionReceipt,
  FinanceProfile,
  FinanceSubscription,
} from "./types.ts";
import { parseNumber, parseString } from "./utils.ts";

function parseAgentMode(value: unknown): AgentMode {
  return value === "assisted" || value === "autopilot" ? value : "manual";
}

function riskClassForAmount(amount: number) {
  if (amount >= 500) return "high" as const;
  if (amount >= 100) return "medium" as const;
  return "low" as const;
}

function toMonthlyImpact(subscription: FinanceSubscription) {
  return subscription.billing_cycle === "yearly"
    ? Number(subscription.price) / 12
    : Number(subscription.price);
}

async function logAgentTask(input: {
  userId: string;
  taskType: string;
  reason: string;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("agent_tasks").insert({
    user_id: input.userId,
    task_type: input.taskType,
    status: "completed",
    reason: input.reason,
    input_payload: input.inputPayload,
    output_payload: input.outputPayload,
  });

  if (error) throw error;
}

async function createApprovalRequest(input: {
  userId: string;
  actionType: string;
  riskClass: "low" | "medium" | "high";
  title: string;
  description: string;
  requestPayload: Record<string, unknown>;
  executionIntent: ExecutionIntent;
  expiresAt?: string | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("approval_requests")
    .insert({
      user_id: input.userId,
      action_type: input.actionType,
      risk_class: input.riskClass,
      status: "pending",
      title: input.title,
      description: input.description,
      request_payload: input.requestPayload,
      execution_intent: input.executionIntent,
      expires_at: input.expiresAt ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as FinanceApprovalRequest;
}

function defaultExpiry(days = 7) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isUtgDispatchEnabled() {
  return Deno.env.get("EVA_UTG_DISPATCH_ENABLED") === "true";
}

function isAutopilotEnabled() {
  return Deno.env.get("EVA_AGENT_AUTOPILOT_ENABLED") === "true";
}

function preferredProvider(actionType: string): ExecutionProvider {
  if (isUtgDispatchEnabled() && (actionType === "bill_reminder" || actionType === "merchant_follow_up")) {
    return "utg";
  }

  return "manual_external_account";
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

type DispatchAttempt = {
  provider: ExecutionProvider;
  dispatchStatus: ExecutionDispatchStatus;
  dispatchedAt: string | null;
  payload: Record<string, unknown>;
};

async function dispatchToUtg(approvalRequest: FinanceApprovalRequest): Promise<DispatchAttempt> {
  const baseUrl = Deno.env.get("UTG_API_BASE_URL")?.replace(/\/$/, "");
  const apiKey = Deno.env.get("UTG_API_KEY");
  const intendedProvider =
    safeObject(approvalRequest.execution_intent).provider === "utg"
      ? "utg"
      : preferredProvider(approvalRequest.action_type);

  if (intendedProvider !== "utg") {
    return {
      provider: "manual_external_account",
      dispatchStatus: "not_dispatched",
      dispatchedAt: null,
      payload: {
        provider: "manual_external_account",
        reason: "This proposal is intentionally completed outside EVA.",
      },
    };
  }

  if (!isUtgDispatchEnabled() || !baseUrl) {
    return {
      provider: "manual_external_account",
      dispatchStatus: "dispatch_failed",
      dispatchedAt: null,
      payload: {
        provider: "manual_external_account",
        utg: {
          attempted: false,
          reason: "UTG dispatch is not configured, so EVA recorded a manual external action.",
        },
      },
    };
  }

  const dispatchedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${baseUrl}/a2a-rpc`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        type: "eva.execution_intent",
        approval_request_id: approvalRequest.id,
        idempotency_key: `eva:${approvalRequest.id}`,
        execution_intent: approvalRequest.execution_intent,
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responsePayload: unknown = responseText;
    try {
      responsePayload = responseText ? JSON.parse(responseText) : null;
    } catch {
      responsePayload = responseText;
    }

    if (!response.ok) {
      return {
        provider: "manual_external_account",
        dispatchStatus: "dispatch_failed",
        dispatchedAt,
        payload: {
          provider: "manual_external_account",
          utg: {
            attempted: true,
            endpoint: `${baseUrl}/a2a-rpc`,
            status: response.status,
            response: responsePayload,
            fallback: "manual_external_account",
          },
        },
      };
    }

    return {
      provider: "utg",
      dispatchStatus: "dispatched",
      dispatchedAt,
      payload: {
        provider: "utg",
        utg: {
          endpoint: `${baseUrl}/a2a-rpc`,
          status: response.status,
          response: responsePayload,
          idempotency_key: `eva:${approvalRequest.id}`,
        },
      },
    };
  } catch (error) {
    return {
      provider: "manual_external_account",
      dispatchStatus: "dispatch_failed",
      dispatchedAt,
      payload: {
        provider: "manual_external_account",
        utg: {
          attempted: true,
          error: error instanceof Error ? error.message : "Unknown UTG dispatch error",
          fallback: "manual_external_account",
        },
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function listApprovalRequests(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("approval_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FinanceApprovalRequest[];
}

export async function getApprovalRequest(userId: string, approvalRequestId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("approval_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("id", approvalRequestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("That approval request could not be found.");
  return data as FinanceApprovalRequest;
}

export async function listActionHistory(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("finance_execution_receipts")
    .select("*")
    .eq("user_id", userId)
    .order("executed_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FinanceExecutionReceipt[];
}

export async function proposeSubscriptionAction(
  userId: string,
  payload: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const subscriptionId = parseString(payload.subscription_id);
  const proposalAction = parseString(payload.proposal_action) === "cancel" ? "cancel" : "review";
  const requestedReason = parseString(payload.reason);

  if (!subscriptionId) {
    throw new Error("Choose a subscription before creating a proposal.");
  }

  const { data, error } = await admin
    .from("finance_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", subscriptionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("That subscription no longer exists in your workspace.");

  const subscription = data as FinanceSubscription;
  const monthlyImpact = toMonthlyImpact(subscription);
  const title =
    proposalAction === "cancel"
      ? `Approve cancellation plan for ${subscription.name}`
      : `Approve review plan for ${subscription.name}`;
  const description =
    requestedReason ||
    (proposalAction === "cancel"
      ? `EVA prepared a manual cancellation proposal for ${subscription.name}. You will approve it here, complete it in the external account, then reconcile the result back into EVA.`
      : `EVA prepared a review proposal for ${subscription.name} so you can decide whether to keep, downgrade, or cancel it outside EVA.`);
  const actionType = proposalAction === "cancel" ? "subscription_cancel" : "subscription_review";
  const requestPayload = {
    subscription_id: subscription.id,
    subscription_name: subscription.name,
    billing_cycle: subscription.billing_cycle,
    category: subscription.category,
    monthly_impact: monthlyImpact,
    proposed_action: proposalAction,
    reason: description,
  };
  const executionIntent: ExecutionIntent = {
    action_type: actionType,
    title,
    description,
    provider: "manual_external_account",
    payload: {
      ...requestPayload,
      execution_mode: "manual_external_account",
    },
  };

  const approvalRequest = await createApprovalRequest({
    userId,
    actionType,
    riskClass: monthlyImpact >= 50 ? "medium" : "low",
    title,
    description,
    requestPayload,
    executionIntent,
    expiresAt: defaultExpiry(),
  });

  await logAgentTask({
    userId,
    taskType: "execution_proposal",
    reason: title,
    inputPayload: requestPayload,
    outputPayload: { approval_request_id: approvalRequest.id },
  });

  return approvalRequest;
}

export async function proposeBillAction(
  userId: string,
  payload: Record<string, unknown>,
) {
  const merchant = parseString(payload.merchant);
  const amount = parseNumber(payload.amount);
  const dueDate = parseString(payload.due_date);
  const note = parseString(payload.note);
  const proposalAction =
    parseString(payload.proposal_action) === "merchant_follow_up"
      ? "merchant_follow_up"
      : "bill_reminder";

  if (!merchant) {
    throw new Error("Add a bill or merchant name before creating a proposal.");
  }

  const title =
    proposalAction === "merchant_follow_up"
      ? `Approve a merchant follow-up for ${merchant}`
      : `Approve a bill reminder for ${merchant}`;
  const description =
    note ||
    (proposalAction === "merchant_follow_up"
      ? `EVA prepared a manual follow-up plan for ${merchant}. Approve it here, resolve it outside EVA, then reconcile the outcome.`
      : `EVA prepared a reminder plan for ${merchant}. Approve it here, handle the bill outside EVA, then reconcile the result in your action history.`);
  const requestPayload = {
    merchant,
    amount,
    due_date: dueDate || null,
    note: note || null,
    proposed_action: proposalAction,
  };
  const provider = preferredProvider(proposalAction);
  const executionIntent: ExecutionIntent = {
    action_type: proposalAction,
    title,
    description,
    provider,
    payload: {
      ...requestPayload,
      execution_mode: provider,
    },
  };

  const approvalRequest = await createApprovalRequest({
    userId,
    actionType: proposalAction,
    riskClass: riskClassForAmount(amount),
    title,
    description,
    requestPayload,
    executionIntent,
    expiresAt: defaultExpiry(),
  });

  await logAgentTask({
    userId,
    taskType: "execution_proposal",
    reason: title,
    inputPayload: requestPayload,
    outputPayload: { approval_request_id: approvalRequest.id },
  });

  return approvalRequest;
}

export async function approveRequest(
  userId: string,
  approvalRequestId: string,
  securityVerificationId: string | null,
) {
  await consumeSensitiveActionVerification(userId, "approve_request", securityVerificationId);

  const admin = createAdminClient();
  const approvalRequest = await getApprovalRequest(userId, approvalRequestId);
  if (approvalRequest.status !== "pending") {
    throw new Error("Only pending approval requests can be approved.");
  }

  const decidedAt = new Date().toISOString();
  const { data: updatedData, error: updateError } = await admin
    .from("approval_requests")
    .update({ status: "approved", decided_at: decidedAt })
    .eq("id", approvalRequest.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError) throw updateError;

  const dispatchAttempt = await dispatchToUtg(updatedData as FinanceApprovalRequest);

  const { data: receiptData, error: receiptError } = await admin
    .from("finance_execution_receipts")
    .insert({
      user_id: userId,
      approval_request_id: approvalRequest.id,
      action_type: approvalRequest.action_type,
      status: "approved_pending",
      title: approvalRequest.title,
      description: approvalRequest.description,
      provider: dispatchAttempt.provider,
      dispatch_status: dispatchAttempt.dispatchStatus,
      receipt_payload: {
        approved_at: decidedAt,
        request_payload: approvalRequest.request_payload,
        execution_intent: approvalRequest.execution_intent,
        dispatch: dispatchAttempt.payload,
      },
      executed_at: decidedAt,
      dispatched_at: dispatchAttempt.dispatchedAt,
    })
    .select("*")
    .single();

  if (receiptError) throw receiptError;

  const { error: notificationError } = await admin.from("notifications").insert({
    user_id: userId,
    type: "execution_approved",
    title: "Proposal approved",
    body: `${approvalRequest.title} is approved. ${dispatchAttempt.provider === "utg" ? "UTG received the dispatch, and EVA will keep the receipt auditable." : "Complete it externally, then reconcile the result in EVA."}`,
  });

  if (notificationError) throw notificationError;

  await logAgentTask({
    userId,
    taskType: "approval_decision",
    reason: approvalRequest.title,
    inputPayload: {
      approval_request_id: approvalRequest.id,
      decision: "approved",
    },
    outputPayload: {
      receipt_id: (receiptData as FinanceExecutionReceipt).id,
      provider: dispatchAttempt.provider,
      dispatch_status: dispatchAttempt.dispatchStatus,
    },
  });

  return {
    approvalRequest: updatedData as FinanceApprovalRequest,
    receipt: receiptData as FinanceExecutionReceipt,
  };
}

export async function rejectRequest(
  userId: string,
  approvalRequestId: string,
  rejectionReason: string | null,
) {
  const admin = createAdminClient();
  const approvalRequest = await getApprovalRequest(userId, approvalRequestId);
  if (approvalRequest.status !== "pending") {
    throw new Error("Only pending approval requests can be rejected.");
  }

  const decidedAt = new Date().toISOString();
  const description = rejectionReason
    ? `${approvalRequest.description}

Rejected reason: ${rejectionReason}`
    : approvalRequest.description;
  const { data, error } = await admin
    .from("approval_requests")
    .update({
      status: "rejected",
      decided_at: decidedAt,
      description,
    })
    .eq("id", approvalRequest.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  await logAgentTask({
    userId,
    taskType: "approval_decision",
    reason: approvalRequest.title,
    inputPayload: {
      approval_request_id: approvalRequest.id,
      decision: "rejected",
      reason: rejectionReason,
    },
    outputPayload: {},
  });

  return data as FinanceApprovalRequest;
}

export async function recordExecutionReceipt(
  userId: string,
  payload: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const approvalRequestId = parseString(payload.approval_request_id) || null;
  const title = parseString(payload.title);
  const description = parseString(payload.description);
  const actionType = parseString(payload.action_type);

  if (!title || !actionType) {
    throw new Error("Execution receipts need a title and action type.");
  }

  if (approvalRequestId) {
    await getApprovalRequest(userId, approvalRequestId);
  }

  const { data, error } = await admin
    .from("finance_execution_receipts")
    .insert({
      user_id: userId,
      approval_request_id: approvalRequestId,
      action_type: actionType,
      status: parseString(payload.status) || "approved_pending",
      title,
      description,
      provider: parseString(payload.provider, "manual_external_account"),
      dispatch_status: parseString(payload.dispatch_status, "not_dispatched"),
      dispatched_at: typeof payload.dispatched_at === "string" ? payload.dispatched_at : null,
      receipt_payload:
        payload.receipt_payload && typeof payload.receipt_payload === "object"
          ? payload.receipt_payload
          : {},
      executed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as FinanceExecutionReceipt;
}

export async function reconcileExecutionResult(
  userId: string,
  payload: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const receiptId = parseString(payload.execution_receipt_id);
  const outcome = (() => {
    const parsed = parseString(payload.outcome);
    if (parsed === "completed" || parsed === "failed" || parsed === "cancelled") {
      return parsed;
    }
    throw new Error("Choose a valid reconciliation outcome.");
  })();
  const note = parseString(payload.note);

  if (!receiptId) {
    throw new Error("Pick an action-history item before reconciling it.");
  }

  const { data: receiptData, error: receiptError } = await admin
    .from("finance_execution_receipts")
    .select("*")
    .eq("id", receiptId)
    .eq("user_id", userId)
    .maybeSingle();

  if (receiptError) throw receiptError;
  if (!receiptData) {
    throw new Error("That action-history item could not be found.");
  }

  const receipt = receiptData as FinanceExecutionReceipt;
  const reconciledAt = new Date().toISOString();
  const reconciliationPayload = {
    ...(receipt.reconciliation_payload ?? {}),
    outcome,
    note: note || null,
    reconciled_by: "user",
    reconciled_at: reconciledAt,
  };

  const { data, error } = await admin
    .from("finance_execution_receipts")
    .update({
      status: outcome,
      reconciliation_payload: reconciliationPayload,
      reconciled_at: reconciledAt,
    })
    .eq("id", receipt.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  const requestPayload =
    receipt.receipt_payload &&
    typeof receipt.receipt_payload === "object" &&
    receipt.receipt_payload.request_payload &&
    typeof receipt.receipt_payload.request_payload === "object"
      ? (receipt.receipt_payload.request_payload as Record<string, unknown>)
      : null;

  if (outcome === "completed" && receipt.action_type === "subscription_cancel" && requestPayload) {
    const subscriptionId = parseString(requestPayload.subscription_id);
    if (subscriptionId) {
      const { error: subscriptionError } = await admin
        .from("finance_subscriptions")
        .update({ is_active: false })
        .eq("id", subscriptionId)
        .eq("user_id", userId);

      if (subscriptionError) throw subscriptionError;
    }
  }

  const { error: notificationError } = await admin.from("notifications").insert({
    user_id: userId,
    type: "execution_reconciled",
    title: "Action history updated",
    body: `${receipt.title} is now marked ${outcome.replace("_", " ")}.`,
  });

  if (notificationError) throw notificationError;

  return data as FinanceExecutionReceipt;
}

export async function updateAgentMode(
  userId: string,
  payload: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const agentMode = parseAgentMode(payload.agent_mode);
  const allowHighRisk = Boolean(payload.autopilot_high_risk_enabled);

  const { error } = await admin
    .from("finance_profiles")
    .update({
      agent_mode: agentMode,
      autopilot_high_risk_enabled: allowHighRisk,
    })
    .eq("user_id", userId);

  if (error) throw error;

  await logAgentTask({
    userId,
    taskType: "agent_mode_update",
    reason: `Agent mode changed to ${agentMode}`,
    inputPayload: payload,
    outputPayload: { agent_mode: agentMode, autopilot_high_risk_enabled: allowHighRisk },
  });
}

async function hasPendingDuplicate(userId: string, actionType: string, key: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("approval_requests")
    .select("request_payload")
    .eq("user_id", userId)
    .eq("action_type", actionType)
    .eq("status", "pending")
    .limit(50);

  if (error) throw error;

  return (data ?? []).some((item) => {
    const payload = safeObject(item.request_payload);
    return parseString(payload.subscription_id) === key || parseString(payload.merchant) === key;
  });
}

export async function runAgentPlanner(userId: string) {
  const admin = createAdminClient();
  const { data: profileData, error: profileError } = await admin
    .from("finance_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const profile = (profileData as FinanceProfile | null) ?? null;
  const agentMode = parseAgentMode(profile?.agent_mode);

  const { data: subscriptionsData, error: subscriptionsError } = await admin
    .from("finance_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("price", { ascending: false })
    .limit(12);

  if (subscriptionsError) throw subscriptionsError;

  const subscriptions = (subscriptionsData ?? []) as FinanceSubscription[];
  const candidates = subscriptions
    .filter((subscription) => toMonthlyImpact(subscription) > 0)
    .map((subscription) => ({
      subscription,
      monthlyImpact: toMonthlyImpact(subscription),
      action: toMonthlyImpact(subscription) >= 35 ? "review" : "review",
    }))
    .filter((candidate) => riskClassForAmount(candidate.monthlyImpact) !== "high" || profile?.autopilot_high_risk_enabled)
    .slice(0, agentMode === "autopilot" ? 3 : 5);

  const created: string[] = [];
  const suggested = candidates.map((candidate) => ({
    subscription_id: candidate.subscription.id,
    subscription_name: candidate.subscription.name,
    monthly_impact: candidate.monthlyImpact,
    proposed_action: candidate.action,
    risk_class: riskClassForAmount(candidate.monthlyImpact),
  }));

  if (agentMode === "autopilot" && isAutopilotEnabled()) {
    for (const candidate of candidates) {
      const duplicate = await hasPendingDuplicate(
        userId,
        "subscription_review",
        candidate.subscription.id,
      );

      if (duplicate) continue;

      const proposal = await proposeSubscriptionAction(userId, {
        subscription_id: candidate.subscription.id,
        proposal_action: "review",
        reason: `Autopilot prepared a low-risk review proposal for ${candidate.subscription.name}. It still needs your explicit approval before any external action.`,
      });
      created.push(proposal.id);
    }
  }

  await logAgentTask({
    userId,
    taskType: "agent_planner",
    reason:
      agentMode === "autopilot"
        ? "Autopilot scanned for safe proposal opportunities."
        : agentMode === "assisted"
          ? "Assisted mode prepared proposal suggestions without creating approvals."
          : "Manual mode planner check completed without autonomous proposal creation.",
    inputPayload: { agent_mode: agentMode, autopilot_enabled: isAutopilotEnabled() },
    outputPayload: { suggested, created_approval_request_ids: created },
  });

  return {
    agent_mode: agentMode,
    suggested,
    created_approval_request_ids: created,
  };
}

export async function dispatchApprovedRequest(
  userId: string,
  approvalRequestId: string,
) {
  const admin = createAdminClient();
  const approvalRequest = await getApprovalRequest(userId, approvalRequestId);
  if (approvalRequest.status !== "approved") {
    throw new Error("Only approved requests can be dispatched.");
  }

  const dispatchAttempt = await dispatchToUtg(approvalRequest);
  const { data: existingReceipt, error: existingError } = await admin
    .from("finance_execution_receipts")
    .select("*")
    .eq("user_id", userId)
    .eq("approval_request_id", approvalRequestId)
    .maybeSingle();

  if (existingError) throw existingError;

  const receiptPayload = {
    ...(safeObject(existingReceipt?.receipt_payload)),
    dispatch: dispatchAttempt.payload,
    redispatched_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("finance_execution_receipts")
    .update({
      provider: dispatchAttempt.provider,
      dispatch_status: dispatchAttempt.dispatchStatus,
      receipt_payload: receiptPayload,
      dispatched_at: dispatchAttempt.dispatchedAt,
    })
    .eq("id", existingReceipt?.id ?? "")
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as FinanceExecutionReceipt;
}

export async function syncExecutionReceipt(
  userId: string,
  payload: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const receiptId = parseString(payload.execution_receipt_id);
  if (!receiptId) throw new Error("Choose an action-history item to sync.");

  const receiptPayload = safeObject(payload.receipt_payload);
  const dispatchStatus = parseString(payload.dispatch_status, "not_dispatched") as ExecutionDispatchStatus;

  const { data, error } = await admin
    .from("finance_execution_receipts")
    .update({
      dispatch_status: dispatchStatus,
      receipt_payload: receiptPayload,
      dispatched_at: typeof payload.dispatched_at === "string" ? payload.dispatched_at : null,
    })
    .eq("id", receiptId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as FinanceExecutionReceipt;
}
