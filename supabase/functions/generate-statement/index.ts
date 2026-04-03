import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are eva, a financial statement generator. Based on the user's financial data, generate a comprehensive monthly financial statement in the style of the CASHFLOW board game by Robert Kiyosaki.

User's Financial Data:
- Monthly Salary Income: ~$7,700 (two paychecks)
- Freelance Income: ~$600/month average
- Total Monthly Income: ~$8,300
- Monthly Expenses breakdown: Food & Dining (~$280), Transport (~$120), Entertainment (~$60), Shopping (~$200), Bills & Utilities (~$2,800), Health (~$80), Education (~$35)
- Total Monthly Expenses: ~$5,800
- Total Balance/Cash: $14,847
- Savings Rate: ~30%
- Active goals: Emergency Fund ($9,600/$15,000), New Laptop ($1,408/$2,200), Vacation ($1,750/$5,000), Investment Portfolio ($3,200/$10,000)

Generate realistic but educational financial data that teaches about assets generating income vs liabilities creating expenses, following Rich Dad principles.`;

function buildFallbackStatement() {
  return {
    income: {
      salary: 7700,
      items: [
        {
          name: "Freelance Projects",
          amount: 600,
          description: "Average side income from client work",
        },
      ],
    },
    expenses: [
      { name: "Housing & Utilities", amount: 2800, category: "housing" },
      { name: "Food & Dining", amount: 280, category: "food" },
      { name: "Transport", amount: 120, category: "transport" },
      { name: "Entertainment", amount: 60, category: "entertainment" },
      { name: "Shopping", amount: 200, category: "other" },
      { name: "Health", amount: 80, category: "insurance" },
      { name: "Education", amount: 35, category: "other" },
      { name: "Taxes & Payroll Deductions", amount: 2225, category: "tax" },
    ],
    assets: [
      {
        name: "Emergency Savings",
        type: "savings",
        value: 9600,
        cashflow: 35,
        description: "High-yield cash reserve",
      },
      {
        name: "Dividend ETF Portfolio",
        type: "stock",
        value: 3200,
        cashflow: 85,
        description: "Long-term income portfolio",
      },
      {
        name: "Laptop Side-Hustle Kit",
        type: "business",
        value: 2200,
        cashflow: 200,
        description: "Tools that support freelance revenue",
      },
    ],
    liabilities: [
      {
        name: "Credit Card Balance",
        type: "credit_card",
        balance: 1450,
        payment: 120,
        description: "Short-term revolving balance",
      },
      {
        name: "Laptop Installment",
        type: "personal_loan",
        balance: 1800,
        payment: 95,
        description: "Equipment financing for work tools",
      },
    ],
    passive_income: 320,
    total_income: 8620,
    total_expenses: 5800,
    monthly_cashflow: 2820,
    summary:
      "Your cash flow is positive, but most income still depends on active work. The strongest next move is to keep liabilities modest while growing assets that produce recurring income each month.",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const fallbackStatement = buildFallbackStatement();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("AI_GATEWAY_API");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify(fallbackStatement), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: "Generate my monthly CASHFLOW financial statement with realistic data based on my profile. Include income sources, expense items, assets with cash flow, and liabilities with payments." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_financial_statement",
              description: "Generate a CASHFLOW-style financial statement with income, expenses, assets, and liabilities",
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
                        category: { type: "string", enum: ["tax", "housing", "transport", "food", "utilities", "insurance", "entertainment", "debt", "other"] },
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
                        type: { type: "string", enum: ["stock", "real_estate", "business", "savings", "bond", "other"] },
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
                        type: { type: "string", enum: ["mortgage", "car_loan", "credit_card", "student_loan", "personal_loan", "other"] },
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
                required: ["income", "expenses", "assets", "liabilities", "passive_income", "total_income", "total_expenses", "monthly_cashflow", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_financial_statement" } },
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
  } catch (e) {
    console.error("generate-statement error:", e);
    return new Response(JSON.stringify(buildFallbackStatement()), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
