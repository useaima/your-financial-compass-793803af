import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const today = new Date().toISOString().slice(0, 10);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a stock market analyst who closely follows Motley Fool Stock Advisor and Rule Breakers newsletters, as well as recommendations from top Wall Street firms. Generate current stock investment recommendations as of ${today}.

CRITICAL: You MUST include stocks that Motley Fool is currently recommending or has recently recommended in their Stock Advisor newsletter. Key current Motley Fool picks include:
- ASML Holdings (ASML) — Motley Fool Stock Advisor recommendation, monopoly in EUV lithography
- Nvidia (NVDA) — Motley Fool Stock Advisor, AI chip leader
- MercadoLibre (MELI) — Motley Fool recommendation, Latin America e-commerce leader
- CrowdStrike (CRWD) — Motley Fool recommendation, cybersecurity leader
- Amazon (AMZN) — Long-standing Motley Fool recommendation

Also include picks from Goldman Sachs, Morgan Stanley, JP Morgan, and Barclays research.

Provide a diverse mix:
- At least 3 Motley Fool Stock Advisor picks
- 2-3 Wall Street analyst picks
- Mix of sectors: Tech, Healthcare, Finance, Consumer, Industrial
- Mix of risk levels: Low, Medium, High
- Include both growth and value stocks

For Motley Fool picks, mention specific newsletter context (e.g., "Recently recommended in Motley Fool Stock Advisor" or "Long-time Motley Fool Rule Breakers pick"). Be specific about investment thesis and catalysts.`,
          },
          {
            role: "user",
            content: `Generate today's top stock recommendations. Prioritize current Motley Fool Stock Advisor picks alongside Wall Street analyst recommendations. Include specific price targets and investment rationale.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_recommendations",
              description: "Generate stock investment recommendations synced with Motley Fool newsletters and Wall Street research",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ticker: { type: "string", description: "Stock ticker symbol e.g. ASML" },
                        company: { type: "string", description: "Full company name" },
                        recommendation: { type: "string", enum: ["Strong Buy", "Buy", "Hold"] },
                        current_price: { type: "string", description: "Approximate current price" },
                        target_price: { type: "string", description: "12-month price target" },
                        upside: { type: "string", description: "Potential upside percentage" },
                        reason: { type: "string", description: "3-4 sentence explanation including specific catalysts, newsletter context, and why to invest now" },
                        source: { type: "string", enum: ["Motley Fool Stock Advisor", "Motley Fool Rule Breakers", "Seeking Alpha", "Goldman Sachs", "Morgan Stanley", "JP Morgan", "Bank of America", "Barclays"] },
                        risk_level: { type: "string", enum: ["Low", "Medium", "High"] },
                        sector: { type: "string", enum: ["Technology", "Healthcare", "Finance", "Energy", "Consumer", "Industrial", "Real Estate"] },
                        newsletter_note: { type: "string", description: "For Motley Fool picks: specific newsletter context like 'Active Stock Advisor pick since 2023' or 'Recently added to Rule Breakers'" },
                      },
                      required: ["ticker", "company", "recommendation", "current_price", "target_price", "upside", "reason", "source", "risk_level", "sector"],
                      additionalProperties: false,
                    },
                  },
                  market_pulse: {
                    type: "string",
                    description: "Brief 1-2 sentence market overview for today",
                  },
                  motley_fool_focus: {
                    type: "string",
                    description: "What Motley Fool newsletters are currently highlighting as key themes",
                  },
                },
                required: ["recommendations", "market_pulse", "motley_fool_focus"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Failed to generate recommendations" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recs = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(recs), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stock-recommendations error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
