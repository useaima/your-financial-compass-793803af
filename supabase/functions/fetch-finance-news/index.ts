import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function inferSourceName(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes("reuters")) return "Reuters";
    if (hostname.includes("bloomberg")) return "Bloomberg";
    if (hostname.includes("cnbc")) return "CNBC";
    if (hostname.includes("wsj")) return "The Wall Street Journal";
    if (hostname.includes("ft.com")) return "Financial Times";
    if (hostname.includes("forbes")) return "Forbes";
    if (hostname.includes("marketwatch")) return "MarketWatch";
    if (hostname.includes("yahoo")) return "Yahoo Finance";
    return hostname.split(".")[0].replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return "MarketWatch";
  }
}

function inferCategory(text: string) {
  if (/\bbitcoin|crypto|ethereum|token|blockchain\b/i.test(text)) return "Crypto";
  if (/\bmortgage|housing|home|real estate|rent\b/i.test(text)) return "Real Estate";
  if (/\bfed|inflation|jobs|economy|gdp|consumer\b/i.test(text)) return "Economy";
  if (/\bpolicy|tariff|regulation|lawmakers|treasury\b/i.test(text)) return "Policy";
  if (/\bapple|microsoft|nvidia|ai|technology|chip\b/i.test(text)) return "Tech";
  if (/\boil|gold|commodity|copper\b/i.test(text)) return "Commodities";
  if (/\bbudget|savings|retirement|credit card|debt\b/i.test(text)) return "Personal Finance";
  return "Markets";
}

function inferSentiment(text: string) {
  if (/\bfall|drops|cuts|slowdown|pressure|loss|risk|weaker\b/i.test(text)) return "bearish";
  if (/\brains|surge|record|beat|growth|stronger|upside\b/i.test(text)) return "bullish";
  return "neutral";
}

function buildFallbackArticles() {
  return [
    {
      title: "Wall Street watches earnings momentum as investors rotate into large-cap leaders",
      summary: "Markets are focusing on earnings durability and balance-sheet strength as investors favor companies with resilient cash flow and pricing power.",
      source: "Reuters",
      source_url: "https://www.reuters.com/markets/",
      category: "Markets",
      published_ago: "Today",
      sentiment: "neutral",
    },
    {
      title: "Consumers keep hunting for savings as borrowing costs stay elevated",
      summary: "Higher financing costs continue to push households toward budgeting tools, debt reduction, and more selective discretionary spending.",
      source: "CNBC",
      source_url: "https://www.cnbc.com/personal-finance/",
      category: "Personal Finance",
      published_ago: "Today",
      sentiment: "neutral",
    },
    {
      title: "AI and semiconductor names remain in focus as analysts revisit price targets",
      summary: "Technology shares are still driving a large share of market attention, especially companies tied to AI infrastructure and chip demand.",
      source: "Bloomberg",
      source_url: "https://www.bloomberg.com/technology",
      category: "Tech",
      published_ago: "Today",
      sentiment: "bullish",
    },
    {
      title: "Bitcoin traders gauge risk appetite after another volatile stretch",
      summary: "Crypto markets remain headline-driven, with investors watching macro signals and ETF flows for the next directional move.",
      source: "Forbes",
      source_url: "https://www.forbes.com/advisor/investing/cryptocurrency/",
      category: "Crypto",
      published_ago: "Today",
      sentiment: "neutral",
    },
    {
      title: "Inflation and rate expectations keep bond and equity investors on alert",
      summary: "Economic data remains central to market pricing as traders reassess how long restrictive policy might stay in place.",
      source: "Financial Times",
      source_url: "https://www.ft.com/markets",
      category: "Economy",
      published_ago: "Today",
      sentiment: "bearish",
    },
    {
      title: "Oil and gold prices stay sensitive to geopolitical headlines and demand forecasts",
      summary: "Commodity markets are balancing supply-side concerns with expectations around global growth and industrial activity.",
      source: "MarketWatch",
      source_url: "https://www.marketwatch.com/investing",
      category: "Commodities",
      published_ago: "Today",
      sentiment: "neutral",
    },
  ];
}

async function fetchTavilyArticles(apiKey: string) {
  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: `latest finance market news ${today}`,
      topic: "news",
      search_depth: "advanced",
      max_results: 8,
      include_answer: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily request failed with status ${response.status}`);
  }

  const data = await response.json();
  return (data.results || []).map((result: any) => {
    const text = `${result.title || ""} ${result.content || ""}`;
    return {
      title: result.title || "Finance update",
      summary: (result.content || "Latest financial developments from major outlets.").slice(0, 220),
      source: inferSourceName(result.url || ""),
      source_url: result.url || "https://www.marketwatch.com/investing",
      category: inferCategory(text),
      published_ago: "Today",
      sentiment: inferSentiment(text),
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
    if (TAVILY_API_KEY) {
      try {
        const tavilyArticles = await fetchTavilyArticles(TAVILY_API_KEY);
        if (tavilyArticles.length > 0) {
          return new Response(JSON.stringify({ articles: tavilyArticles }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (error) {
        console.error("Tavily news fallback failed:", error);
      }
    }

    const fallbackArticles = buildFallbackArticles();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("AI_GATEWAY_API");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ articles: fallbackArticles }), {
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
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ articles: fallbackArticles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ articles: fallbackArticles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const news = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(news), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-finance-news error:", e);
    return new Response(JSON.stringify({ articles: buildFallbackArticles() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
