import { firebaseAuth, getFirebaseFunctionUrl } from "@/integrations/supabase/client";
import { ensureOnline, getDisplayErrorMessage, handleAppError } from "@/lib/appErrors";
import { getTrustedAccessToken } from "@/lib/authSession";

export type Msg = { role: "user" | "assistant"; content: string };

export type ParsedSpending = {
  items: { category: string; amount: number; description: string }[];
  total: number;
  score: number;
};

const CHAT_URL = getFirebaseFunctionUrl("chat");

export async function streamChat({
  messages,
  token,
  onDelta,
  onDone,
  onError,
  onSpendingParsed,
}: {
  messages: Msg[];
  token?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  onSpendingParsed?: (data: ParsedSpending) => void;
}) {
  const sessionToken = token ? null : await firebaseAuth?.currentUser?.getIdToken();
  const accessToken =
    token ??
    (await getTrustedAccessToken({
      initialUser: firebaseAuth?.currentUser ?? null,
      attempts: 2,
      waitMs: 1400,
    })) ??
    sessionToken;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    ensureOnline();
  } catch (error) {
    onError(getDisplayErrorMessage(error));
    return;
  }

  let resp: Response;
  try {
    resp = await fetch(CHAT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages,
      }),
    });
  } catch (error) {
    const { message } = handleAppError(
      error,
      "We could not reach eva. Please try again.",
    );
    onError(message);
    return;
  }

  if (!resp.ok) {
    if (resp.status === 401) { onError("Your session expired. Sign in again to continue."); return; }
    if (resp.status === 429) { onError("Rate limit reached. Please wait a moment."); return; }
    if (resp.status === 402) { onError("AI credits exhausted. Please add funds."); return; }
    onError("Something went wrong. Please try again.");
    return;
  }

  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        if (parsed.type === "spending_parsed" && onSpendingParsed) {
          onSpendingParsed(parsed);
          continue;
        }
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  if (buffer.trim()) {
    for (const raw of buffer.split("\n")) {
      if (!raw || !raw.startsWith("data: ")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const p = JSON.parse(json);
        if (p.type === "spending_parsed" && onSpendingParsed) {
          onSpendingParsed(p);
          continue;
        }
        const c = p.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        // Ignore incomplete trailing chunks; the stream parser already retries them above.
      }
    }
  }

  onDone();
}
