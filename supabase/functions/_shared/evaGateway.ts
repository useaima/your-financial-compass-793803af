const DEFAULT_AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

function getGatewayBaseUrl() {
  return (
    Deno.env.get("VERCEL_AI_GATEWAY_BASE_URL") ??
    Deno.env.get("AI_GATEWAY_BASE_URL") ??
    DEFAULT_AI_GATEWAY_BASE_URL
  ).replace(/\/$/, "");
}

export function getEvaGatewayUrl() {
  return `${getGatewayBaseUrl()}/chat/completions`;
}

export const EVA_MODELS = {
  extraction: Deno.env.get("EVA_MODEL_EXTRACTION") ?? "google/gemini-2.0-flash",
  conversation: Deno.env.get("EVA_MODEL_CONVERSATION") ?? "google/gemini-2.0-flash",
  planning: Deno.env.get("EVA_MODEL_PLANNING") ?? "google/gemini-2.0-pro-exp-02-15",
} as const;

export function getEvaGatewayApiKey() {
  return (
    Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ??
    Deno.env.get("AI_GATEWAY_API_KEY") ??
    Deno.env.get("AI_GATEWAY_API") ??
    Deno.env.get("VERCEL_OIDC_TOKEN") ??
    ""
  );
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

  const response = await fetch(getEvaGatewayUrl(), {
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
