import { EVA_MODELS, requestGatewayCompletion } from "../evaGateway.ts";
import { createAdminClient } from "./db.ts";
import { consumeSensitiveActionVerification } from "./security.ts";
import type {
  DraftImportSource,
  FinanceDraftTransaction,
  MediaAnalysisRequest,
  MediaAnalysisResult,
  ReceiptImageAnalysis,
} from "./types.ts";
import {
  buildDraftDedupeKey,
  inferCategoryFromMerchant,
  normalizeCategory,
  parseCsvRows,
  parseDateInput,
  parseGatewayJson,
  parseNumber,
  parseString,
  toIsoDate,
} from "./utils.ts";

function getReceiptForwardingAddress(userId: string) {
  const receiptDomain = Deno.env.get("RECEIPT_FORWARD_DOMAIN") ?? "useaima.com";
  return `receipts+${userId}@${receiptDomain}`;
}

export function buildReceiptForwardingDetails(userId: string) {
  const address = getReceiptForwardingAddress(userId);

  return {
    address,
    label: "EVA receipt inbox",
    instructions:
      "Forward store or email receipts to this address. EVA will turn them into draft transactions for your review before they touch your spending history.",
  };
}

function normalizeDraftTransactionInput(input: {
  userId: string;
  source: DraftImportSource;
  transactionDate: string;
  merchant: string;
  category?: string;
  amount: number;
  currency?: string;
  description?: string;
  rawPayload?: Record<string, unknown>;
}) {
  const merchant = parseString(input.merchant, "Unknown merchant");
  const description = parseString(input.description, merchant);
  const transactionDate = parseDateInput(input.transactionDate, toIsoDate(new Date()));
  const amount = Math.abs(parseNumber(input.amount));
  const providedCategory = parseString(input.category);
  const category = providedCategory
    ? normalizeCategory(providedCategory)
    : inferCategoryFromMerchant(merchant, description);

  return {
    user_id: input.userId,
    source: input.source,
    transaction_date: transactionDate,
    merchant,
    category,
    amount,
    currency: parseString(input.currency, "USD") || "USD",
    description,
    dedupe_key: buildDraftDedupeKey({
      userId: input.userId,
      source: input.source,
      transactionDate,
      merchant,
      amount,
      description,
    }),
    raw_payload: input.rawPayload ?? {},
  };
}

async function finalizeImportJobStatus(
  admin: ReturnType<typeof createAdminClient>,
  importJobId: string,
  userId: string,
) {
  const { count, error: pendingError } = await admin
    .from("finance_draft_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("import_job_id", importJobId)
    .eq("status", "pending");

  if (pendingError) throw pendingError;

  const hasPending = (count ?? 0) > 0;
  const { error: updateError } = await admin
    .from("finance_import_jobs")
    .update({ status: hasPending ? "pending_review" : "processed" })
    .eq("id", importJobId)
    .eq("user_id", userId);

  if (updateError) throw updateError;
}

async function createDraftTransactions(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    userId: string;
    source: DraftImportSource;
    fileName?: string | null;
    sourceRef?: string | null;
    drafts: Array<{
      transactionDate: string;
      merchant: string;
      category?: string;
      amount: number;
      currency?: string;
      description?: string;
      rawPayload?: Record<string, unknown>;
    }>;
  },
) {
  const { data: importJob, error: importJobError } = await admin
    .from("finance_import_jobs")
    .insert({
      user_id: params.userId,
      source: params.source,
      status: "pending_review",
      file_name: params.fileName ?? null,
      source_ref: params.sourceRef ?? null,
    })
    .select("*")
    .single();

  if (importJobError) throw importJobError;

  let duplicateCount = 0;
  let importedCount = 0;

  for (const draft of params.drafts) {
    const normalized = normalizeDraftTransactionInput({
      userId: params.userId,
      source: params.source,
      transactionDate: draft.transactionDate,
      merchant: draft.merchant,
      category: draft.category,
      amount: draft.amount,
      currency: draft.currency,
      description: draft.description,
      rawPayload: draft.rawPayload,
    });

    const { error } = await admin.from("finance_draft_transactions").insert({
      ...normalized,
      import_job_id: importJob.id,
    });

    if (error) {
      const duplicateDetected =
        "code" in error && typeof error.code === "string" && error.code === "23505";
      if (duplicateDetected) {
        duplicateCount += 1;
        continue;
      }

      await admin
        .from("finance_import_jobs")
        .update({
          status: "failed",
          error_message: error.message,
          imported_count: importedCount,
          duplicate_count: duplicateCount,
        })
        .eq("id", importJob.id);
      throw error;
    }

    importedCount += 1;
  }

  const finalStatus = importedCount > 0 ? "pending_review" : "processed";
  const { error: finalizeError } = await admin
    .from("finance_import_jobs")
    .update({
      status: finalStatus,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      error_message:
        importedCount === 0 && duplicateCount > 0
          ? "Every imported row matched an existing draft or approved transaction."
          : null,
    })
    .eq("id", importJob.id);

  if (finalizeError) throw finalizeError;

  return {
    importJobId: importJob.id,
    importedCount,
    duplicateCount,
  };
}

export async function analyzeReceiptImage(
  userId: string,
  imageDataUrl: string,
  fileName: string | null = null,
) {
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error("Please upload a valid receipt photo.");
  }

  const response = await requestGatewayCompletion({
    model: EVA_MODELS.conversation,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract structured spending data from receipt, supermarket slip, or till-check images. Return only valid JSON with this shape: " +
          '{"merchant":"string","transaction_date":"YYYY-MM-DD","currency":"USD","total":0,"summary":"string","items":[{"description":"string","amount":0,"category":"Food"}]}. ' +
          "Allowed categories: Food, Transport, Entertainment, Shopping, Bills, Health, Education, Subscriptions, Groceries, Personal Care, Other. " +
          "If line items are readable, return multiple items. If only the total is readable, return one item using the best description you can ground from the image. " +
          "Do not invent hidden items. Use Other when the category is unclear.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Analyze this receipt photo and extract grounded spending data. ` +
              `File name: ${fileName ?? "receipt-photo"}.`,
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
            },
          },
        ],
      },
    ],
  });

  if (!response?.ok) {
    if (response) {
      console.error("receipt analysis gateway error:", response.status, await response.text());
    }
    throw new Error("We could not analyze that receipt photo right now.");
  }

  const responseData = await response.json().catch(() => null);
  const parsed = parseGatewayJson<ReceiptImageAnalysis>(
    responseData?.choices?.[0]?.message?.content,
  );

  if (!parsed) {
    throw new Error("We could not read the receipt clearly enough. Try a sharper photo.");
  }

  const merchant = parseString(
    parsed.merchant,
    fileName?.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "Receipt photo",
  );
  const summary = parseString(parsed.summary, merchant);
  const transactionDate = parseDateInput(parsed.transaction_date ?? new Date(), toIsoDate(new Date()));
  const currency = parseString(parsed.currency, "USD") || "USD";
  const total = Math.abs(parseNumber(parsed.total));
  const analyzedItems = Array.isArray(parsed.items)
    ? parsed.items
        .map((item) => ({
          description: parseString(item?.description, summary),
          amount: Math.abs(parseNumber(item?.amount)),
          category: (() => {
            const providedCategory = parseString(item?.category);
            if (providedCategory) {
              return normalizeCategory(providedCategory);
            }

            return inferCategoryFromMerchant(merchant, parseString(item?.description, summary));
          })(),
        }))
        .filter((item) => item.amount > 0)
    : [];

  const drafts =
    analyzedItems.length > 0
      ? analyzedItems.map((item) => ({
          transactionDate,
          merchant,
          category: item.category,
          amount: item.amount,
          currency,
          description: item.description,
          rawPayload: {
            file_name: fileName,
            analysis: parsed,
          },
        }))
      : total > 0
        ? [
            {
              transactionDate,
              merchant,
              category: inferCategoryFromMerchant(merchant, summary),
              amount: total,
              currency,
              description: summary,
              rawPayload: {
                file_name: fileName,
                analysis: parsed,
              },
            },
          ]
        : [];

  if (drafts.length === 0) {
    throw new Error("We could not find any amounts in that photo. Try a clearer receipt image.");
  }

  const admin = createAdminClient();
  return createDraftTransactions(admin, {
    userId,
    source: "receipt_image",
    fileName,
    sourceRef: fileName,
    drafts,
  });
}

function normalizeMediaAnalysisResult(input: Record<string, unknown> | null): MediaAnalysisResult {
  const items = Array.isArray(input?.detected_items)
    ? input.detected_items.map((item) => {
        const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
        const price = parseNumber(value.price_hint);
        return {
          label: parseString(value.label, "Item"),
          category: normalizeCategory(value.category) || "Other",
          price_hint: price > 0 ? price : null,
        };
      }).slice(0, 8)
    : [];

  const steps = Array.isArray(input?.suggested_next_steps)
    ? input.suggested_next_steps.map((step) => parseString(step)).filter(Boolean).slice(0, 4)
    : [];

  const confidence = input?.confidence === "high" || input?.confidence === "medium" ? input.confidence : "low";

  return {
    beta: true,
    summary: parseString(input?.summary, "I can see the item, but I need a little more detail to give a confident finance answer."),
    recommendation: parseString(input?.recommendation, "Share the price or ask whether it fits your budget, and I will compare it with your current cash flow."),
    finance_context: parseString(input?.finance_context, "This advice is grounded in your saved EVA finance profile when available."),
    confidence,
    detected_items: items,
    suggested_next_steps: steps.length > 0 ? steps : ["Tell EVA the price if it is not visible.", "Ask for an affordability check before buying."],
  };
}

export async function analyzeMedia(
  userId: string,
  request: MediaAnalysisRequest,
): Promise<MediaAnalysisResult> {
  const mediaDataUrl = parseString(request.media_data_url);
  if (!mediaDataUrl.startsWith("data:image/")) {
    throw new Error("Please upload or capture a valid image frame for analysis.");
  }

  const admin = createAdminClient();
  const [{ data: profile }, { data: spending }] = await Promise.all([
    admin
      .from("finance_profiles")
      .select("cash_balance, monthly_income, monthly_fixed_expenses, target_monthly_savings")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("finance_spending_events")
      .select("date,total,items")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(20),
  ]);

  const recentSpend = Array.isArray(spending)
    ? spending.reduce((sum, event) => sum + parseNumber(event.total), 0)
    : 0;
  const profileContext = profile
    ? `Cash balance: $${parseNumber(profile.cash_balance)}. Monthly income: $${parseNumber(profile.monthly_income)}. Fixed expenses: $${parseNumber(profile.monthly_fixed_expenses)}. Target savings: $${parseNumber(profile.target_monthly_savings)}. Recent tracked spend sample: $${recentSpend}.`
    : "No completed finance profile is available yet.";

  const userPrompt = parseString(request.prompt, "What should I know financially about this item?").slice(0, 600);
  const response = await requestGatewayCompletion({
    model: EVA_MODELS.conversation,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are EVA, a warm personal-finance assistant. Analyze user-provided photos or extracted video frames only for finance context. Keep advice concise, friendly, and practical. Do not claim certainty about prices unless visible. Do not mutate financial records. Return only JSON with shape: " +
          '{"summary":"string","recommendation":"string","finance_context":"string","confidence":"low|medium|high","detected_items":[{"label":"string","category":"Food|Transport|Entertainment|Shopping|Bills|Health|Education|Subscriptions|Groceries|Personal Care|Other","price_hint":0}],"suggested_next_steps":["string"]}.',
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Question: ${userPrompt}\nSource: ${request.source}. File: ${request.file_name ?? "camera-frame"}.\nFinance context: ${profileContext}\nGive a safe affordability-oriented answer.`,
          },
          {
            type: "image_url",
            image_url: {
              url: mediaDataUrl,
              detail: "auto",
            },
          },
        ],
      },
    ],
  });

  if (!response?.ok) {
    if (response) {
      console.error("media analysis gateway error:", response.status, await response.text());
    }
    throw new Error("EVA could not analyze that media right now. Try again or describe it in chat.");
  }

  const responseData = await response.json().catch(() => null);
  const parsed = parseGatewayJson<Record<string, unknown>>(responseData?.choices?.[0]?.message?.content);
  return normalizeMediaAnalysisResult(parsed);
}

export async function importCsvTransactions(
  userId: string,
  csvText: string,
  fileName: string | null = null,
) {
  const admin = createAdminClient();
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new Error("The CSV file does not contain enough rows to import.");
  }

  const headers = rows[0].map((header) => header.toLowerCase().trim());
  const dataRows = rows.slice(1);
  const dateIndex = headers.findIndex((header) => /date/.test(header));
  const merchantIndex = headers.findIndex((header) => /merchant|vendor|payee|store|name/.test(header));
  const amountIndex = headers.findIndex((header) => /amount|total|debit|value/.test(header));
  const categoryIndex = headers.findIndex((header) => /category/.test(header));
  const descriptionIndex = headers.findIndex((header) => /description|memo|note/.test(header));

  if (dateIndex < 0 || merchantIndex < 0 || amountIndex < 0) {
    throw new Error("CSV must include date, merchant, and amount columns.");
  }

  const drafts = dataRows
    .map((cells) => ({
      transactionDate: parseDateInput(cells[dateIndex], toIsoDate(new Date())),
      merchant: parseString(cells[merchantIndex], "Imported transaction"),
      category: categoryIndex >= 0 ? normalizeCategory(cells[categoryIndex]) : undefined,
      amount: Math.abs(parseNumber(cells[amountIndex])),
      description:
        descriptionIndex >= 0
          ? parseString(cells[descriptionIndex], parseString(cells[merchantIndex]))
          : parseString(cells[merchantIndex]),
      rawPayload: {
        row: cells,
        headers,
      },
    }))
    .filter((draft) => draft.amount > 0 && draft.merchant);

  if (drafts.length === 0) {
    throw new Error("No valid transactions were found in that CSV file.");
  }

  return createDraftTransactions(admin, {
    userId,
    source: "csv",
    fileName,
    drafts,
  });
}

export async function ingestForwardedReceipt(input: {
  userId: string;
  sourceRef?: string | null;
  subject?: string;
  text?: string;
  amount?: unknown;
  merchant?: unknown;
  transactionDate?: unknown;
  category?: unknown;
}) {
  const admin = createAdminClient();
  const subject = parseString(input.subject);
  const text = parseString(input.text);
  const merchant =
    parseString(input.merchant) ||
    subject.replace(/^fwd:\s*/i, "").split(/[-|:]/)[0]?.trim() ||
    "Forwarded receipt";
  const amount =
    parseNumber(input.amount) ||
    parseNumber(text.match(/(?:total|amount|paid)[^0-9]{0,12}(\d+(?:\.\d{1,2})?)/i)?.[1]);
  const transactionDate = parseDateInput(
    input.transactionDate ?? text.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1] ?? new Date(),
    toIsoDate(new Date()),
  );

  if (!amount || !merchant) {
    throw new Error("The forwarded receipt did not include enough information to create a draft transaction.");
  }

  return createDraftTransactions(admin, {
    userId: input.userId,
    source: "forwarded_email",
    sourceRef: input.sourceRef ?? null,
    drafts: [
      {
        transactionDate,
        merchant,
        category: normalizeCategory(input.category) || inferCategoryFromMerchant(merchant, text),
        amount,
        description: subject || text.slice(0, 120) || merchant,
        rawPayload: {
          subject,
          text,
          source_ref: input.sourceRef ?? null,
        },
      },
    ],
  });
}

export async function reviewDraftTransaction(
  userId: string,
  input: {
    draftId: string;
    decision: "approve" | "reject" | "edit";
    updates?: Record<string, unknown>;
    securityVerificationId?: string | null;
  },
) {
  const admin = createAdminClient();
  const { data: draft, error: draftError } = await admin
    .from("finance_draft_transactions")
    .select("*")
    .eq("id", input.draftId)
    .eq("user_id", userId)
    .maybeSingle();

  if (draftError) throw draftError;
  if (!draft) {
    throw new Error("We could not find that draft transaction.");
  }

  const updates = input.updates ?? {};
  const normalized = normalizeDraftTransactionInput({
    userId,
    source: draft.source,
    transactionDate: updates.transaction_date ?? draft.transaction_date,
    merchant: updates.merchant ?? draft.merchant,
    category: updates.category ?? draft.category,
    amount: updates.amount ?? draft.amount,
    currency: updates.currency ?? draft.currency,
    description: updates.description ?? draft.description,
    rawPayload:
      (typeof updates.raw_payload === "object" && updates.raw_payload !== null
        ? (updates.raw_payload as Record<string, unknown>)
        : draft.raw_payload) ?? {},
  });

  const now = new Date().toISOString();
  const finalDecision = input.decision === "edit" ? "approve" : input.decision;

  if (finalDecision === "approve") {
    await consumeSensitiveActionVerification(
      userId,
      "review_draft_transaction",
      input.securityVerificationId ?? null,
    );

    const { error: insertError } = await admin.from("finance_spending_events").insert({
      user_id: userId,
      date: normalized.transaction_date,
      items: [
        {
          category: normalized.category,
          amount: normalized.amount,
          description: normalized.description,
        },
      ],
      raw_input: normalized.description,
      total: normalized.amount,
      source:
        draft.source === "csv"
          ? "csv_import"
          : draft.source === "receipt_image"
            ? "receipt_image"
            : "forwarded_email",
    });

    if (insertError) throw insertError;
  }

  const { error: updateError } = await admin
    .from("finance_draft_transactions")
    .update({
      ...normalized,
      status: finalDecision === "approve" ? "approved" : "rejected",
      reviewed_at: now,
    })
    .eq("id", draft.id)
    .eq("user_id", userId);

  if (updateError) throw updateError;

  if (draft.import_job_id) {
    await finalizeImportJobStatus(admin, draft.import_job_id, userId);
  }
}
