import { SUPPORT_LINKS } from "@/lib/supportLinks";
import type { SensitiveActionId } from "@/lib/evaContracts";

type SensitiveActionMeta = {
  title: string;
  description: string;
  helpHref: string;
  confirmLabel: string;
};

export const SENSITIVE_ACTIONS: Record<SensitiveActionId, SensitiveActionMeta> = {
  generate_statement: {
    title: "Verify by email to generate your statement",
    description:
      "Financial statements summarize sensitive income, assets, liabilities, and spending data. EVA will send a short security code to your verified email before generating one.",
    helpHref: SUPPORT_LINKS.securityVerification,
    confirmLabel: "Verify and continue",
  },
  review_draft_transaction: {
    title: "Verify by email before approving imported transactions",
    description:
      "Approving or editing a draft transaction changes your canonical spending history. We will send a one-time security code to your verified email before continuing.",
    helpHref: SUPPORT_LINKS.securityVerification,
    confirmLabel: "Verify and approve",
  },
  receipt_forwarding: {
    title: "Verify by email to reveal your receipt inbox",
    description:
      "Receipt forwarding exposes a personal EVA inbox that turns forwarded receipts into draft transactions. We will email you a one-time code before revealing or copying it.",
    helpHref: SUPPORT_LINKS.securityVerification,
    confirmLabel: "Verify and reveal",
  },
  security_settings: {
    title: "Verify this security change by email",
    description:
      "Security-sensitive account changes require a short one-time code sent to your verified email so EVA can confirm it is really you.",
    helpHref: SUPPORT_LINKS.securityVerification,
    confirmLabel: "Verify and continue",
  },
  approve_request: {
    title: "Verify by email before approving this action",
    description:
      "Approving a proposed subscription or bill action creates a real execution record in EVA. We send a short email code first so only you can approve it.",
    helpHref: SUPPORT_LINKS.securityVerification,
    confirmLabel: "Verify and approve",
  },
};

export type { SensitiveActionId };
