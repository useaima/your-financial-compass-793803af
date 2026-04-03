import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const PARSE_TOOLS = [
  {
    type: "function",
    function: {
      name: "log_spending",
      description:
        "Extract spending items from the user's message. Call this when the user reports any spending, expenses, or purchases.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: [
                    "Food", "Transport", "Entertainment", "Shopping", "Bills",
                    "Health", "Education", "Subscriptions", "Groceries",
                    "Personal Care", "Other",
                  ],
                },
                amount: { type: "number" },
                description: { type: "string" },
              },
              required: ["category", "amount", "description"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
];

function buildSystemPrompt(
  history: any[],
  financialScore: number,
  todayTotal: number,
  weekTotal: number,
  budgetLimits: any[],
  budgetSpending: Record<string, number>
) {
  const historyLines = history
    .slice(0, 60)
    .map((log: any) => `${log.date}: ${JSON.stringify(log.items)} (total: $${log.total})`)
    .join("\n");

  // Build budget warnings
  let budgetSection = "";
  if (budgetLimits.length > 0) {
    const budgetLines = budgetLimits.map((b: any) => {
      const spent = budgetSpending[b.category] || 0;
      const pct = b.monthly_limit > 0 ? ((spent / b.monthly_limit) * 100).toFixed(0) : "0";
      const status = spent > b.monthly_limit ? "🚨 OVER LIMIT" : Number(pct) >= 80 ? "⚠️ NEAR LIMIT" : "✅ OK";
      return `- ${b.category}: $${spent.toFixed(2)} / $${b.monthly_limit} (${pct}%) ${status}`;
    }).join("\n");
    budgetSection = `\n## BUDGET LIMITS (THIS MONTH)\n${budgetLines}\n\n**IMPORTANT**: If any category is NEAR LIMIT (≥80%) or OVER LIMIT, you MUST warn the user about it proactively. Be specific about which categories and how much they can still spend. If they just logged spending in a near/over-limit category, make it a prominent warning.`;
  }

  return `You are eva, an intelligent financial advisor that lives in the user's pocket. You understand natural language spending input and provide sharp, actionable financial advice.

## YOUR CAPABILITIES
1. **Parse spending**: When users tell you what they spent, you extract structured data using the log_spending tool.
2. **Immediate insight**: After logging, give a quick useful observation about the spending.
3. **Pattern detection**: You remember their history and detect trends.
4. **Actionable advice**: Always end with what the user should DO. Never be generic.
5. **Financial score**: Current score is ${financialScore}/100.
6. **Daily summaries**: When asked, summarize the day's spending.
7. **Weekly insights**: When asked, analyze the week's patterns.
8. **Budget monitoring**: Warn users when approaching or exceeding budget limits.

## USER'S SPENDING HISTORY
Today's total: $${todayTotal.toFixed(2)}
This week's total: $${weekTotal.toFixed(2)}

Recent logs:
${historyLines || "No spending logged yet. This is a new user."}
${budgetSection}

## RULES
- Be concise but insightful (2-3 paragraphs max)
- Use specific numbers from their data, never generic advice
- If they log spending, acknowledge the parsed amounts, then give insight
- **Always check budget limits after logging spending and warn if near/over**
- Detect patterns: "You've been spending a lot on X lately" or "Your transport costs are consistent"
- Always answer: "What should the user do?"
- Use bullet points for clarity
- Be encouraging but honest
- If the user asks about their score, explain what affects it
- For daily summary: show total, category breakdown, key advice, and budget status
- For weekly: show trends, biggest category, recommendations, and budget alerts
- When the user hasn't logged much yet, encourage them to keep logging for better insights`;
}

function calculateScore(history: any[]): number {
  if (history.length === 0) return 50; // neutral start

  const last7 = history.filter((h: any) => {
    const d = new Date(h.date);
    const now = new Date();
    return (now.getTime() - d.getTime()) / 86400000 <= 7;
  });

  if (last7.length === 0) return 50;

  const dailyTotals = last7.map((h: any) => Number(h.total));
  const avg = dailyTotals.reduce((a: number, b: number) => a + b, 0) / dailyTotals.length;

  // Simple scoring: lower spending = higher score, consistency bonus
  let score = 70;

  // Spending level factor
  if (avg < 20) score += 15;
  else if (avg < 50) score += 5;
  else if (avg > 100) score -= 15;
  else if (avg > 75) score -= 5;

  // Consistency bonus (low variance)
  if (dailyTotals.length > 1) {
    const variance =
      dailyTotals.reduce((sum: number, v: number) => sum + (v - avg) ** 2, 0) /
      dailyTotals.length;
    const cv = Math.sqrt(variance) / (avg || 1);
    if (cv < 0.3) score += 10;
    else if (cv > 0.8) score -= 10;
  }

  // Logging consistency bonus
  if (last7.length >= 5) score += 5;

  return Math.max(10, Math.min(100, Math.round(score)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user from auth header
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = authHeader
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        })
      : createClient(supabaseUrl, supabaseAnonKey);

    let user = null;
    if (authHeader) {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.warn("Proceeding without authenticated user context:", error.message);
      } else {
        user = data.user;
      }
    }

    let history: any[] = [];
    let todayTotal = 0;
    let weekTotal = 0;
    let financialScore = 50;
    let budgetLimits: any[] = [];
    const budgetSpending: Record<string, number> = {};

    if (user) {
      // Fetch spending history and budget limits in parallel
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [logsResult, budgetsResult] = await Promise.all([
        supabase
          .from("spending_logs")
          .select("*")
          .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
          .order("date", { ascending: false }),
        supabase.from("budget_limits").select("*"),
      ]);

      history = logsResult.data || [];
      budgetLimits = budgetsResult.data || [];

      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Calculate current month spending per category
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthLogs = history.filter((h: any) => new Date(h.date) >= monthStart);
      for (const log of monthLogs) {
        const items = log.items || [];
        for (const item of items) {
          budgetSpending[item.category] = (budgetSpending[item.category] || 0) + (item.amount || 0);
        }
      }

      todayTotal = history
        .filter((h: any) => h.date === today)
        .reduce((sum: number, h: any) => sum + Number(h.total), 0);

      weekTotal = history
        .filter((h: any) => new Date(h.date) >= weekAgo)
        .reduce((sum: number, h: any) => sum + Number(h.total), 0);

      financialScore = calculateScore(history);
    }

    const lastUserMsg = messages[messages.length - 1]?.content || "";

    // Phase 1: Try to parse spending from the latest user message (non-streaming)
    let parsedItems: any[] = [];
    try {
      const parseResponse = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content:
                "You are a spending parser. If the user's message contains any spending, expenses, or purchases, use the log_spending tool to extract them. If there is no spending data, respond normally with a brief acknowledgment.",
            },
            { role: "user", content: lastUserMsg },
          ],
          tools: PARSE_TOOLS,
          tool_choice: "auto",
        }),
      });

      if (parseResponse.ok) {
        const parseData = await parseResponse.json();
        const toolCall = parseData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.name === "log_spending") {
          const args = JSON.parse(toolCall.function.arguments);
          parsedItems = args.items || [];
        }
      }
    } catch (e) {
      console.error("Parse phase error:", e);
    }

    // Store parsed spending and update budget tracking
    const budgetWarnings: string[] = [];
    if (parsedItems.length > 0) {
      const total = parsedItems.reduce(
        (sum: number, item: any) => sum + (item.amount || 0),
        0
      );
      const logDate = new Date().toISOString().split("T")[0];

      if (user) {
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        await adminClient.from("spending_logs").insert({
          user_id: user.id,
          raw_input: lastUserMsg,
          items: parsedItems,
          total,
          date: logDate,
        });
      }

      // Update budget spending with newly parsed items
      for (const item of parsedItems) {
        budgetSpending[item.category] = (budgetSpending[item.category] || 0) + (item.amount || 0);
      }

      // Check for budget limit violations
      for (const budget of budgetLimits) {
        const spent = budgetSpending[budget.category] || 0;
        if (spent > budget.monthly_limit) {
          budgetWarnings.push(`🚨 OVER BUDGET: ${budget.category} - spent $${spent.toFixed(2)} of $${budget.monthly_limit} limit`);
        } else if (budget.monthly_limit > 0 && (spent / budget.monthly_limit) >= 0.8) {
          const remaining = budget.monthly_limit - spent;
          budgetWarnings.push(`⚠️ NEAR LIMIT: ${budget.category} - $${remaining.toFixed(2)} remaining of $${budget.monthly_limit}`);
        }
      }

      history = [
        {
          date: logDate,
          items: parsedItems,
          total,
        },
        ...history,
      ];

      todayTotal += total;
      weekTotal += total;
      financialScore = calculateScore(history);
    }

    // Phase 2: Generate advice (streaming)
    const systemPrompt = buildSystemPrompt(
      history,
      financialScore,
      todayTotal,
      weekTotal,
      budgetLimits,
      budgetSpending
    );

    // Add parsed items context to the latest message if any
    const enhancedMessages = [...messages];
    if (parsedItems.length > 0) {
      const total = parsedItems.reduce(
        (sum: number, item: any) => sum + (item.amount || 0),
        0
      );
      const itemsSummary = parsedItems
        .map((i: any) => `${i.category}: $${i.amount} (${i.description})`)
        .join(", ");
      
      let budgetContext = "";
      if (budgetWarnings.length > 0) {
        budgetContext = `\n\nBUDGET ALERTS after this spending:\n${budgetWarnings.join("\n")}\n\n**You MUST warn the user about these budget alerts prominently.**`;
      }

      enhancedMessages.push({
        role: "system",
        content: `[SYSTEM: The user just logged spending. Parsed items: ${itemsSummary}. Total: $${total}. Updated today's total: $${todayTotal.toFixed(2)}. Financial score: ${financialScore}/100. Acknowledge this and provide insight.${budgetContext}]`,
      });
    }

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...enhancedMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepend parsed items metadata as a custom SSE event
    const encoder = new TextEncoder();
    const metaEvent = parsedItems.length > 0
      ? encoder.encode(
          `data: ${JSON.stringify({
            type: "spending_parsed",
            items: parsedItems,
            total: parsedItems.reduce((s: number, i: any) => s + i.amount, 0),
            score: financialScore,
            budgetWarnings,
          })}\n\n`
        )
      : null;

    // Create a readable stream that prepends meta then proxies AI stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
      try {
        if (metaEvent) await writer.write(metaEvent);
        const reader = response.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
