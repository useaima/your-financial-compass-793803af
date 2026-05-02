import {
  BarChart3,
  CreditCard,
  PiggyBank,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

export type StepId =
  | "welcome"
  | "intent"
  | "problem"
  | "style"
  | "goal"
  | "setup"
  | "action";

export type IntentFocus =
  | "save_more"
  | "stop_overspending"
  | "understand_spending"
  | "manage_subscriptions";
export type BiggestProblem =
  | "money_disappears"
  | "category_overspend"
  | "too_many_subscriptions"
  | "inconsistent";
export type MoneyStyle =
  | "spend_without_tracking"
  | "tries_to_track"
  | "somewhat_disciplined"
  | "optimizer";
export type GuidanceStyle = "strict" | "balanced" | "passive";
export type GoalFocus =
  | "save_money"
  | "reduce_expenses"
  | "control_subscriptions"
  | "build_habits";
export type SubscriptionAwareness = "yes" | "not_sure" | "no";

export const onboardingSteps: Array<{ id: StepId; label: string }> = [
  { id: "welcome", label: "Welcome" },
  { id: "intent", label: "Intent" },
  { id: "problem", label: "Problem" },
  { id: "style", label: "Style" },
  { id: "goal", label: "Goal" },
  { id: "setup", label: "Setup" },
  { id: "action", label: "First Action" },
];

export const intentOptions: Array<{
  value: IntentFocus;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: "save_more",
    title: "Save more money",
    description: "Build more breathing room each month.",
    icon: PiggyBank,
  },
  {
    value: "stop_overspending",
    title: "Stop overspending",
    description: "Catch the habits that quietly drain cash.",
    icon: TrendingDown,
  },
  {
    value: "understand_spending",
    title: "Understand my spending",
    description: "See where your money actually goes.",
    icon: BarChart3,
  },
  {
    value: "manage_subscriptions",
    title: "Manage subscriptions",
    description: "Find the recurring costs worth cutting.",
    icon: CreditCard,
  },
];

export const problemOptions: Array<{
  value: BiggestProblem;
  title: string;
  description: string;
}> = [
  {
    value: "money_disappears",
    title: "I do not know where my money goes",
    description: "You want a clearer picture of daily spending.",
  },
  {
    value: "category_overspend",
    title: "I spend too much on certain things",
    description: "You need help spotting the categories that drift.",
  },
  {
    value: "too_many_subscriptions",
    title: "I have too many subscriptions",
    description: "Recurring costs feel harder to control than they should.",
  },
  {
    value: "inconsistent",
    title: "I cannot stay consistent",
    description: "You start tracking, then momentum fades.",
  },
];

export const moneyStyleOptions: Array<{
  value: MoneyStyle;
  title: string;
  description: string;
}> = [
  {
    value: "spend_without_tracking",
    title: "I spend without tracking",
    description: "You need fast guardrails and visibility.",
  },
  {
    value: "tries_to_track",
    title: "I try to track but fail",
    description: "You need a lighter, more consistent system.",
  },
  {
    value: "somewhat_disciplined",
    title: "I am somewhat disciplined",
    description: "You want better insights, not just reminders.",
  },
  {
    value: "optimizer",
    title: "I want to optimize",
    description: "You are ready for sharper recommendations and tradeoffs.",
  },
];

export const guidanceOptions: Array<{
  value: GuidanceStyle;
  title: string;
  description: string;
}> = [
  {
    value: "strict",
    title: "Strict",
    description: "Show me helpful nudges when I need to improve.",
  },
  {
    value: "balanced",
    title: "Balanced",
    description: "Suggest clearly, but do not overwhelm me.",
  },
  {
    value: "passive",
    title: "Passive",
    description: "Show the data and let me decide.",
  },
];

export const goalOptions: Array<{
  value: GoalFocus;
  title: string;
  description: string;
}> = [
  {
    value: "save_money",
    title: "Save money",
    description: "Create more cushion and control.",
  },
  {
    value: "reduce_expenses",
    title: "Reduce expenses",
    description: "Lower outflows that do not add enough value.",
  },
  {
    value: "control_subscriptions",
    title: "Control subscriptions",
    description: "Get recurring costs under control.",
  },
  {
    value: "build_habits",
    title: "Build better habits",
    description: "Improve consistency and decision quality.",
  },
];

export const subscriptionAwarenessOptions: Array<{
  value: SubscriptionAwareness;
  title: string;
}> = [
  { value: "yes", title: "Yes" },
  { value: "not_sure", title: "Not sure" },
  { value: "no", title: "No" },
];

export const CHAT_STARTER_STORAGE_KEY = "eva-chat-starter";
