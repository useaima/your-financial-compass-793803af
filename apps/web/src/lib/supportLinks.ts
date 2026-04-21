export const SUPPORT_BASE_URL = "https://support.useaima.com";

export type SupportArticleId =
  | "create-account"
  | "verify-email"
  | "verification-options"
  | "onboarding"
  | "onboarding-recovery"
  | "log-spend"
  | "history-mismatch"
  | "csv-import"
  | "forward-receipts"
  | "budget-limits"
  | "goals"
  | "financial-statement"
  | "statement-errors"
  | "insights"
  | "change-profile"
  | "sign-out"
  | "mfa-security"
  | "offline"
  | "performance";

export function buildSupportArticleUrl(articleId: SupportArticleId) {
  return `${SUPPORT_BASE_URL}/articles/${articleId}`;
}

export const SUPPORT_LINKS = {
  verifyEmail: buildSupportArticleUrl("verify-email"),
  verificationOptions: buildSupportArticleUrl("verification-options"),
  onboarding: buildSupportArticleUrl("onboarding"),
  onboardingRecovery: buildSupportArticleUrl("onboarding-recovery"),
  logSpend: buildSupportArticleUrl("log-spend"),
  historyMismatch: buildSupportArticleUrl("history-mismatch"),
  csvImport: buildSupportArticleUrl("csv-import"),
  forwardReceipts: buildSupportArticleUrl("forward-receipts"),
  financialStatement: buildSupportArticleUrl("financial-statement"),
  statementErrors: buildSupportArticleUrl("statement-errors"),
  insights: buildSupportArticleUrl("insights"),
  profile: buildSupportArticleUrl("change-profile"),
  mfaSecurity: buildSupportArticleUrl("mfa-security"),
  offline: buildSupportArticleUrl("offline"),
  performance: buildSupportArticleUrl("performance"),
} as const;
