import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildBootstrap,
  corsHeaders,
  requireAuthenticatedUser,
} from "../_shared/financeCore.ts";
import { EVA_MODELS, requestGatewayCompletion } from "../_shared/evaGateway.ts";
import type { SmartSavingsChallenge } from "../_shared/finance/types.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await requireAuthenticatedUser(req);
    const bootstrap = await buildBootstrap(user.id, user.email ?? null);
    const { spending_events: history, dashboard_summary: summary } = bootstrap;

    // Get spending by category for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const categoryTotals: Record<string, number> = {};
    history.filter(e => new Date(e.date) >= thirtyDaysAgo).forEach(event => {
      event.items?.forEach(item => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
      });
    });

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, total]) => `${cat}: $${total.toFixed(2)}`);

    const systemPrompt = `You are eva, a financial optimization expert.
Based on the user's top spending categories, generate 3 specific, actionable "Smart Savings Challenges" (Albert-inspired).
Each challenge should be designed to save money over the next 30 days.

User's Top Spend (Last 30 Days):
${topCategories.join("\n")}

Monthly Cashflow: $${summary.monthly_cashflow}

Return a JSON array of SmartSavingsChallenge objects:
{
  "id": string (unique slug),
  "title": string (catchy name),
  "description": string (how to do it),
  "target_savings": number (estimated amount),
  "potential_impact": string (e.g. "High", "Medium", "Game Changer"),
  "category": string (related category),
  "action_cta": string (short button text)
}`;

    const aiResponse = await requestGatewayCompletion({
      model: EVA_MODELS.conversation,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Give me some smart savings challenges for this month." }
      ],
      response_format: { type: "json_object" }
    });

    let challenges: SmartSavingsChallenge[] = [];
    if (aiResponse?.ok) {
      const data = await aiResponse.json();
      // Handle different possible response structures from the model
      const parsed = typeof data.choices[0].message.content === 'string'
        ? JSON.parse(data.choices[0].message.content)
        : data.choices[0].message.content;
      challenges = parsed.challenges || parsed;
    }

    // Fallback challenges if AI fails
    if (challenges.length === 0) {
      challenges = [
        {
          id: "dining-detox",
          title: "Dining Out Detox",
          description: "Limit eating out to once per week. Cook at home more.",
          target_savings: 50,
          potential_impact: "Medium",
          category: "Food",
          action_cta: "I'm in"
        }
      ];
    }

    return new Response(JSON.stringify(challenges), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-savings-plan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
