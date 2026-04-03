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

    // 1. SEARCH PHASE (Tavily API)
    // We explicitly ask for "current prices" to force the search engine to find live data
    const searchQuery = `Current stock prices and latest Motley Fool Stock Advisor picks as of ${today}. Focus on real-time market data.`;
    
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
        include_answer: true, // Let Tavily's AI try to find the answer first
        max_results: 6,
      }),
    });

    let searchContext = "";
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      // Combine the Tavily AI answer with the raw search results for maximum accuracy
      searchContext = `SUMMARY OF LIVE DATA: ${searchData.answer}\n\nDETAILED RESULTS:\n` + 
        searchData.results.map((r: any) => 
          `Source: ${r.url}\nTitle: ${r.title}\nContent: ${r.content}\n`
        ).join("\n---\n");
    }

    // 2. INFERENCE PHASE (Groq API)
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
            content: `You are eva's Real-Time Market Analyst. 
            
            STRICT RULES:
            1. ONLY use stock prices found in the provided search context.
            2. If you see a price in the context (e.g., ORCL $199, CRWD $399), use that.
            3. DO NOT use your internal knowledge for stock prices (which is outdated).
            4. If the search context does not mention a specific price, search for the most recent trend or mark it as "Live price unavailable".
            5. PRIORITIZE Motley Fool Stock Advisor picks mentioned in the search context for ${today}.

            REAL-TIME WEB CONTEXT:
            ${searchContext || "CRITICAL: No search data available. DO NOT guess prices."}

            Return a valid JSON object matching the requested structure.`,
          },
          {
            role: "user",
            content: `Generate top stock recommendations. Focus on Motley Fool and ENSURE prices are accurate to ${today} based on the search context.`,
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
