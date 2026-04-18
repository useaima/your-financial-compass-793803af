import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, ingestForwardedReceipt } from "../_shared/financeCore.ts";

function parseUserId(value: unknown) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f-]{36}$/i.test(candidate) ? candidate : null;
}

function parseUserIdFromAddress(address: unknown) {
  const candidate = typeof address === "string" ? address.trim().toLowerCase() : "";
  const plusMatch = candidate.match(/\+([0-9a-f-]{36})@/i);
  return plusMatch?.[1] ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("EVA_RECEIPT_INGEST_SECRET");
    const incomingSecret = req.headers.get("x-eva-ingest-secret");

    if (!expectedSecret || incomingSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const userId =
      parseUserId(body.user_id) ??
      parseUserIdFromAddress(body.forward_to) ??
      parseUserIdFromAddress(body.alias_address);

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "A valid user_id or plus-addressed forwarding alias is required.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const result = await ingestForwardedReceipt({
      userId,
      sourceRef:
        typeof body.message_id === "string"
          ? body.message_id
          : typeof body.source_ref === "string"
            ? body.source_ref
            : null,
      subject: typeof body.subject === "string" ? body.subject : "",
      text:
        typeof body.text === "string"
          ? body.text
          : typeof body.plain_text === "string"
            ? body.plain_text
            : "",
      amount: body.amount,
      merchant: body.merchant,
      transactionDate: body.transaction_date ?? body.received_at,
      category: body.category,
    });

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("receipt-ingress error:", error);
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
