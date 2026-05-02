import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildBootstrap,
  corsHeaders,
  requireAuthenticatedUser,
} from "../_shared/financeCore.ts";
import { EVA_MODELS, requestGatewayCompletion } from "../_shared/evaGateway.ts";
import { toIsoDate } from "../_shared/finance/utils.ts";
import type { ForecastDataPoint } from "../_shared/finance/types.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await requireAuthenticatedUser(req);
    const bootstrap = await buildBootstrap(user.id, user.email ?? null);
    const { dashboard_summary: summary, spending_events: history } = bootstrap;

    // Generate 30-day forecast data points
    const dataPoints: ForecastDataPoint[] = [];
    let currentBalance = summary.cash_balance;
    const dailyIncome = summary.monthly_income / 30;
    const dailyFixed = (summary.monthly_fixed_expenses + summary.monthly_subscription_total) / 30;

    // Calculate average daily variable spending from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSpending = history.filter(e => new Date(e.date) >= thirtyDaysAgo);
    const totalVariableSpent = recentSpending.reduce((sum, e) => sum + e.total, 0);
    const dailyVariableAverage = totalVariableSpent / 30;

    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Update balance for the day
      if (i > 0) {
        currentBalance += dailyIncome - dailyFixed - dailyVariableAverage;
      }

      dataPoints.push({
        date: toIsoDate(date),
        balance: Math.round(currentBalance * 100) / 100,
        is_projected: i > 0,
      });
    }

    // AI Analysis using Gemini 2.0 Flash
    const systemPrompt = `You are eva, a high-intelligence financial forecasting agent.
Analyze the user's financial data and the 30-day projection provided.
Provide a concise, proactive "Albert-style" forecast summary.
Focus on:
1. When they might hit a "low point" in cash.
2. If they are on track to save for their goals.
3. One specific behavioral change to improve the month-end balance.

Data Summary:
- Current Balance: $${summary.cash_balance}
- Monthly Income: $${summary.monthly_income}
- Fixed Costs: $${summary.monthly_fixed_expenses + summary.monthly_subscription_total}
- Avg Daily Variable Spending: $${dailyVariableAverage.toFixed(2)}
- Projected Balance in 30 days: $${dataPoints[29].balance}

Keep it human, encouraging, but direct. Use "you" and "your".`;

    const aiResponse = await requestGatewayCompletion({
      model: EVA_MODELS.conversation,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyze my 30-day forecast and give me the 'Albert' take." }
      ]
    });

    let aiSummary = "Your forecast looks stable. Keep logging to refine the accuracy.";
    if (aiResponse?.ok) {
      const data = await aiResponse.json();
      aiSummary = data.choices?.[0]?.message?.content || aiSummary;
    }

    return new Response(
      JSON.stringify({
        data_points: dataPoints,
        summary: aiSummary,
        metrics: {
          daily_burn_rate: dailyFixed + dailyVariableAverage,
          projected_savings: dataPoints[29].balance - summary.cash_balance,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-forecast error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
