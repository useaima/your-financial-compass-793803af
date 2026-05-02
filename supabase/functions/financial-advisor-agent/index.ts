import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = `${(Deno.env.get("VERCEL_AI_GATEWAY_BASE_URL") ?? Deno.env.get("AI_GATEWAY_BASE_URL") ?? "https://ai-gateway.vercel.sh/v1").replace(/\/$/, "")}/chat/completions`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_GATEWAY_API_KEY = Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? Deno.env.get("AI_GATEWAY_API_KEY") ?? Deno.env.get("AI_GATEWAY_API") ?? Deno.env.get("VERCEL_OIDC_TOKEN");
    if (!AI_GATEWAY_API_KEY) throw new Error("VERCEL_AI_GATEWAY_API_KEY or AI_GATEWAY_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from request header (if manually triggered) or process all users (if on cron)
    const authHeader = req.headers.get("authorization");
    let targetUsers: any[] = [];

    if (authHeader) {
      const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await userSupabase.auth.getUser();
      if (error) throw error;
      if (user) targetUsers = [user];
    } else {
      // Cron mode: get all active users who have logged spending in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: activeUsers, error } = await supabase
        .from("spending_logs")
        .select("user_id")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Get unique user IDs
      const uniqueUserIds = [...new Set(activeUsers?.map(u => u.user_id))];
      targetUsers = uniqueUserIds.map(id => ({ id }));
    }

    const results = [];

    for (const user of targetUsers) {
      // 1. Fetch User Data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [logsRes, budgetsRes, profileRes] = await Promise.all([
        supabase
          .from("spending_logs")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
          .order("date", { ascending: false }),
        supabase.from("budget_limits").select("*").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
      ]);

      const history = logsRes.data || [];
      const budgets = budgetsRes.data || [];
      const profile = profileRes.data;

      if (history.length === 0) continue;

      // 2. Prepare Context for AI
      const historySummary = history.map(h => `${h.date}: $${h.total} (${JSON.stringify(h.items)})`).join("\n");
      const budgetSummary = budgets.map(b => `${b.category}: limit $${b.monthly_limit}`).join(", ");
      
      const systemPrompt = `You are eva, a proactive personal financial advisor. Your task is to analyze the user's spending data and provide one sharp, actionable "Insight of the Day".

User Profile: ${profile?.first_name || 'User'} (${profile?.user_type})
Budget Limits: ${budgetSummary || 'None set'}
Spending History (30 days):
${historySummary}

CRITICAL RULES:
1. Be specific. Mention exact categories and amounts.
2. Be proactive. Warn about trends before they become problems.
3. Be actionable. Tell the user exactly what to do next.
4. Keep it short. 2-3 sentences max for the body.
5. Title should be catchy (e.g., "Subscription Alert", "Coffee Trend Detected", "Budget Milestone").
6. Categorize the type: "insight", "warning", "tip", or "achievement".`;

      // 3. Get AI Insight
      const aiResponse = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: Deno.env.get("EVA_MODEL_CONVERSATION") ?? "google/gemini-2.0-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Analyze my recent spending and give me one proactive advice notification." }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = JSON.parse(aiData.choices[0].message.content);
        
        // 4. Save Notification
        const { error: insertError } = await supabase.from("notifications").insert({
          user_id: user.id,
          title: content.title,
          body: content.body,
          type: content.type || "insight",
        });

        if (insertError) console.error("Error inserting notification:", insertError);
        results.push({ user_id: user.id, success: !insertError });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
