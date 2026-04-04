import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildBootstrap,
  corsHeaders,
  getPublicUserId,
} from "../_shared/publicUserData.ts";

type Frequency = "daily" | "weekly" | "monthly";

function getWindowStart(frequency: Frequency) {
  const since = new Date();
  if (frequency === "daily") {
    since.setDate(since.getDate() - 1);
  } else if (frequency === "weekly") {
    since.setDate(since.getDate() - 7);
  } else {
    since.setDate(since.getDate() - 30);
  }
  return since;
}

function getFrequencyLabel(frequency: Frequency) {
  if (frequency === "daily") return "day";
  if (frequency === "weekly") return "week";
  return "month";
}

function buildFallbackInsights(frequency: Frequency, bootstrap: Awaited<ReturnType<typeof buildBootstrap>>) {
  const since = getWindowStart(frequency);
  const relevantLogs = bootstrap.spending_logs.filter(
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
          ? `${item.category} accounts for the biggest share of your recent spending. If it is optional, trimming even a small portion of it would create faster breathing room.`
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
        ? `Your recent ${frequency} pattern is based on ${relevantLogs.length} real spending log${relevantLogs.length === 1 ? "" : "s"}. ${topCategories[0].category} is the main pressure point right now, and your best near-term win is to keep that category controlled.`
        : `You have not logged enough spending during this ${frequency} window yet for meaningful insights.`,
    savings_opportunity: savingsOpportunity,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frequency = "monthly", public_user_id: rawPublicUserId } = await req
      .json()
      .catch(() => ({}));
    const publicUserId = getPublicUserId(rawPublicUserId);
    const safeFrequency = (["daily", "weekly", "monthly"].includes(frequency)
      ? frequency
      : "monthly") as Frequency;
    const bootstrap = await buildBootstrap(publicUserId);

    if (bootstrap.spending_logs.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Log some spending first so eva can generate real insights.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const fallbackInsights = buildFallbackInsights(safeFrequency, bootstrap);
    const LOVABLE_API_KEY =
      Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("AI_GATEWAY_API");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify(fallbackInsights), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are eva, a spending insights generator. Use only the user's real stored finance data.

User profile:
- Monthly income: ${bootstrap.dashboard_summary.monthly_income}
- Monthly fixed expenses: ${bootstrap.dashboard_summary.monthly_fixed_expenses}
- Monthly subscriptions: ${bootstrap.dashboard_summary.monthly_subscription_total}
- Cash balance: ${bootstrap.dashboard_summary.cash_balance}
- Net worth: ${bootstrap.dashboard_summary.net_worth}

Recent spending logs:
${bootstrap.spending_logs
  .slice(0, 40)
  .map((log) => `${log.date}: ${JSON.stringify(log.items)} (total ${log.total})`)
  .join("\n")}

Budget limits:
${bootstrap.budget_limits
  .map((budget) => `${budget.category}: ${budget.monthly_limit}`)
  .join("\n") || "None"}

Generate ${safeFrequency} insights grounded only in this data. Do not invent categories, balances, or transactions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate my ${safeFrequency} spending insights with categories, savings opportunities, and an action-oriented summary.`,
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
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify(fallbackInsights), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify(fallbackInsights), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insights = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-insights error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
