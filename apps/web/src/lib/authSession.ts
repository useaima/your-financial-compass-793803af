import type { User } from "firebase/auth";
import { firebaseAuth } from "@/integrations/supabase/client";

export type AuthSession = {
  access_token: string;
  user: User;
};

type TrustedSessionResult = {
  session: AuthSession | null;
  user: User | null;
};

async function wait(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function buildSession(user: User | null): Promise<TrustedSessionResult> {
  if (!user) {
    return { session: null, user: null };
  }

  try {
    await user.reload();
  } catch {
    // Keep going with the cached auth user if reload fails.
  }

  const activeUser = firebaseAuth?.currentUser ?? user;
  if (!activeUser) {
    return { session: null, user: null };
  }

  const accessToken = await activeUser.getIdToken();
  return {
    session: {
      access_token: accessToken,
      user: activeUser,
    },
    user: activeUser,
  };
}

export async function resolveTrustedSession(
  initialUser: User | null,
  options?: { attempts?: number; waitMs?: number },
) {
  const attempts = Math.max(1, options?.attempts ?? 1);
  let candidate = initialUser ?? firebaseAuth?.currentUser ?? null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const trusted = await buildSession(candidate);
    if (trusted.session && trusted.user) {
      return trusted;
    }

    if (attempt < attempts - 1) {
      await wait(options?.waitMs ?? 800);
      candidate = firebaseAuth?.currentUser ?? null;
    }
  }

  return { session: null, user: null };
}

export async function getTrustedAccessToken(options?: {
  initialUser?: User | null;
  attempts?: number;
  waitMs?: number;
}) {
  const trusted = await resolveTrustedSession(options?.initialUser ?? null, {
    attempts: options?.attempts ?? 1,
    waitMs: options?.waitMs ?? 800,
  });

  return trusted.session?.access_token ?? null;
}
