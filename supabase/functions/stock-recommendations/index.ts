import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EVA_MODELS, readGatewayToolArguments } from "../_shared/evaGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type TavilyResult = {
  url?: string;
  title?: string;
  content?: string;
};

type TavilyResponse = {
  answer?: string;
  results?: TavilyResult[];
};

type RecommendationPayload = {
  ticker?: string;
  company?: string;
  recommendation?: string;
  current_price?: string;
  target_price?: string;
  upside?: string;
  reason?: string;
  source?: string;
  risk_level?: string;
  sector?: string;
  newsletter_note?: string;
};

type StructuredRecommendationResponse = {
  recommendations?: RecommendationPayload[];
  market_pulse?: string;
  motley_fool_focus?: string;
};

const DEFAULT_MARKET_PULSE =
  "eva could not complete a fully structured live stock screen just now, so review the latest market conditions before acting on any idea.";

function inferSourceName(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes("fool")) return "Motley Fool";
    if (hostname.includes("reuters")) return "Reuters";
    if (hostname.includes("bloomberg")) return "Bloomberg";
    if (hostname.includes("cnbc")) return "CNBC";
    if (hostname.includes("wsj")) return "The Wall Street Journal";
    if (hostname.includes("marketwatch")) return "MarketWatch";
    if (hostname.includes("seekingalpha")) return "Seeking Alpha";
    if (hostname.includes("finance.yahoo")) return "Yahoo Finance";
    return hostname.split(".")[0]?.replace(/\b\w/g, (char) => char.toUpperCase()) || "Market Research";
  } catch {
    return "Market Research";
  }
}

function buildSearchContext(data: TavilyResponse) {
  const results = Array.isArray(data.results) ? data.results : [];
  const answer = typeof data.answer === "string" ? data.answer.trim() : "";

  return {
    answer,
    results,
    context: [
      answer ? `SUMMARY OF LIVE DATA:\n${answer}` : "",
      results.length
        ? `DETAILED RESULTS:\n${results
            .map((result) =>
              [
                `Source: ${result.url ?? "Unknown"}`,
                `Title: ${result.title ?? "Untitled"}`,
                `Content: ${result.content ?? "No content"}`,
              ].join("\n"),
            )
            .join("\n---\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

function normalizeRecommendations(items: RecommendationPayload[] = []) {
  return items
    .map((item, index) => {
      const ticker = typeof item.ticker === "string" && item.ticker.trim()
        ? item.ticker.trim().toUpperCase()
        : typeof item.company === "string" && item.company.trim()
          ? item.company.trim().slice(0, 5).toUpperCase()
          : `PICK${index + 1}`;

      const recommendation =
        item.recommendation && ["Strong Buy", "Buy", "Hold"].includes(item.recommendation)
          ? item.recommendation
          : "Hold";

      const riskLevel =
        item.risk_level && ["Low", "Medium", "High"].includes(item.risk_level)
          ? item.risk_level
          : "Medium";

      return {
        ticker,
        company:
          typeof item.company === "string" && item.company.trim()
            ? item.company.trim()
            : `Market pick ${index + 1}`,
        recommendation,
        current_price:
          typeof item.current_price === "string" && item.current_price.trim()
            ? item.current_price.trim()
            : "Live price unavailable",
        target_price:
          typeof item.target_price === "string" && item.target_price.trim()
            ? item.target_price.trim()
            : "Review manually",
        upside:
          typeof item.upside === "string" && item.upside.trim()
            ? item.upside.trim()
            : "Review upside",
        reason:
          typeof item.reason === "string" && item.reason.trim()
            ? item.reason.trim()
            : "eva found this idea in current market research, but you should review the thesis before acting.",
        source:
          typeof item.source === "string" && item.source.trim()
            ? item.source.trim()
            : "Market Research",
        risk_level: riskLevel,
        sector:
          typeof item.sector === "string" && item.sector.trim()
            ? item.sector.trim()
            : "General Market",
        newsletter_note:
          typeof item.newsletter_note === "string" && item.newsletter_note.trim()
            ? item.newsletter_note.trim()
            : undefined,
      };
    })
    .filter((item) => Boolean(item.company));
}

async function fetchTavilyData(today: string) {
  const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");
  if (!tavilyApiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const searchResponse = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: tavilyApiKey,
      query: `Latest stock ideas and current price context as of ${today}. Focus on Motley Fool Stock Advisor, major Wall Street analyst upgrades, and current market setups.`,
      search_depth: "advanced",
      topic: "news",
      include_answer: true,
      max_results: 8,
    }),
  });

  if (!searchResponse.ok) {
    throw new Error(`Tavily request failed with status ${searchResponse.status}`);
  }

  return (await searchResponse.json()) as TavilyResponse;
}

async function generateRecommendationsWithGateway(
  searchContext: string,
  today: string,
) {
  return readGatewayToolArguments<StructuredRecommendationResponse>(
    {
      model: EVA_MODELS.planning,
      messages: [
        {
          role: "system",
          content: `You are eva's live stock research analyst.

Use only the supplied market-search context.
Do not invent prices, targets, or newsletter claims.
If a price is not present in context, say "Live price unavailable".
Prioritize current ideas from Motley Fool, Reuters, Bloomberg, CNBC, MarketWatch, Yahoo Finance, and similar reputable sources.
Return exactly 4 recommendations with short, practical reasons.

LIVE MARKET CONTEXT (${today}):
${searchContext || "No live market context supplied."}`,
        },
        {
          role: "user",
          content: "Generate eva's current stock picks with a short market pulse and Motley Fool focus summary.",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_stock_recommendations",
            description: "Generate structured stock ideas from grounded market-search context",
            parameters: {
              type: "object",
              properties: {
                market_pulse: { type: "string" },
                motley_fool_focus: { type: "string" },
                recommendations: {
                  type: "array",
                  minItems: 4,
                  maxItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      ticker: { type: "string" },
                      company: { type: "string" },
                      recommendation: { type: "string", enum: ["Strong Buy", "Buy", "Hold"] },
                      current_price: { type: "string" },
                      target_price: { type: "string" },
                      upside: { type: "string" },
                      reason: { type: "string" },
                      source: { type: "string" },
                      risk_level: { type: "string", enum: ["Low", "Medium", "High"] },
                      sector: { type: "string" },
                      newsletter_note: { type: "string" },
                    },
                    required: [
                      "ticker",
                      "company",
                      "recommendation",
                      "current_price",
                      "target_price",
                      "upside",
                      "reason",
                      "source",
                      "risk_level",
                      "sector",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["market_pulse", "motley_fool_focus", "recommendations"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "generate_stock_recommendations" },
      },
    },
    "generate_stock_recommendations",
  );
}

async function generateRecommendationsWithGroq(
  searchContext: string,
  today: string,
) {
  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!groqApiKey) {
    return null;
  }

  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are eva's live stock research analyst.

Use only the supplied market-search context.
Do not invent prices, targets, or newsletter claims.
If a price is not present in context, say "Live price unavailable".
Return a valid JSON object with market_pulse, motley_fool_focus, and recommendations (4 items).

LIVE MARKET CONTEXT (${today}):
${searchContext || "No live market context supplied."}`,
        },
        {
          role: "user",
          content: "Generate eva's current stock picks.",
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!groqResponse.ok) {
    console.error("Groq stock recommendation error:", groqResponse.status, await groqResponse.text());
    return null;
  }

  const groqData = await groqResponse.json();
  try {
    return JSON.parse(groqData.choices?.[0]?.message?.content ?? "{}") as StructuredRecommendationResponse;
  } catch (error) {
    console.error("Groq stock recommendation parse error:", error);
    return null;
  }
}

function buildFallbackResponse(
  today: string,
  searchData: TavilyResponse,
) {
  const results = Array.isArray(searchData.results) ? searchData.results : [];

  const fallbackRecommendations = Array.from({ length: 4 }, (_, index) => {
    const result = results[index];
    return {
      ticker: `IDEA${index + 1}`,
      company: result?.title?.slice(0, 120) || `Live market idea ${index + 1}`,
      recommendation: "Hold",
      current_price: "Live price unavailable",
      target_price: "Review manually",
      upside: "Research live upside",
      reason:
        result?.content?.slice(0, 220) ||
        "eva could not fully structure this live pick just now, so review current research before acting.",
      source: inferSourceName(result?.url ?? ""),
      risk_level: "Medium",
      sector: "General Market",
      newsletter_note: `Grounded from live search context on ${today}.`,
    };
  });

  return {
    recommendations: fallbackRecommendations,
    market_pulse: searchData.answer?.trim() || DEFAULT_MARKET_PULSE,
    motley_fool_focus:
      "Review the current live research sources below before making any trading decision.",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const tavilyData = await fetchTavilyData(today);
    const { context: searchContext } = buildSearchContext(tavilyData);

    const aiResult =
      (await generateRecommendationsWithGateway(searchContext, today)) ??
      (await generateRecommendationsWithGroq(searchContext, today));

    const normalizedRecommendations = normalizeRecommendations(aiResult?.recommendations);
    const fallbackResult = buildFallbackResponse(today, tavilyData);

    const payload = {
      recommendations:
        normalizedRecommendations.length > 0
          ? normalizedRecommendations
          : fallbackResult.recommendations,
      market_pulse:
        aiResult?.market_pulse?.trim() || fallbackResult.market_pulse,
      motley_fool_focus:
        aiResult?.motley_fool_focus?.trim() || fallbackResult.motley_fool_focus,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("stock-recommendations error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
