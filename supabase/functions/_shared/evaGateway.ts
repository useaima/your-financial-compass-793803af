export const EVA_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const EVA_MODELS = {
  extraction: "google/gemini-2.5-flash-lite",
  conversation: "google/gemini-2.5-flash",
  planning: "google/gemini-2.5-pro",
} as const;

export function getEvaGatewayApiKey() {
  return Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("AI_GATEWAY_API") ?? "";
}

type GatewayRequest = {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  tools?: unknown[];
  tool_choice?: unknown;
  stream?: boolean;
  response_format?: unknown;
};

export async function requestGatewayCompletion(payload: GatewayRequest) {
  const apiKey = getEvaGatewayApiKey();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(EVA_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.error("eva gateway request failed:", error);
    return null;
  });

  return response;
}

export async function readGatewayToolArguments<T>(
  payload: GatewayRequest,
  functionName: string,
) {
  const response = await requestGatewayCompletion(payload);
  if (!response?.ok) {
    if (response) {
      console.error("eva gateway error:", response.status, await response.text());
    }
    return null;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.find(
    (call: { function?: { name?: string } }) => call.function?.name === functionName,
  );

  if (!toolCall?.function?.arguments) {
    return null;
  }

  try {
    return JSON.parse(toolCall.function.arguments) as T;
  } catch (error) {
    console.error("eva gateway tool parse error:", error);
    return null;
  }
}
