import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildFallbackInsights(frequency: string) {
  const multipliers: Record<string, number> = {
    daily: 1 / 30,
    weekly: 1 / 4.3,
    monthly: 1,
  };

  const multiplier = multipliers[frequency] ?? 1;
  const scaled = (value: number) => Math.max(1, Math.round(value * multiplier));
  const categories = [
    { category: "Bills & Utilities", amount: scaled(2800), percentage: 48 },
    { category: "Food", amount: scaled(280), percentage: 28 },
    { category: "Shopping", amount: scaled(200), percentage: 15 },
    { category: "Transport", amount: scaled(120), percentage: 9 },
  ];

  const savingsOpportunity =
    frequency === "daily" ? 18 : frequency === "weekly" ? 95 : 410;

  return {
    frequency,
    insights: [
      {
        title: "Essentials dominate your plan",
        description: `${frequency[0].toUpperCase() + frequency.slice(1)} spending is still led by bills and utilities, which keeps most of your budget in predictable categories.`,
        type: "positive",
        amount: categories[0].amount,
      },
      {
        title: "Shopping is the easiest trim",
        description: "Variable purchases remain the cleanest place to create breathing room without disrupting core needs.",
        type: "warning",
        amount: frequency === "daily" ? 7 : frequency === "weekly" ? 47 : 200,
      },
      {
        title: "Transport is stable",
        description: "Transport costs are relatively controlled, which gives you room to focus on discretionary categories instead.",
        type: "tip",
        amount: categories[3].amount,
      },
      {
        title: "Savings pace is healthy",
        description: "You are still tracking near a 30% savings rate, which is strong for this spending profile.",
        type: "positive",
        amount: frequency === "daily" ? 83 : frequency === "weekly" ? 581 : 2490,
      },
    ],
    top_spending_categories: categories,
    summary: `Your ${frequency} spending pattern is stable, with essentials taking the biggest share and shopping offering the clearest short-term savings opportunity. If you keep discretionary purchases controlled, you preserve a strong savings rate without changing fixed commitments.`,
    savings_opportunity: savingsOpportunity,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frequency = "monthly" } = await req.json().catch(() => ({}));
    const fallbackInsights = buildFallbackInsights(frequency);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("AI_GATEWAY_API");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify(fallbackInsights), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are eva, a spending insights generator. Based on the user's financial profile, generate ${frequency} spending insights.

User's Financial Data:
- Monthly Salary Income: ~$7,700
- Freelance Income: ~$600/month
- Monthly Expenses: Food ($280), Transport ($120), Entertainment ($60), Shopping ($200), Bills & Utilities ($2,800), Health ($80), Education ($35)
- Total Monthly Expenses: ~$5,800
- Savings Rate: ~30%

Generate insightful, actionable ${frequency} spending analysis with specific recommendations.`;

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
          { role: "user", content: `Generate my ${frequency} spending insights with categories, tips, and savings opportunities.` },
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
                        type: { type: "string", enum: ["positive", "negative", "warning", "tip"] },
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
                required: ["frequency", "insights", "top_spending_categories", "summary", "savings_opportunity"],
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
  } catch (e) {
    console.error("generate-insights error:", e);
    const fallbackInsights = buildFallbackInsights("monthly");
    return new Response(JSON.stringify(fallbackInsights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
