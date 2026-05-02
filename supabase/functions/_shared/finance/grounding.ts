import { buildBootstrap } from "./bootstrap.ts";
import { parseString } from "./utils.ts";

export type GroundedSearchRequest = {
  query: string;
  user_intent?: string | null;
  finance_context_mode?: "none" | "summary" | "full";
  require_citations?: boolean;
};

export type GroundedSearchResult = {
  beta: true;
  answer: string;
  citations: Array<{ title: string; url: string }>;
  search_queries: string[];
  freshness_timestamp: string;
  confidence: "low" | "medium" | "high";
};

export type PlaceSearchRequest = {
  query: string;
  location_bias?: { latitude: number; longitude: number; radius_meters?: number } | null;
  requested_purpose?: string | null;
  max_results?: number;
};

export type PlaceSearchResult = {
  beta: true;
  places: Array<{
    name: string;
    address: string | null;
    maps_url: string | null;
    website_url: string | null;
    rating: number | null;
    price_level: string | null;
  }>;
  finance_aware_summary: string;
  freshness_timestamp: string;
  confidence: "low" | "medium" | "high";
};

function groundingEnabled() {
  return Deno.env.get("EVA_GEMINI_GROUNDING_ENABLED") === "true";
}

function mapsEnabled() {
  return Deno.env.get("EVA_GOOGLE_MAPS_ENABLED") === "true";
}

function financeSummary(bootstrap: Awaited<ReturnType<typeof buildBootstrap>>) {
  const summary = bootstrap.dashboard_summary;
  const forecast = bootstrap.forecast;
  return [
    `Cash balance: ${summary.cash_balance}`,
    `Monthly income: ${summary.monthly_income}`,
    `Monthly fixed expenses: ${summary.monthly_fixed_expenses}`,
    `Monthly cashflow: ${summary.monthly_cashflow}`,
    `Projected free cash: ${forecast?.projected_free_cash ?? summary.monthly_cashflow}`,
    `Health score: ${summary.health_score}`,
  ].join("; ");
}

function fallbackSearchResult(query: string, message: string): GroundedSearchResult {
  return {
    beta: true,
    answer: message,
    citations: [],
    search_queries: query ? [query] : [],
    freshness_timestamp: new Date().toISOString(),
    confidence: "low",
  };
}

export async function groundedGoogleSearch(userId: string, request: GroundedSearchRequest): Promise<GroundedSearchResult> {
  const query = parseString(request.query).trim();
  if (!query) {
    throw new Error("Ask EVA what to search for first.");
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!groundingEnabled() || !apiKey) {
    return fallbackSearchResult(
      query,
      "Real-time Google Search grounding is not configured yet. I can still help from your stored EVA finance data, but I will not invent current web facts.",
    );
  }

  const bootstrap = await buildBootstrap(userId, null);
  const includeFinance = request.finance_context_mode !== "none";
  const context = includeFinance ? `\nUser finance snapshot: ${financeSummary(bootstrap)}` : "";
  const intent = parseString(request.user_intent, "finance guidance");
  const prompt = `You are EVA, a warm personal finance assistant. The user explicitly requested Beta Google Search grounding. Answer concisely with current, cited facts from Google Search. Do not mutate user data. Do not claim access to Maps or Search unless grounding metadata or citations are returned. If the user asks for a purchase decision, combine the web facts with the finance snapshot and clearly say if more price information is needed.\nIntent: ${intent}\nQuestion: ${query}${context}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
    }),
  });

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload) {
    return fallbackSearchResult(query, "Google Search grounding was unavailable just now. Please try again in a moment.");
  }

  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const first = (candidates[0] ?? {}) as Record<string, unknown>;
  const content = (first.content ?? {}) as Record<string, unknown>;
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const answer = parts
    .map((part) => typeof (part as Record<string, unknown>).text === "string" ? String((part as Record<string, unknown>).text) : "")
    .join("\n")
    .trim();
  const grounding = (first.groundingMetadata ?? {}) as Record<string, unknown>;
  const chunks = Array.isArray(grounding.groundingChunks) ? grounding.groundingChunks : [];
  const citations = chunks.flatMap((chunk) => {
    const web = ((chunk as Record<string, unknown>).web ?? {}) as Record<string, unknown>;
    const url = parseString(web.uri);
    if (!url) return [];
    return [{ title: parseString(web.title, url), url }];
  });
  const searchQueries = Array.isArray(grounding.webSearchQueries)
    ? grounding.webSearchQueries.map((item) => parseString(item)).filter(Boolean)
    : [query];

  return {
    beta: true,
    answer: answer || "I found search results, but Gemini did not return a usable summary. Try a more specific question.",
    citations: citations.slice(0, 6),
    search_queries: searchQueries.slice(0, 4),
    freshness_timestamp: new Date().toISOString(),
    confidence: citations.length ? "high" : "medium",
  };
}


export async function groundedPlaceSearch(userId: string, request: PlaceSearchRequest): Promise<PlaceSearchResult> {
  const query = parseString(request.query).trim();
  if (!query) {
    throw new Error("Tell EVA what place or merchant to look up first.");
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!mapsEnabled() || !apiKey) {
    return {
      beta: true,
      places: [],
      finance_aware_summary:
        "Google Maps grounding is off for launch to protect your free-tier quota. Tell me the place, item, and price, and I will still give you a finance-safe affordability answer from your EVA data.",
      freshness_timestamp: new Date().toISOString(),
      confidence: "low",
    };
  }

  const bootstrap = await buildBootstrap(userId, null);
  const context = `User finance snapshot: ${financeSummary(bootstrap)}`;
  const purpose = parseString(request.requested_purpose, "place lookup for a finance decision");
  const prompt = `You are EVA, a warm personal finance assistant. The user explicitly requested Beta Google Maps grounding. Use Google Maps data only for factual place information, keep the answer concise, and do not claim to complete purchases, bookings, or money movement. If Maps data is unavailable, say so.\nPurpose: ${purpose}\nQuestion: ${query}\n${context}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleMaps: {} }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
    }),
  });

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload) {
    return {
      beta: true,
      places: [],
      finance_aware_summary:
        "Google Maps grounding was unavailable just now. Tell me the merchant, item, and price, and I will help with an affordability check from your EVA finances.",
      freshness_timestamp: new Date().toISOString(),
      confidence: "low",
    };
  }

  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const first = (candidates[0] ?? {}) as Record<string, unknown>;
  const content = (first.content ?? {}) as Record<string, unknown>;
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const answer = parts
    .map((part) => typeof (part as Record<string, unknown>).text === "string" ? String((part as Record<string, unknown>).text) : "")
    .join("\n")
    .trim();
  const grounding = (first.groundingMetadata ?? {}) as Record<string, unknown>;
  const chunks = Array.isArray(grounding.groundingChunks) ? grounding.groundingChunks : [];
  const places = chunks.flatMap((chunk) => {
    const maps = ((chunk as Record<string, unknown>).maps ?? (chunk as Record<string, unknown>).place ?? {}) as Record<string, unknown>;
    const uri = parseString(maps.uri ?? maps.googleMapsUri);
    const title = parseString(maps.title ?? maps.name);
    if (!uri && !title) return [];
    return [{
      name: title || "Google Maps result",
      address: parseString(maps.address ?? maps.formattedAddress) || null,
      maps_url: uri || null,
      website_url: parseString(maps.websiteUri) || null,
      rating: Number.isFinite(Number(maps.rating)) ? Number(maps.rating) : null,
      price_level: parseString(maps.priceLevel) || null,
    }];
  });

  return {
    beta: true,
    places: places.slice(0, 6),
    finance_aware_summary:
      answer || "Google Maps returned a grounded response, but EVA could not summarize it. Try a more specific place or location.",
    freshness_timestamp: new Date().toISOString(),
    confidence: places.length ? "high" : "medium",
  };
}
