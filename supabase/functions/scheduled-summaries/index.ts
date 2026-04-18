import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, generateScheduledSummaries } from "../_shared/financeCore.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("EVA_SCHEDULED_SUMMARIES_SECRET");
    const incomingSecret = req.headers.get("x-eva-schedule-secret");

    if (!expectedSecret || incomingSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await generateScheduledSummaries();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scheduled-summaries error:", error);
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
