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
            content: `You are a financial news curator. Generate 8 realistic trending finance news articles that would appear on major financial news sites today (${new Date().toISOString().slice(0, 10)}). Each article should feel current and relevant. Include a mix of market news, crypto, economy, and personal finance topics.`,
          },
          {
            role: "user",
            content: "Generate today's top trending finance news articles with titles, summaries, sources, and categories.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_news",
              description: "Generate trending finance news articles",
              parameters: {
                type: "object",
                properties: {
                  articles: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        summary: { type: "string", description: "2-3 sentence summary, not the full article" },
                        source: { type: "string", enum: ["Yahoo Finance", "Reuters", "Forbes", "Bloomberg", "CNBC", "MarketWatch", "The Wall Street Journal", "Financial Times"] },
                        source_url: { type: "string", description: "A plausible URL to the source site's finance section" },
                        category: { type: "string", enum: ["Markets", "Economy", "Crypto", "Personal Finance", "Tech", "Commodities", "Real Estate", "Policy"] },
                        published_ago: { type: "string", description: "e.g. '2 hours ago', '45 minutes ago'" },
                        sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                      },
                      required: ["title", "summary", "source", "source_url", "category", "published_ago", "sentiment"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["articles"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_news" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Failed to generate news" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const news = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(news), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-finance-news error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
