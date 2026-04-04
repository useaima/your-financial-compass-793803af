import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildBootstrap,
  corsHeaders,
  getPublicUserId,
} from "../_shared/publicUserData.ts";

function buildFallbackStatement(bootstrap: Awaited<ReturnType<typeof buildBootstrap>>) {
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

  const passiveIncome = assets.reduce(
    (sum, asset) => sum + Number(asset.cashflow || 0),
    0,
  );
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
      items: passiveIncome > 0
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
        ? "Your statement is based on the onboarding information and balance-sheet entries you provided. Cash flow is currently positive, which gives you room to keep building assets."
        : "Your statement is based on the onboarding information and balance-sheet entries you provided. Cash flow is currently negative, so the next priority is trimming recurring outflows or increasing income.",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { public_user_id: rawPublicUserId } = await req
      .json()
      .catch(() => ({}));
    const publicUserId = getPublicUserId(rawPublicUserId);
    const bootstrap = await buildBootstrap(publicUserId);

    if (!bootstrap.profile) {
      return new Response(
        JSON.stringify({
          error: "Finish onboarding first so eva can generate your financial statement.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (bootstrap.financial_entries.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Add at least one asset or liability so eva can build a real financial statement.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const fallbackStatement = buildFallbackStatement(bootstrap);
    const LOVABLE_API_KEY =
      Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("AI_GATEWAY_API");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify(fallbackStatement), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are eva, a financial statement generator. Use only the user's real data to generate a monthly financial statement in the style of the CASHFLOW game.

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
  .map(
    (subscription) =>
      `${subscription.name}: ${subscription.price} ${subscription.billing_cycle}`,
  )
  .join("\n") || "No subscriptions"}

Do not invent transactions, salaries, or holdings outside this data.`;

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
            content:
              "Generate my monthly CASHFLOW financial statement using the real profile, entries, and recurring costs provided.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_financial_statement",
              description:
                "Generate a CASHFLOW-style financial statement with income, expenses, assets, and liabilities",
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
                        category: {
                          type: "string",
                          enum: [
                            "tax",
                            "housing",
                            "transport",
                            "food",
                            "utilities",
                            "insurance",
                            "entertainment",
                            "debt",
                            "other",
                          ],
                        },
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
                        type: {
                          type: "string",
                          enum: ["stock", "real_estate", "business", "savings", "bond", "other"],
                        },
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
                        type: {
                          type: "string",
                          enum: [
                            "mortgage",
                            "car_loan",
                            "credit_card",
                            "student_loan",
                            "personal_loan",
                            "other",
                          ],
                        },
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
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify(fallbackStatement), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify(fallbackStatement), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statement = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(statement), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-statement error:", error);
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
