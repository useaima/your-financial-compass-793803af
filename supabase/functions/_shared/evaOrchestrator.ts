import { EVA_MODELS, requestGatewayCompletion, readGatewayToolArguments } from "./evaGateway.ts";

const SPENDING_PARSE_TOOLS = [
  {
    type: "function",
    function: {
      name: "log_spending",
      description:
        "Extract spending items from the user's message. Call this when the user reports spending, expenses, or purchases.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: [
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
                  ],
                },
                amount: { type: "number" },
                description: { type: "string" },
              },
              required: ["category", "amount", "description"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
];

const CATEGORY_KEYWORDS: Array<[string, RegExp]> = [
  ["Food", /\b(lunch|dinner|breakfast|coffee|snack|meal|restaurant|takeout|food)\b/i],
  ["Groceries", /\b(grocer|supermarket|market|vegetable|fruit)\b/i],
  ["Transport", /\b(uber|taxi|bus|train|fuel|gas|transport|fare|matatu)\b/i],
  ["Entertainment", /\b(movie|cinema|netflix|spotify|concert|game|entertainment)\b/i],
  ["Shopping", /\b(shop|shopping|clothes|amazon|mall|purchase)\b/i],
  ["Bills", /\b(rent|bill|utility|electricity|water|internet|airtime|phone)\b/i],
  ["Health", /\b(pharmacy|doctor|clinic|medicine|health)\b/i],
  ["Education", /\b(book|course|tuition|school|education)\b/i],
  ["Subscriptions", /\b(subscription|plan|membership)\b/i],
  ["Personal Care", /\b(haircut|salon|barber|skincare|personal care)\b/i],
];

function inferCategory(description: string) {
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(description)) return category;
  }
  return "Other";
}

function parseNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function fallbackParseSpending(text: string) {
  const items: Array<{ category: string; amount: number; description: string }> = [];
  const primaryPattern =
    /\$?(\d+(?:\.\d{1,2})?)\s+(?:for|on)\s+([a-z0-9][^,.!?\n]*?)(?=(?:\s+(?:and|,)\s+\$?\d)|[.!?]|$)/gi;
  let match;

  while ((match = primaryPattern.exec(text)) !== null) {
    const amount = Number(match[1]);
    const description = match[2].trim();
    if (!Number.isFinite(amount) || !description) continue;
    items.push({ category: inferCategory(description), amount, description });
  }

  if (items.length > 0) {
    return items.slice(0, 5);
  }

  const secondaryPattern = /([a-z][a-z\s]{2,30}?)\s+\$?(\d+(?:\.\d{1,2})?)/gi;
  while ((match = secondaryPattern.exec(text)) !== null) {
    const description = match[1].trim();
    const amount = Number(match[2]);
    if (!Number.isFinite(amount) || !description) continue;
    items.push({ category: inferCategory(description), amount, description });
  }

  return items.slice(0, 5);
}

export async function extractSpendingItems(text: string) {
  const parsed = await readGatewayToolArguments<{
    items?: Array<{ category: string; amount: number; description: string }>;
  }>(
    {
      model: EVA_MODELS.extraction,
      messages: [
        {
          role: "system",
          content:
            "You are a spending parser. If the user's message contains spending, expenses, or purchases, use the log_spending tool to extract them. If there is no spending data, do not call the tool.",
        },
        { role: "user", content: text },
      ],
      tools: SPENDING_PARSE_TOOLS,
      tool_choice: "auto",
    },
    "log_spending",
  );

  if (parsed?.items?.length) {
    return parsed.items;
  }

  return fallbackParseSpending(text);
}

export function buildFallbackAdvice(
  lastUserMsg: string,
  parsedItems: Array<{ amount: number; category: string; description: string }>,
  todayTotal: number,
  weekTotal: number,
  financialScore: number,
  budgetWarnings: string[],
) {
  const lower = lastUserMsg.toLowerCase();

  if (parsedItems.length > 0) {
    const total = parsedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const biggest = parsedItems.reduce<{ amount: number; category: string; description: string } | null>(
      (largest, item) => {
        if (!largest || item.amount > largest.amount) return item;
        return largest;
      },
      null,
    );
    const dailyGuardrail = Math.max(15, Math.round(Math.max(0, 60 - total)));

    return [
      "## Spending captured",
      `- Logged ${parsedItems.length} item(s) for $${total.toFixed(2)}.`,
      biggest
        ? `- Biggest item: ${biggest.category} at $${Number(biggest.amount).toFixed(2)} for ${biggest.description}.`
        : `- Today's total is now $${todayTotal.toFixed(2)}.`,
      budgetWarnings.length > 0
        ? `- Budget alert: ${budgetWarnings[0]}`
        : `- Running totals: $${todayTotal.toFixed(2)} today and $${weekTotal.toFixed(2)} this week.`,
      "",
      "## What to do next",
      `- Keep the rest of today under about $${dailyGuardrail} to protect your score.`,
      "- Log your next purchase right away so eva can spot patterns before they become expensive habits.",
    ].join("\n");
  }

  if (lower.includes("daily") || lower.includes("today")) {
    return [
      "## Today's snapshot",
      `- Total logged today: $${todayTotal.toFixed(2)}.`,
      `- Current financial score: ${financialScore}/100.`,
      `- Weekly running total: $${weekTotal.toFixed(2)}.`,
      "",
      "## What to do next",
      "- Keep non-essential spending low for the rest of the day and log any new expense immediately.",
    ].join("\n");
  }

  if (lower.includes("week")) {
    return [
      "## Weekly snapshot",
      `- Total logged this week: $${weekTotal.toFixed(2)}.`,
      `- Current financial score: ${financialScore}/100.`,
      budgetWarnings.length > 0
        ? `- Priority warning: ${budgetWarnings[0]}`
        : "- Your biggest opportunity is to keep discretionary spending stable across the week.",
      "",
      "## What to do next",
      "- Review one category you can cap before the weekend and keep logging for a cleaner trend line.",
    ].join("\n");
  }

  if (lower.includes("score")) {
    return [
      "## Financial score",
      `- Current score: ${financialScore}/100.`,
      "- You improve it by logging consistently, avoiding sharp spending spikes, and staying inside category limits.",
      "",
      "## What to do next",
      "- Aim for steady daily spending and cut one non-essential purchase this week.",
    ].join("\n");
  }

  return [
    "## Quick money check",
    `- Current score: ${financialScore}/100.`,
    `- Logged today: $${todayTotal.toFixed(2)}.`,
    `- Logged this week: $${weekTotal.toFixed(2)}.`,
    "",
    "## What to do next",
    "- Tell me what you spent or ask for a daily summary, weekly review, or score breakdown.",
  ].join("\n");
}

export function buildConversationSystemPrompt(
  history: Array<{ date: string; items: unknown[]; total: number }>,
  financialScore: number,
  todayTotal: number,
  weekTotal: number,
  budgetLimits: Array<{ category: string; monthly_limit: number }>,
  budgetSpending: Record<string, number>,
) {
  const historyLines = history
    .slice(0, 60)
    .map((log) => `${log.date}: ${JSON.stringify(log.items)} (total: $${log.total})`)
    .join("\n");

  let budgetSection = "";
  if (budgetLimits.length > 0) {
    const budgetLines = budgetLimits
      .map((budget) => {
        const spent = budgetSpending[budget.category] || 0;
        const pct =
          budget.monthly_limit > 0 ? ((spent / budget.monthly_limit) * 100).toFixed(0) : "0";
        const status =
          spent > budget.monthly_limit
            ? "OVER LIMIT"
            : Number(pct) >= 80
              ? "NEAR LIMIT"
              : "OK";
        return `- ${budget.category}: $${spent.toFixed(2)} / $${budget.monthly_limit} (${pct}%) ${status}`;
      })
      .join("\n");

    budgetSection = `\n## BUDGET LIMITS (THIS MONTH)\n${budgetLines}\n\nWarn clearly when a category is near or over limit.`;
  }

  return `You are eva, a warm and concise personal finance copilot. Stay focused on the user's own finances: spending, budgets, goals, subscriptions, affordability, summaries, and financial habits. Use only the stored data provided to you.

## USER SNAPSHOT
- Financial score: ${financialScore}/100
- Today's total: $${todayTotal.toFixed(2)}
- This week's total: $${weekTotal.toFixed(2)}

## RECENT SPENDING
${historyLines || "No spending logged yet. This is a new user."}
${budgetSection}

## RULES
- Be warm, lightly conversational, and concise.
- Sound supportive and human, but do not ramble.
- Keep answers centered on the user's finances, not generic commentary.
- Use specific numbers from the data provided whenever possible.
- Start with the answer or the most useful finance takeaway.
- If the user logs spending, acknowledge the parsed amounts and then give one useful next action.
- If the user asks whether they can afford something, answer from their finances first. If the price or cadence is missing, ask one short follow-up for the amount and whether it is one-time or monthly.
- If budgets are near or over limit, surface that clearly.
- If there is not enough real data to answer confidently, say that plainly and tell the user the next best finance action.
- Do not invent transactions, balances, categories, or financial facts outside the stored data.
- If the request is outside personal finance, gently steer back to the user's financial picture.`;
}

export async function requestConversationStream(payload: {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
}) {
  return requestGatewayCompletion({
    model: EVA_MODELS.conversation,
    messages: [{ role: "system", content: payload.systemPrompt }, ...payload.messages],
    stream: true,
  });
}

type Frequency = "daily" | "weekly" | "monthly";

function getWindowStart(frequency: Frequency) {
  const since = new Date();
  if (frequency === "daily") since.setDate(since.getDate() - 1);
  else if (frequency === "weekly") since.setDate(since.getDate() - 7);
  else since.setDate(since.getDate() - 30);
  return since;
}

function getFrequencyLabel(frequency: Frequency) {
  if (frequency === "daily") return "day";
  if (frequency === "weekly") return "week";
  return "month";
}

export function buildFallbackInsights(
  frequency: Frequency,
  bootstrap: {
    spending_events?: Array<{ date: string; total: number; items: Array<{ category: string; amount: number }> }>;
  },
) {
  const since = getWindowStart(frequency);
  const relevantLogs = (bootstrap.spending_events ?? []).filter(
    (log) => new Date(log.date) >= since,
  );
  const categoryMap: Record<string, number> = {};

  for (const log of relevantLogs) {
    for (const item of Array.isArray(log.items) ? log.items : []) {
      categoryMap[item.category] = (categoryMap[item.category] || 0) + Number(item.amount || 0);
    }
  }

  const topCategories = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
  const totalSpend = topCategories.reduce((sum, item) => sum + item.amount, 0);
  const savingsOpportunity = Math.round(totalSpend * 0.1);

  return {
    frequency,
    insights: topCategories.map((item, index) => ({
      title:
        index === 0
          ? `${item.category} is leading your ${frequency} spending`
          : `${item.category} is still drawing budget attention`,
      description:
        index === 0
          ? `${item.category} accounts for the biggest share of your recent spending. If it is optional, trimming even a small portion would create faster breathing room.`
          : `Review this category before the next ${getFrequencyLabel(frequency)} closes so it does not quietly become a habit.`,
      type: index === 0 ? "warning" : index === 1 ? "tip" : "positive",
      amount: item.amount,
    })),
    top_spending_categories: topCategories.map((item) => ({
      category: item.category,
      amount: item.amount,
      percentage: totalSpend > 0 ? Math.round((item.amount / totalSpend) * 100) : 0,
    })),
    summary:
      topCategories.length > 0
        ? `Your recent ${frequency} pattern is based on ${relevantLogs.length} real spending record${relevantLogs.length === 1 ? "" : "s"}. ${topCategories[0].category} is the main pressure point right now.`
        : `You have not logged enough spending during this ${frequency} window yet for meaningful insights.`,
    savings_opportunity: savingsOpportunity,
  };
}

export async function generateInsightsWithAi(
  frequency: Frequency,
  bootstrap: {
    dashboard_summary: Record<string, number>;
    budget_limits: Array<{ category: string; monthly_limit: number }>;
    spending_events: Array<{ date: string; items: unknown[]; total: number }>;
  },
  fallbackInsights: ReturnType<typeof buildFallbackInsights>,
) {
  const systemPrompt = `You are eva, generating grounded spending insights from a canonical finance record.

User profile:
- Monthly income: ${bootstrap.dashboard_summary.monthly_income}
- Monthly fixed expenses: ${bootstrap.dashboard_summary.monthly_fixed_expenses}
- Monthly subscriptions: ${bootstrap.dashboard_summary.monthly_subscription_total}
- Cash balance: ${bootstrap.dashboard_summary.cash_balance}
- Net worth: ${bootstrap.dashboard_summary.net_worth}

Recent spending events:
${bootstrap.spending_events
  .slice(0, 40)
  .map((log) => `${log.date}: ${JSON.stringify(log.items)} (total ${log.total})`)
  .join("\n")}

Budget limits:
${bootstrap.budget_limits.map((budget) => `${budget.category}: ${budget.monthly_limit}`).join("\n") || "None"}

Use only the data provided. Do not invent categories, balances, or transactions.`;

  const generated = await readGatewayToolArguments<{
    frequency: string;
    insights: Array<{ title: string; description: string; type: string; amount?: number }>;
    top_spending_categories: Array<{ category: string; amount: number; percentage: number }>;
    summary: string;
    savings_opportunity: number;
  }>(
    {
      model: EVA_MODELS.planning,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate my ${frequency} spending insights with categories, savings opportunities, and an action-oriented summary.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_insights",
            description: "Generate spending insights with categories and recommendations",
            parameters: {
              type: "object",
              properties: {
                frequency: { type: "string" },
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      type: {
                        type: "string",
                        enum: ["positive", "negative", "warning", "tip"],
                      },
                      amount: { type: "number" },
                    },
                    required: ["title", "description", "type"],
                    additionalProperties: false,
                  },
                },
                top_spending_categories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      amount: { type: "number" },
                      percentage: { type: "number" },
                    },
                    required: ["category", "amount", "percentage"],
                    additionalProperties: false,
                  },
                },
                summary: { type: "string" },
                savings_opportunity: { type: "number" },
              },
              required: [
                "frequency",
                "insights",
                "top_spending_categories",
                "summary",
                "savings_opportunity",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_insights" } },
    },
    "generate_insights",
  );

  return generated ?? fallbackInsights;
}

export function buildFallbackStatement(bootstrap: {
  dashboard_summary: DashboardSummary;
  financial_entries: Array<{
    entry_type: string;
    name: string;
    type: string;
    value: number;
    cashflow: number;
    balance: number;
    payment: number;
    description?: string | null;
  }>;
  subscriptions: Array<{
    is_active: boolean;
    name: string;
    price: number;
    billing_cycle: "monthly" | "yearly";
  }>;
}) {
  const income = bootstrap.dashboard_summary.monthly_income;
  const subscriptions = bootstrap.subscriptions
    .filter((subscription) => subscription.is_active)
    .map((subscription) => ({
      name: subscription.name,
      amount:
        subscription.billing_cycle === "yearly"
          ? Number(subscription.price) / 12
          : Number(subscription.price),
      category: "other",
    }));
  const expenses = [
    {
      name: "Fixed monthly expenses",
      amount: bootstrap.dashboard_summary.monthly_fixed_expenses,
      category: "housing",
    },
    ...subscriptions,
  ];
  const assets = bootstrap.financial_entries
    .filter((entry) => entry.entry_type === "asset")
    .map((entry) => ({
      name: entry.name,
      type: entry.type,
      value: Number(entry.value),
      cashflow: Number(entry.cashflow),
      description: entry.description || "",
    }));
  const liabilities = bootstrap.financial_entries
    .filter((entry) => entry.entry_type === "liability")
    .map((entry) => ({
      name: entry.name,
      type: entry.type,
      balance: Number(entry.balance),
      payment: Number(entry.payment),
      description: entry.description || "",
    }));

  const passiveIncome = assets.reduce((sum, asset) => sum + Number(asset.cashflow || 0), 0);
  const liabilityPayments = liabilities.reduce(
    (sum, liability) => sum + Number(liability.payment || 0),
    0,
  );
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalIncome = income + passiveIncome;
  const monthlyCashflow = totalIncome - totalExpenses - liabilityPayments;

  return {
    income: {
      salary: income,
      items:
        passiveIncome > 0
          ? [
              {
                name: "Passive income",
                amount: passiveIncome,
                description: "Derived from the assets you entered",
              },
            ]
          : [],
    },
    expenses,
    assets,
    liabilities,
    passive_income: passiveIncome,
    total_income: totalIncome,
    total_expenses: totalExpenses + liabilityPayments,
    monthly_cashflow: monthlyCashflow,
    summary:
      monthlyCashflow >= 0
        ? "Your statement is based on the real profile and balance-sheet data in eva. Cash flow is currently positive, which gives you room to keep building assets."
        : "Your statement is based on the real profile and balance-sheet data in eva. Cash flow is currently negative, so the next priority is trimming recurring outflows or increasing income.",
  };
}

export async function generateStatementWithAi(
  bootstrap: {
    dashboard_summary: DashboardSummary;
    goals: Array<{ name: string; current_amount: number; target_amount: number; deadline: string }>;
    financial_entries: Array<{
      entry_type: string;
      name: string;
      type: string;
      value: number;
      balance: number;
      cashflow: number;
      payment: number;
    }>;
    subscriptions: Array<{ name: string; price: number; billing_cycle: "monthly" | "yearly" }>;
  },
  fallbackStatement: ReturnType<typeof buildFallbackStatement>,
) {
  const systemPrompt = `You are eva, a financial statement generator. Use only the canonical finance record to generate a monthly CASHFLOW-style statement.

Profile:
- Monthly income: ${bootstrap.dashboard_summary.monthly_income}
- Monthly fixed expenses: ${bootstrap.dashboard_summary.monthly_fixed_expenses}
- Cash balance: ${bootstrap.dashboard_summary.cash_balance}
- Monthly subscriptions: ${bootstrap.dashboard_summary.monthly_subscription_total}

Goals:
${bootstrap.goals
  .map((goal) => `${goal.name}: ${goal.current_amount}/${goal.target_amount} due ${goal.deadline}`)
  .join("\n") || "No goals entered"}

Assets and liabilities:
${bootstrap.financial_entries
  .map(
    (entry) =>
      `${entry.entry_type}: ${entry.name}, type=${entry.type}, value=${entry.value}, balance=${entry.balance}, cashflow=${entry.cashflow}, payment=${entry.payment}`,
  )
  .join("\n")}

Subscriptions:
${bootstrap.subscriptions
  .map((subscription) => `${subscription.name}: ${subscription.price} ${subscription.billing_cycle}`)
  .join("\n") || "No subscriptions"}

Do not invent transactions, salaries, or holdings outside this data.`;

  const generated = await readGatewayToolArguments<{
    income: { salary: number; items: Array<{ name: string; amount: number; description?: string }> };
    expenses: Array<{ name: string; amount: number; category: string }>;
    assets: Array<{ name: string; type: string; value: number; cashflow: number; description?: string }>;
    liabilities: Array<{ name: string; type: string; balance: number; payment: number; description?: string }>;
    passive_income: number;
    total_income: number;
    total_expenses: number;
    monthly_cashflow: number;
    summary: string;
  }>(
    {
      model: EVA_MODELS.planning,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "Generate my monthly CASHFLOW financial statement using the real profile, entries, and recurring costs provided.",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_financial_statement",
            description: "Generate a CASHFLOW-style financial statement",
            parameters: {
              type: "object",
              properties: {
                income: {
                  type: "object",
                  properties: {
                    salary: { type: "number" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          amount: { type: "number" },
                          description: { type: "string" },
                        },
                        required: ["name", "amount"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["salary", "items"],
                  additionalProperties: false,
                },
                expenses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      amount: { type: "number" },
                      category: { type: "string" },
                    },
                    required: ["name", "amount", "category"],
                    additionalProperties: false,
                  },
                },
                assets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string" },
                      value: { type: "number" },
                      cashflow: { type: "number" },
                      description: { type: "string" },
                    },
                    required: ["name", "type", "value", "cashflow"],
                    additionalProperties: false,
                  },
                },
                liabilities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string" },
                      balance: { type: "number" },
                      payment: { type: "number" },
                      description: { type: "string" },
                    },
                    required: ["name", "type", "balance", "payment"],
                    additionalProperties: false,
                  },
                },
                passive_income: { type: "number" },
                total_income: { type: "number" },
                total_expenses: { type: "number" },
                monthly_cashflow: { type: "number" },
                summary: { type: "string" },
              },
              required: [
                "income",
                "expenses",
                "assets",
                "liabilities",
                "passive_income",
                "total_income",
                "total_expenses",
                "monthly_cashflow",
                "summary",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "generate_financial_statement" },
      },
    },
    "generate_financial_statement",
  );

  if (!generated) {
    return fallbackStatement;
  }

  const incomeItems = Array.isArray(generated.income?.items) && generated.income.items.length > 0
    ? generated.income.items
    : fallbackStatement.income.items;
  const expenses = Array.isArray(generated.expenses) && generated.expenses.length > 0
    ? generated.expenses
    : fallbackStatement.expenses;
  const assets = Array.isArray(generated.assets) && generated.assets.length > 0
    ? generated.assets
    : fallbackStatement.assets;
  const liabilities = Array.isArray(generated.liabilities) && generated.liabilities.length > 0
    ? generated.liabilities
    : fallbackStatement.liabilities;
  const passiveIncome = Number.isFinite(generated.passive_income)
    ? generated.passive_income
    : fallbackStatement.passive_income;
  const totalIncome = Number.isFinite(generated.total_income)
    ? generated.total_income
    : fallbackStatement.total_income;
  const totalExpenses = Number.isFinite(generated.total_expenses)
    ? generated.total_expenses
    : fallbackStatement.total_expenses;
  const monthlyCashflow = Number.isFinite(generated.monthly_cashflow)
    ? generated.monthly_cashflow
    : fallbackStatement.monthly_cashflow;
  const summary = typeof generated.summary === "string" && generated.summary.trim().length > 0
    ? generated.summary
    : fallbackStatement.summary;

  return {
    income: {
      salary: Number.isFinite(generated.income?.salary)
        ? generated.income.salary
        : fallbackStatement.income.salary,
      items: incomeItems,
    },
    expenses,
    assets,
    liabilities,
    passive_income: passiveIncome,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    monthly_cashflow: monthlyCashflow,
    summary,
  };
}
