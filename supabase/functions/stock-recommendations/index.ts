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
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");

    if (!GROQ_API_KEY || !TAVILY_API_KEY) {
      throw new Error("GROQ_API_KEY or TAVILY_API_KEY is not configured");
    }

    const today = new Date().toISOString().slice(0, 10);

    // 1. SEARCH PHASE (Tavily API - Built for LLMs)
    const searchQuery = `Latest Motley Fool Stock Advisor picks and Wall Street analyst ratings for ${today}`;
    
    console.log(`Searching via Tavily for: ${searchQuery}`);
    
    const searchResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: searchQuery,
        search_depth: "advanced",
        include_answer: false,
        max_results: 5,
        topic: "news"
      }),
    });

    let searchContext = "";
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      searchContext = searchData.results.map((r: any) => 
        `Source: ${r.url}\nTitle: ${r.title}\nContent: ${r.content}\n`
      ).join("\n---\n");
    } else {
      console.warn("Tavily search failed, falling back to general knowledge");
    }

    // 2. INFERENCE PHASE (Groq API - Ultra fast Llama 3)
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are eva's Market Intelligence module. Your task is to process real-time search results and provide current stock recommendations.
            
            REAL-TIME WEB CONTEXT:
            ${searchContext || "No recent search results found. Use general market trends for " + today}

            CRITICAL: Prioritize Motley Fool Stock Advisor's most recent recommendations found in the context.
            
            Return a JSON object with this structure:
            {
              "recommendations": [
                {
                  "ticker": "...",
                  "company": "...",
                  "recommendation": "Strong Buy|Buy|Hold",
                  "current_price": "...",
                  "target_price": "...",
                  "upside": "...",
                  "reason": "3-4 sentences explaining the 'why' based on the search context",
                  "source": "Motley Fool Stock Advisor|Goldman Sachs|etc",
                  "risk_level": "Low|Medium|High",
                  "sector": "Technology|Healthcare|etc",
                  "newsletter_note": "Specific context like 'Active Stock Advisor pick since Jan 2026'"
                }
              ],
              "market_pulse": "Brief 1-2 sentence market overview for today",
              "motley_fool_focus": "Key themes Motley Fool is currently highlighting"
            }`,
          },
          {
            role: "user",
            content: `Generate top stock recommendations using the provided search context. Focus on Motley Fool. Date: ${today}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq error:", errorText);
      throw new Error("Failed to generate recommendations via Groq");
    }

    const groqData = await groqResponse.json();
    const result = JSON.parse(groqData.choices[0].message.content);

    return new Response(JSON.stringify(result), {
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
