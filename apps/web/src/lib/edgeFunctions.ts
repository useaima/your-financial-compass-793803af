import { firebaseAuth, getFirebaseFunctionUrl } from "@/integrations/supabase/client";
import { ensureOnline, normalizeAppError } from "@/lib/appErrors";
import { getTrustedAccessToken } from "@/lib/authSession";

type EdgeFunctionErrorPayload = {
  error?: string;
  message?: string;
};

async function getAccessToken({
  waitForSession = false,
  allowRefresh = false,
}: {
  waitForSession?: boolean;
  allowRefresh?: boolean;
} = {}) {
  const attempts = waitForSession ? 4 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const currentUser = firebaseAuth?.currentUser ?? null;

    if (currentUser) {
      const trustedToken = await getTrustedAccessToken({
        initialUser: currentUser,
        attempts: allowRefresh ? 2 : 1,
        waitMs: 1400,
      });

      if (trustedToken) {
        return trustedToken;
      }

      return currentUser.getIdToken();
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
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(getFirebaseFunctionUrl(functionName), {
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
      const currentUser = firebaseAuth?.currentUser ?? null;
      if (currentUser) {
        const repairedToken = await currentUser.getIdToken(true).catch(() => null);
        result = await invokeEdgeFunctionRequest<T>(functionName, body, repairedToken);
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
