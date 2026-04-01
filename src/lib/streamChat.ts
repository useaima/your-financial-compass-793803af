export type Msg = { role: "user" | "assistant"; content: string };

export type ParsedSpending = {
  items: { category: string; amount: number; description: string }[];
  total: number;
  score: number;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
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
        // Handle custom spending_parsed event
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

  // flush
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
