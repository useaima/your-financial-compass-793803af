import { createAdminClient } from "./db.ts";
import type {
  FinanceSensitiveActionVerification,
  SensitiveActionCodeRequestResult,
  SensitiveActionCodeVerifyResult,
  SensitiveActionId,
} from "./types.ts";
import { parseString } from "./utils.ts";

const SECURITY_CODE_TTL_MINUTES = 10;
const SECURITY_CODE_RESEND_SECONDS = 45;
const SECURITY_CODE_MAX_ATTEMPTS = 5;

function parseSensitiveActionId(value: unknown): SensitiveActionId {
  if (
    value === "generate_statement" ||
    value === "review_draft_transaction" ||
    value === "receipt_forwarding" ||
    value === "security_settings" ||
    value === "approve_request"
  ) {
    return value;
  }

  throw new Error("That security verification action is not supported.");
}

function getSensitiveActionTitle(action: SensitiveActionId) {
  if (action === "generate_statement") return "generate your financial statement";
  if (action === "review_draft_transaction") return "approve or edit imported transactions";
  if (action === "receipt_forwarding") return "reveal your receipt-forwarding address";
  if (action === "approve_request") return "approve an execution request";
  return "change account security settings";
}

function getSensitiveActionEmailSubject(action: SensitiveActionId) {
  if (action === "generate_statement") return "Your EVA security code for statement generation";
  if (action === "review_draft_transaction") {
    return "Your EVA security code for transaction review";
  }
  if (action === "receipt_forwarding") {
    return "Your EVA security code for receipt forwarding";
  }
  if (action === "approve_request") {
    return "Your EVA security code for approval requests";
  }
  return "Your EVA security code";
}

function generateSecurityCode() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(random).padStart(6, "0");
}

async function hashSecurityCode(code: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code.trim()),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function maskEmailAddress(email: string | null) {
  const normalized = parseString(email).toLowerCase();
  if (!normalized.includes("@")) {
    return "your verified email";
  }

  const [localPart, domain] = normalized.split("@");
  const visibleLocal = localPart.slice(0, 2);
  const hiddenLocal = Math.max(localPart.length - visibleLocal.length, 0);
  const domainParts = domain.split(".");
  const domainName = domainParts[0] ?? "";
  const domainSuffix = domainParts.slice(1).join(".");
  const visibleDomain = domainName.slice(0, 1);
  const hiddenDomain = Math.max(domainName.length - visibleDomain.length, 0);

  return `${visibleLocal}${"*".repeat(hiddenLocal)}@${visibleDomain}${"*".repeat(hiddenDomain)}${domainSuffix ? `.${domainSuffix}` : ""}`;
}

async function sendSensitiveActionCodeEmail(input: {
  email: string;
  action: SensitiveActionId;
  code: string;
  expiresAt: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress =
    Deno.env.get("RESEND_FROM_EMAIL") ?? "EVA Security <alerts@useaima.com>";

  if (!resendApiKey) {
    throw new Error(
      "Security verification email is not configured right now. Please try again later.",
    );
  }

  const expiresLabel = new Date(input.expiresAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
  const actionTitle = getSensitiveActionTitle(input.action);
  const subject = getSensitiveActionEmailSubject(input.action);
  const text = [
    "Your EVA security verification code",
    "",
    `Use this code to ${actionTitle}: ${input.code}`,
    "",
    `This code expires at ${expiresLabel} UTC and works only once.`,
    "If you did not request this code, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; padding: 24px;">
      <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280;">EVA security verification</p>
      <h1 style="margin: 0 0 16px; font-size: 20px; color: #111827;">Confirm this sensitive action</h1>
      <p style="margin: 0 0 16px;">Use this code to ${actionTitle}:</p>
      <div style="margin: 0 0 20px; display: inline-block; padding: 12px 16px; border-radius: 14px; background: #fef3c7; color: #92400e; font-size: 28px; font-weight: 700; letter-spacing: 0.32em;">
        ${input.code}
      </div>
      <p style="margin: 0 0 12px;">This code expires at <strong>${expiresLabel} UTC</strong> and works only once.</p>
      <p style="margin: 0; font-size: 13px; color: #6b7280;">If you did not request this code, you can safely ignore this email.</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [input.email],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    console.error("security verification email failed:", response.status, responseBody);
    throw new Error("We could not send your security verification code right now.");
  }
}

export async function requestSensitiveActionCode(
  userId: string,
  email: string | null,
  actionInput: unknown,
) {
  const action = parseSensitiveActionId(actionInput);
  const normalizedEmail = parseString(email).toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Your account is missing a verified email for security verification.");
  }

  const admin = createAdminClient();
  const { data: latestRequestData, error: latestRequestError } = await admin
    .from("finance_sensitive_action_verifications")
    .select("*")
    .eq("user_id", userId)
    .eq("action_type", action)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRequestError) throw latestRequestError;
  const latestRequest =
    (latestRequestData as FinanceSensitiveActionVerification | null) ?? null;

  if (latestRequest) {
    const latestCreatedAt = new Date(latestRequest.created_at).getTime();
    const secondsSinceLastRequest = Math.floor((Date.now() - latestCreatedAt) / 1000);

    if (secondsSinceLastRequest < SECURITY_CODE_RESEND_SECONDS) {
      const waitSeconds = SECURITY_CODE_RESEND_SECONDS - secondsSinceLastRequest;
      throw new Error(
        `Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before requesting another security code.`,
      );
    }
  }

  const verificationCode = generateSecurityCode();
  const codeHash = await hashSecurityCode(verificationCode);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SECURITY_CODE_TTL_MINUTES * 60_000).toISOString();
  const resendAvailableAt = new Date(
    now.getTime() + SECURITY_CODE_RESEND_SECONDS * 1000,
  ).toISOString();

  const { data, error } = await admin
    .from("finance_sensitive_action_verifications")
    .insert({
      user_id: userId,
      action_type: action,
      code_hash: codeHash,
      delivery_target: maskEmailAddress(normalizedEmail),
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) throw error;
  const createdVerification = data as FinanceSensitiveActionVerification;

  try {
    await sendSensitiveActionCodeEmail({
      email: normalizedEmail,
      action,
      code: verificationCode,
      expiresAt,
    });
  } catch (error) {
    const cleanupResult = await admin
      .from("finance_sensitive_action_verifications")
      .delete()
      .eq("id", createdVerification.id)
      .eq("user_id", userId);

    if (cleanupResult.error) {
      console.error("security verification cleanup failed:", cleanupResult.error);
    }

    throw error;
  }

  return {
    verification_id: createdVerification.id,
    action,
    expires_at: expiresAt,
    resend_available_at: resendAvailableAt,
    delivery_target: createdVerification.delivery_target,
  } satisfies SensitiveActionCodeRequestResult;
}

export async function verifySensitiveActionCode(
  userId: string,
  input: {
    action: unknown;
    verificationId: unknown;
    code: unknown;
  },
) {
  const action = parseSensitiveActionId(input.action);
  const verificationId = parseString(input.verificationId);
  const code = parseString(input.code).replace(/\s+/g, "");

  if (!verificationId) {
    throw new Error("We could not verify that action because the security request is missing.");
  }

  if (code.length < 6) {
    throw new Error("Enter the 6-digit security code from your email.");
  }

  const admin = createAdminClient();
  const { data: verificationData, error: verificationError } = await admin
    .from("finance_sensitive_action_verifications")
    .select("*")
    .eq("id", verificationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (verificationError) throw verificationError;
  const verification =
    (verificationData as FinanceSensitiveActionVerification | null) ?? null;
  if (!verification) {
    throw new Error("That security verification request could not be found.");
  }

  if (verification.action_type !== action) {
    throw new Error("That code does not match the action you are trying to verify.");
  }

  if (verification.used_at) {
    throw new Error("That security code has already been used. Request a new one.");
  }

  if (verification.verified_at) {
    return {
      verification_id: verification.id,
      action,
      verified_at: verification.verified_at,
      expires_at: verification.expires_at,
    } satisfies SensitiveActionCodeVerifyResult;
  }

  if (new Date(verification.expires_at).getTime() <= Date.now()) {
    throw new Error("That security code expired. Request a new one and try again.");
  }

  if (Number(verification.attempt_count ?? 0) >= SECURITY_CODE_MAX_ATTEMPTS) {
    throw new Error("Too many failed attempts. Request a new security code and try again.");
  }

  const hashedAttempt = await hashSecurityCode(code);
  if (hashedAttempt !== verification.code_hash) {
    const nextAttemptCount = Number(verification.attempt_count ?? 0) + 1;
    const { error: incrementError } = await admin
      .from("finance_sensitive_action_verifications")
      .update({ attempt_count: nextAttemptCount })
      .eq("id", verification.id)
      .eq("user_id", userId);

    if (incrementError) throw incrementError;

    throw new Error("That security code is not correct. Check the email and try again.");
  }

  const verifiedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("finance_sensitive_action_verifications")
    .update({
      verified_at: verifiedAt,
      attempt_count: Number(verification.attempt_count ?? 0) + 1,
    })
    .eq("id", verification.id)
    .eq("user_id", userId);

  if (updateError) throw updateError;

  return {
    verification_id: verification.id,
    action,
    verified_at: verifiedAt,
    expires_at: verification.expires_at,
  } satisfies SensitiveActionCodeVerifyResult;
}

export async function consumeSensitiveActionVerification(
  userId: string,
  actionInput: unknown,
  verificationIdInput: unknown,
) {
  const action = parseSensitiveActionId(actionInput);
  const verificationId = parseString(verificationIdInput);

  if (!verificationId) {
    throw new Error("Security verification is required before completing this action.");
  }

  const admin = createAdminClient();
  const { data: verificationData, error: verificationError } = await admin
    .from("finance_sensitive_action_verifications")
    .select("*")
    .eq("id", verificationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (verificationError) throw verificationError;
  const verification =
    (verificationData as FinanceSensitiveActionVerification | null) ?? null;
  if (!verification) {
    throw new Error("That security verification request could not be found.");
  }

  if (verification.action_type !== action) {
    throw new Error("That security verification code was created for a different action.");
  }

  if (!verification.verified_at) {
    throw new Error("Verify the email security code before completing this action.");
  }

  if (verification.used_at) {
    throw new Error("That security verification code has already been used.");
  }

  if (new Date(verification.expires_at).getTime() <= Date.now()) {
    throw new Error("That security verification code expired. Request a new one.");
  }

  const usedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("finance_sensitive_action_verifications")
    .update({ used_at: usedAt })
    .eq("id", verification.id)
    .eq("user_id", userId)
    .is("used_at", null);

  if (updateError) throw updateError;

  return {
    verification_id: verification.id,
    action,
    verified_at: verification.verified_at,
    used_at: usedAt,
  };
}
