export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "India",
  "Brazil",
  "Japan",
  "South Korea",
  "Nigeria",
  "South Africa",
  "Kenya",
  "Ghana",
  "Mexico",
  "Singapore",
  "Netherlands",
  "Sweden",
  "Switzerland",
  "Spain",
  "Italy",
  "Portugal",
  "Ireland",
  "New Zealand",
  "Argentina",
  "Colombia",
  "Chile",
  "UAE",
  "Saudi Arabia",
  "Egypt",
] as const;

export const USER_TYPES = [
  { value: "personal", label: "Personal" },
  { value: "business", label: "Business" },
] as const;

export const BUDGETING_FOCUS_OPTIONS = [
  "Build an emergency cushion",
  "Reduce unnecessary spending",
  "Pay down debt",
  "Grow investments",
  "Stabilize business cash flow",
] as const;

export const GOAL_ICONS = ["🎯", "🛟", "🏡", "💻", "✈️", "📈", "🚗", "🎓"] as const;

export const SUBSCRIPTION_CATEGORIES = [
  "Entertainment",
  "Productivity",
  "Cloud Services",
  "Gaming",
  "News & Media",
  "Health & Fitness",
  "Education",
  "Other",
] as const;

export type SpendingCategory =
  | "Food"
  | "Transport"
  | "Entertainment"
  | "Shopping"
  | "Bills"
  | "Health"
  | "Education"
  | "Subscriptions"
  | "Groceries"
  | "Personal Care"
  | "Other";

export const SPENDING_CATEGORIES: SpendingCategory[] = [
  "Food",
  "Transport",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Subscriptions",
  "Groceries",
  "Personal Care",
  "Other",
];

export const SPENDING_CATEGORY_COLORS: Record<SpendingCategory, string> = {
  Food: "hsl(37 90% 53%)",
  Transport: "hsl(28 73% 38%)",
  Entertainment: "hsl(5 47% 49%)",
  Shopping: "hsl(29 25% 55%)",
  Bills: "hsl(357 20% 36%)",
  Health: "hsl(18 58% 45%)",
  Education: "hsl(43 70% 56%)",
  Subscriptions: "hsl(30 41% 32%)",
  Groceries: "hsl(36 82% 58%)",
  "Personal Care": "hsl(20 42% 40%)",
  Other: "hsl(29 18% 45%)",
};

export const SPENDING_CATEGORY_ICONS: Record<SpendingCategory, string> = {
  Food: "🍽️",
  Transport: "🚗",
  Entertainment: "🎬",
  Shopping: "🛍️",
  Bills: "💡",
  Health: "💊",
  Education: "📚",
  Subscriptions: "🔁",
  Groceries: "🛒",
  "Personal Care": "🧴",
  Other: "🧾",
};

export const BUDGET_LIMIT_CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Subscriptions",
  "Groceries",
  "Personal Care",
  "Other",
] as const;

export const EMPTY_DASHBOARD_SUMMARY = {
  cash_balance: 0,
  total_assets: 0,
  total_liabilities: 0,
  net_worth: 0,
  monthly_income: 0,
  monthly_fixed_expenses: 0,
  monthly_subscription_total: 0,
  monthly_cashflow: 0,
  savings_rate: 0,
  health_score: 50,
  spending_this_month: 0,
  latest_spending_date: null as string | null,
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyDetailed(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}
