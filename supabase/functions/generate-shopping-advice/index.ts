import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildBootstrap,
  corsHeaders,
  requireAuthenticatedUser,
} from "../_shared/financeCore.ts";
import { EVA_MODELS, requestGatewayCompletion } from "../_shared/evaGateway.ts";
import { parseGatewayJson, parseNumber, parseString } from "../_shared/finance/utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    const item = parseString(body.item, "this item");
    const price = parseNumber(body.price);
    const category = parseString(body.category, "Shopping");
    const bootstrap = await buildBootstrap(user.id, user.email ?? null);
    const summary = bootstrap.dashboard_summary;

    const fallback = {
      verdict: summary.monthly_cashflow - price > (bootstrap.profile?.target_monthly_savings ?? 0) ? "buy" : "wait",
      reasoning:
        price > 0
          ? `This would leave about $${Math.max(summary.monthly_cashflow - price, 0).toFixed(2)} of monthly cashflow after the purchase.`
          : "Share a price so EVA can compare it with your cashflow.",
      savings_tip: "If the purchase is not urgent, compare prices and check whether it fits this month's budget first.",
      competitor_hint: "Compare at least two sellers before buying.",
      impact_score: price > summary.monthly_cashflow * 0.3 ? 8 : price > summary.monthly_cashflow * 0.15 ? 5 : 2,
      beta: true,
    };

    const response = await requestGatewayCompletion({
      model: EVA_MODELS.planning,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are EVA, a warm but careful personal-finance shopping assistant. Return only JSON with keys verdict, reasoning, savings_tip, competitor_hint, impact_score, beta. Verdict must be buy, wait, or avoid. Do not provide regulated investment or credit advice.",
        },
        {
          role: "user",
          content:
            `Item: ${item}\nPrice: $${price}\nCategory: ${category}\nCash balance: $${summary.cash_balance}\nMonthly income: $${summary.monthly_income}\nFixed expenses: $${summary.monthly_fixed_expenses}\nSubscription total: $${summary.monthly_subscription_total}\nMonthly cashflow: $${summary.monthly_cashflow}\nHealth score: ${summary.health_score}\nGive a concise affordability-aware shopping verdict.`,
        },
      ],
    });

    if (!response?.ok) {
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json().catch(() => null);
    const parsed = parseGatewayJson<Record<string, unknown>>(data?.choices?.[0]?.message?.content);
    const result = {
      ...fallback,
      ...parsed,
      verdict: parsed?.verdict === "buy" || parsed?.verdict === "avoid" ? parsed.verdict : parsed?.verdict === "wait" ? "wait" : fallback.verdict,
      impact_score: Math.max(1, Math.min(10, Math.round(parseNumber(parsed?.impact_score) || fallback.impact_score))),
      beta: true,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Shopping advice failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
