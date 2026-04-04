import { supabase } from "@/integrations/supabase/client";
import { ensureOnline, normalizeAppError } from "@/lib/appErrors";

type EdgeFunctionErrorPayload = {
  error?: string;
};

export async function invokeEdgeFunction<T>(
  functionName: string,
  body?: Record<string, unknown>,
) {
  try {
    ensureOnline();

    const { data, error } = await supabase.functions.invoke(
      functionName,
      body ? { body } : undefined,
    );

    if (error) {
      throw error;
    }

    const payload = data as EdgeFunctionErrorPayload | null;
    if (payload?.error) {
      throw new Error(payload.error);
    }

    return data as T;
  } catch (error) {
    throw normalizeAppError(
      error,
      `We could not complete that request right now. Please try again.`,
    );
  }
}
