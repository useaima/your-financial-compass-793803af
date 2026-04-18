export const SUPPORT_BASE_URL = "https://support.useaima.com";

export type SupportArticleId =
  | "create-account"
  | "verify-email"
  | "onboarding"
  | "log-spend"
  | "history-mismatch"
  | "csv-import"
  | "forward-receipts"
  | "budget-limits"
  | "goals"
  | "financial-statement"
  | "insights"
  | "change-profile"
  | "sign-out"
  | "offline"
  | "performance";

export function buildSupportArticleUrl(articleId: SupportArticleId) {
  return `${SUPPORT_BASE_URL}/articles/${articleId}`;
}

export const SUPPORT_LINKS = {
  verifyEmail: buildSupportArticleUrl("verify-email"),
  onboarding: buildSupportArticleUrl("onboarding"),
  logSpend: buildSupportArticleUrl("log-spend"),
  historyMismatch: buildSupportArticleUrl("history-mismatch"),
  csvImport: buildSupportArticleUrl("csv-import"),
  forwardReceipts: buildSupportArticleUrl("forward-receipts"),
  financialStatement: buildSupportArticleUrl("financial-statement"),
  insights: buildSupportArticleUrl("insights"),
  profile: buildSupportArticleUrl("change-profile"),
  offline: buildSupportArticleUrl("offline"),
  performance: buildSupportArticleUrl("performance"),
} as const;
