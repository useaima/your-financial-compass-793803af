import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Subscription {
  id: string;
  name: string;
  price: number;
  billing_cycle: "monthly" | "yearly";
  category: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscriptions } = await req.json().catch(() => ({ subscriptions: [] }));

    if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
      return new Response(JSON.stringify({ error: "No subscriptions provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Calculate totals client-side to save tokens
    const totalMonthly = subscriptions.reduce((sum: number, sub: Subscription) => {
      const monthlyPrice = sub.billing_cycle === "yearly" ? sub.price / 12 : sub.price;
      return sum + monthlyPrice;
    }, 0);

    const totalYearly = subscriptions.reduce((sum: number, sub: Subscription) => {
      const yearlyPrice = sub.billing_cycle === "monthly" ? sub.price * 12 : sub.price;
      return sum + yearlyPrice;
    }, 0);

    // Calculate category breakdown
    const categoryBreakdown: Record<string, number> = {};
    subscriptions.forEach((sub: Subscription) => {
      const monthlyPrice = sub.billing_cycle === "yearly" ? sub.price / 12 : sub.price;
      categoryBreakdown[sub.category] = (categoryBreakdown[sub.category] || 0) + monthlyPrice;
    });

    // Detect overwhelm (more than 5 subscriptions or over $100/month)
    const overwhelmDetected = subscriptions.length > 5 || totalMonthly > 100;
    const overwhelmMessage = overwhelmDetected
      ? subscriptions.length > 5
        ? `You have ${subscriptions.length} active subscriptions, which may be overwhelming. Consider reviewing for redundancies.`
        : `Your monthly subscription cost ($${Math.round(totalMonthly)}) is quite high. Look for opportunities to reduce.`
      : null;

    const systemPrompt = `You are eva, a subscription analyzer. Analyze the user's subscriptions and provide recommendations.

Subscriptions Data:
${subscriptions.map((s: Subscription) => `- ${s.name}: $${s.price}/${s.billing_cycle} (${s.category})`).join("\n")}

Total Monthly: $${Math.round(totalMonthly)}
Total Yearly: $${Math.round(totalYearly)}

Provide recommendations for each subscription: "cancel" (high cost/low value), "review" (consider), or "keep" (worth it).
Consider: category, price relative to typical costs, and potential redundancy.
Return JSON with recommendations array containing: subscriptionId, action, reason, and monthly savings (if canceling).`;

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
          { role: "user", content: "Analyze my subscriptions and provide recommendations." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_subscriptions",
              description: "Analyze subscriptions and provide recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subscriptionId: { type: "string" },
                        action: { type: "string", enum: ["cancel", "review", "keep"] },
                        reason: { type: "string" },
                        savings: { type: "number" },
                      },
                      required: ["subscriptionId", "action", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_subscriptions" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let recommendations: Array<{
      subscriptionId: string;
      action: "cancel" | "review" | "keep";
      reason: string;
      savings: number;
    }> = [];

    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      recommendations = parsed.recommendations || [];
    } else {
      // Fallback: generate basic recommendations if AI doesn't return structured output
      recommendations = subscriptions.map((sub: Subscription) => ({
        subscriptionId: sub.id,
        action: "review" as const,
        reason: "Review this subscription to ensure it aligns with your current needs.",
        savings: sub.billing_cycle === "yearly" ? sub.price / 12 : sub.price,
      }));
    }

    // Calculate savings projection (total from cancel recommendations)
    const savingsProjection = {
      monthly: recommendations
        .filter((r) => r.action === "cancel")
        .reduce((sum, r) => sum + r.savings, 0),
      yearly: 0,
    };
    savingsProjection.yearly = savingsProjection.monthly * 12;

    return new Response(
      JSON.stringify({
        totalMonthly: Math.round(totalMonthly),
        totalYearly: Math.round(totalYearly),
        categoryBreakdown,
        recommendations,
        overwhelmDetected,
        overwhelmMessage,
        savingsProjection,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("analyze-subscriptions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});