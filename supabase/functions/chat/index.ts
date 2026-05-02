import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildBootstrap,
  corsHeaders,
  createAdminClient,
  requireAuthenticatedUser,
} from "../_shared/financeCore.ts";
import {
  buildConversationSystemPrompt,
  buildFallbackAdvice,
  extractSpendingItems,
  requestConversationStream,
} from "../_shared/evaOrchestrator.ts";

function calculateScore(history: Array<{ date: string; total: number }>): number {
  if (history.length === 0) return 50;

  const last7 = history.filter((entry) => {
    const date = new Date(entry.date);
    const now = new Date();
    return (now.getTime() - date.getTime()) / 86400000 <= 7;
  });

  if (last7.length === 0) return 50;

  const dailyTotals = last7.map((entry) => Number(entry.total));
  const average = dailyTotals.reduce((sum, value) => sum + value, 0) / dailyTotals.length;

  let score = 70;
  if (average < 20) score += 15;
  else if (average < 50) score += 5;
  else if (average > 100) score -= 15;
  else if (average > 75) score -= 5;

  if (dailyTotals.length > 1) {
    const variance =
      dailyTotals.reduce((sum, value) => sum + (value - average) ** 2, 0) / dailyTotals.length;
    const coefficient = Math.sqrt(variance) / (average || 1);
    if (coefficient < 0.3) score += 10;
    else if (coefficient > 0.8) score -= 10;
  }

  if (last7.length >= 5) score += 5;

  return Math.max(10, Math.min(100, Math.round(score)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await requireAuthenticatedUser(req);
    const { messages = [] } = await req.json().catch(() => ({}));
    const adminClient = createAdminClient();
    const bootstrap = await buildBootstrap(user.id, user.email ?? null);

    let history = bootstrap.spending_events ?? [];
    const budgetLimits = bootstrap.budget_limits ?? [];
    const budgetSpending: Record<string, number> = {};
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date();
    monthStart.setDate(1);

    const monthLogs = history.filter((event) => new Date(event.date) >= monthStart);
    for (const event of monthLogs) {
      for (const item of event.items || []) {
        budgetSpending[item.category] = (budgetSpending[item.category] || 0) + (item.amount || 0);
      }
    }

    let todayTotal = history
      .filter((entry) => entry.date === today)
      .reduce((sum, entry) => sum + Number(entry.total), 0);
    let weekTotal = history
      .filter((entry) => new Date(entry.date) >= weekAgo)
      .reduce((sum, entry) => sum + Number(entry.total), 0);
    let financialScore = calculateScore(history);

    const lastUserMsg = messages[messages.length - 1]?.content || "";
    const parsedItems = await extractSpendingItems(lastUserMsg);
    const budgetWarnings: string[] = [];

    if (parsedItems.length > 0) {
      const total = parsedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const logDate = new Date().toISOString().split("T")[0];

      const { error } = await adminClient.from("finance_spending_events").insert({
        user_id: user.id,
        raw_input: lastUserMsg,
        items: parsedItems,
        total,
        date: logDate,
        source: "chat_manual",
      });

      if (error) throw error;

      for (const item of parsedItems) {
        budgetSpending[item.category] = (budgetSpending[item.category] || 0) + (item.amount || 0);
      }

      for (const budget of budgetLimits) {
        const spent = budgetSpending[budget.category] || 0;
        if (spent > budget.monthly_limit) {
          budgetWarnings.push(
            `OVER BUDGET: ${budget.category} - spent $${spent.toFixed(2)} of $${budget.monthly_limit} limit`,
          );
        } else if (budget.monthly_limit > 0 && spent / budget.monthly_limit >= 0.8) {
          const remaining = budget.monthly_limit - spent;
          budgetWarnings.push(
            `NEAR LIMIT: ${budget.category} - $${remaining.toFixed(2)} remaining of $${budget.monthly_limit}`,
          );
        }
      }

      history = [{ id: crypto.randomUUID(), user_id: user.id, date: logDate, items: parsedItems, raw_input: lastUserMsg, total, source: "chat_manual" }, ...history];
      todayTotal += total;
      weekTotal += total;
      financialScore = calculateScore(history);
    }

    const systemPrompt = buildConversationSystemPrompt(
      history,
      financialScore,
      todayTotal,
      weekTotal,
      budgetLimits,
      budgetSpending,
    );

    const enhancedMessages = [...messages];
    if (parsedItems.length > 0) {
      const total = parsedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const itemsSummary = parsedItems
        .map((item) => `${item.category}: $${item.amount} (${item.description})`)
        .join(", ");

      let budgetContext = "";
      if (budgetWarnings.length > 0) {
        budgetContext = `\n\nBudget alerts after this spending:\n${budgetWarnings.join("\n")}`;
      }

      enhancedMessages.push({
        role: "system",
        content:
          `[SYSTEM: The user just logged spending. Parsed items: ${itemsSummary}. ` +
          `Total: $${total}. Updated today's total: $${todayTotal.toFixed(2)}. ` +
          `Financial score: ${financialScore}/100. Acknowledge this and give a useful next action.${budgetContext}]`,
      });
    }

    const assistantResponse = await requestConversationStream({
      systemPrompt,
      messages: enhancedMessages,
    });

    if (!assistantResponse?.ok) {
      if (assistantResponse) {
        console.error("eva chat gateway error:", assistantResponse.status, await assistantResponse.text());
      }

      const fallbackText = buildFallbackAdvice(
        lastUserMsg,
        parsedItems,
        todayTotal,
        weekTotal,
        financialScore,
        budgetWarnings,
      );
      const fallbackEvents: string[] = [];
      if (parsedItems.length > 0) {
        fallbackEvents.push(
          `data: ${JSON.stringify({
            type: "spending_parsed",
            items: parsedItems,
            total: parsedItems.reduce((sum, item) => sum + item.amount, 0),
            score: financialScore,
            budgetWarnings,
          })}\n\n`,
        );
      }
      fallbackEvents.push(
        `data: ${JSON.stringify({ choices: [{ delta: { content: fallbackText } }] })}\n\n`,
      );
      fallbackEvents.push("data: [DONE]\n\n");

      return new Response(fallbackEvents.join(""), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const encoder = new TextEncoder();
    const metaEvent =
      parsedItems.length > 0
        ? encoder.encode(
            `data: ${JSON.stringify({
              type: "spending_parsed",
              items: parsedItems,
              total: parsedItems.reduce((sum, item) => sum + item.amount, 0),
              score: financialScore,
              budgetWarnings,
            })}\n\n`,
          )
        : null;

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    void (async () => {
      try {
        if (metaEvent) await writer.write(metaEvent);
        const reader = assistantResponse.body?.getReader();
        if (!reader) {
          return;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (error) {
        console.error("chat stream error:", error);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat error:", error);
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
