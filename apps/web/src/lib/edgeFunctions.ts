import { supabase } from "@/integrations/supabase/client";
import { ensureOnline, normalizeAppError } from "@/lib/appErrors";
import { getTrustedAccessToken } from "@/lib/authSession";

type EdgeFunctionErrorPayload = {
  error?: string;
  message?: string;
};

const FUNCTIONS_BASE_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : "";

const FUNCTIONS_API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

async function getAccessToken({
  waitForSession = false,
  allowRefresh = false,
}: {
  waitForSession?: boolean;
  allowRefresh?: boolean;
} = {}) {
  const attempts = waitForSession ? 4 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const sessionResult = await supabase.auth.getSession();
    const currentSession = sessionResult.data.session ?? null;

    if (currentSession) {
      const trustedToken = await getTrustedAccessToken({
        initialSession: currentSession,
        attempts: allowRefresh ? 2 : 1,
        waitMs: 1400,
      });

      if (trustedToken) {
        return trustedToken;
      }

      return currentSession.access_token;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 900));
    }
  }

  return null;
}

async function invokeEdgeFunctionRequest<T>(
  functionName: string,
  body: Record<string, unknown> | undefined,
  accessToken: string | null,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: FUNCTIONS_API_KEY,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const rawText = await response.text();

  let parsed: T | EdgeFunctionErrorPayload | null = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as T | EdgeFunctionErrorPayload;
    } catch {
      parsed = null;
    }
  }

  return {
    response,
    parsed,
    rawText,
  };
}

export async function invokeEdgeFunction<T>(
  functionName: string,
  body?: Record<string, unknown>,
) {
  try {
    ensureOnline();
    const initialAccessToken = await getAccessToken({ waitForSession: true });

    let result = await invokeEdgeFunctionRequest<T>(functionName, body, initialAccessToken);

    if (result.response.status === 401) {
      // Freshly verified email sessions can need one auth-server round trip before function JWT checks pass.
      await new Promise((resolve) => window.setTimeout(resolve, 2500));
      const retryAccessToken = await getAccessToken({
        waitForSession: true,
        allowRefresh: true,
      });
      result = await invokeEdgeFunctionRequest<T>(
        functionName,
        body,
        retryAccessToken ?? initialAccessToken,
      );
    }

    if (result.response.status === 401) {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) {
        const repairedToken = await getTrustedAccessToken({
          initialSession: data.session,
          attempts: 2,
          waitMs: 1600,
        });
        result = await invokeEdgeFunctionRequest<T>(
          functionName,
          body,
          repairedToken ?? data.session.access_token,
        );
      }
    }

    if (!result.response.ok) {
      const errorPayload = result.parsed as EdgeFunctionErrorPayload | null;
      const errorMessage =
        errorPayload?.error ||
        errorPayload?.message ||
        (result.response.status === 401
          ? "Your session was not ready. Please wait a moment and try again."
          : result.rawText) ||
        "We could not complete that request right now. Please try again.";
      throw new Error(errorMessage);
    }

    const payload = result.parsed as EdgeFunctionErrorPayload | null;
    if (payload?.error) {
      throw new Error(payload.error);
    }

    return (result.parsed as T) ?? ({} as T);
  } catch (error) {
    throw normalizeAppError(
      error,
      `We could not complete that request right now. Please try again.`,
    );
  }
}
