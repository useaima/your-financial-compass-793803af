import type { Session, User } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "@/integrations/supabase/client";

type TrustedSessionResult = {
  session: Session | null;
  user: User | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function decodeJwtPayload(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded)) as { iat?: number; exp?: number };
  } catch {
    return null;
  }
}

async function waitForTokenActivation(accessToken: string) {
  const payload = decodeJwtPayload(accessToken);
  const issuedAt = payload?.iat;

  if (!issuedAt) {
    return;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const delaySeconds = issuedAt - currentTime;

  if (delaySeconds > 0) {
    await sleep((delaySeconds + 1) * 1000);
  }
}

async function validateSession(session: Session | null): Promise<TrustedSessionResult> {
  if (!session?.access_token) {
    return { session: null, user: null };
  }

  await waitForTokenActivation(session.access_token);

  const { data, error } = await supabase.auth.getUser(session.access_token);
  if (error || !data.user) {
    return { session: null, user: null };
  }

  return {
    session: {
      ...session,
      user: data.user,
    },
    user: data.user,
  };
}

async function refreshTrustedSession(
  currentSession: Session | null,
): Promise<TrustedSessionResult> {
  if (!currentSession?.refresh_token) {
    return { session: null, user: null };
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: currentSession.refresh_token,
  });

  if (error || !data.session) {
    return { session: null, user: null };
  }

  return validateSession(data.session);
}

export async function resolveTrustedSession(
  initialSession?: Session | null,
  {
    attempts = 3,
    waitMs = 1200,
  }: {
    attempts?: number;
    waitMs?: number;
  } = {},
): Promise<TrustedSessionResult> {
  if (!hasSupabaseConfig) {
    return { session: null, user: null };
  }

  let candidate = initialSession ?? null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!candidate) {
      const { data } = await supabase.auth.getSession();
      candidate = data.session ?? null;
    }

    const trusted = await validateSession(candidate);
    if (trusted.session && trusted.user) {
      return trusted;
    }

    const refreshed = await refreshTrustedSession(candidate);
    if (refreshed.session && refreshed.user) {
      return refreshed;
    }

    candidate = null;

    if (attempt < attempts - 1) {
      await sleep(waitMs);
    }
  }

  return { session: null, user: null };
}

export async function getTrustedAccessToken(options?: {
  initialSession?: Session | null;
  attempts?: number;
  waitMs?: number;
}) {
  const trusted = await resolveTrustedSession(options?.initialSession, {
    attempts: options?.attempts,
    waitMs: options?.waitMs,
  });

  return trusted.session?.access_token ?? null;
}
