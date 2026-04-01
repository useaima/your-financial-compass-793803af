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
            content: `You are a stock market analyst who tracks recommendations from top investment advisory services like Motley Fool, Seeking Alpha, and major Wall Street firms. Generate current stock investment recommendations based on real market trends and analysis as of ${new Date().toISOString().slice(0, 10)}.

Include stocks that are currently being recommended by major advisory services. For example, ASML Holdings is currently being recommended by Motley Fool. Include a mix of:
- Tech stocks (semiconductors, AI, cloud)
- Growth stocks
- Dividend stocks
- International stocks

Be specific about WHY each stock is recommended and include realistic price targets.`,
          },
          {
            role: "user",
            content: "Generate today's top stock recommendations with details on why to invest, price targets, and risk levels.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_recommendations",
              description: "Generate stock investment recommendations",
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
                        reason: { type: "string", description: "2-3 sentence explanation of why to invest" },
                        source: { type: "string", description: "Advisory source recommending this", enum: ["Motley Fool", "Seeking Alpha", "Goldman Sachs", "Morgan Stanley", "JP Morgan", "Bank of America", "Barclays"] },
                        risk_level: { type: "string", enum: ["Low", "Medium", "High"] },
                        sector: { type: "string", enum: ["Technology", "Healthcare", "Finance", "Energy", "Consumer", "Industrial", "Real Estate"] },
                      },
                      required: ["ticker", "company", "recommendation", "current_price", "target_price", "upside", "reason", "source", "risk_level", "sector"],
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
