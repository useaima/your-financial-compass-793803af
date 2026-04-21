import { buildSettingsHref } from "@/lib/appPreferences";
import { SUPPORT_LINKS } from "@/lib/supportLinks";

export type SensitiveActionId =
  | "generate_statement"
  | "review_draft_transaction"
  | "receipt_forwarding"
  | "security_settings";

type SensitiveActionMeta = {
  title: string;
  description: string;
  settingsHref: string;
  helpHref: string;
  buttonLabel: string;
};

export const SENSITIVE_ACTIONS: Record<SensitiveActionId, SensitiveActionMeta> = {
  generate_statement: {
    title: "Protect statement generation with MFA",
    description:
      "Financial statements summarize sensitive income, assets, liabilities, and spending data. Enable MFA before generating one so eva can step this action up safely.",
    settingsHref: buildSettingsHref("account"),
    helpHref: SUPPORT_LINKS.mfaSecurity,
    buttonLabel: "Open security settings",
  },
  review_draft_transaction: {
    title: "Use MFA before approving imported transactions",
    description:
      "Approving or editing a draft transaction changes your canonical spending history. Enable MFA first so imports and reviews stay safer.",
    settingsHref: buildSettingsHref("account"),
    helpHref: SUPPORT_LINKS.mfaSecurity,
    buttonLabel: "Enable MFA first",
  },
  receipt_forwarding: {
    title: "Protect receipt forwarding with MFA",
    description:
      "Receipt forwarding exposes a personal finance-ingestion address. Enable MFA before using or copying it so only you can turn forwarded receipts into draft transactions.",
    settingsHref: buildSettingsHref("account"),
    helpHref: SUPPORT_LINKS.mfaSecurity,
    buttonLabel: "Secure my account",
  },
  security_settings: {
    title: "Confirm your account security with MFA",
    description:
      "Security-sensitive account changes should be completed with an extra factor enabled so your eva workspace stays protected.",
    settingsHref: buildSettingsHref("account"),
    helpHref: SUPPORT_LINKS.mfaSecurity,
    buttonLabel: "Go to account security",
  },
};
