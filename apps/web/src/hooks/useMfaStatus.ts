import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicUser } from "@/context/PublicUserContext";

export type MfaFactorSummary = {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
};

type LoadMfaStatusResult = {
  assuranceLevel: string | null;
  factors: MfaFactorSummary[];
  hasVerifiedMfa: boolean;
};

const EMPTY_MFA_STATUS: LoadMfaStatusResult = {
  assuranceLevel: null,
  factors: [],
  hasVerifiedMfa: false,
};

export function useMfaStatus() {
  const { user } = usePublicUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assuranceLevel, setAssuranceLevel] = useState<string | null>(null);
  const [factors, setFactors] = useState<MfaFactorSummary[]>([]);

  const loadStatus = useCallback(async (): Promise<LoadMfaStatusResult> => {
    if (!user) {
      setFactors([]);
      setAssuranceLevel(null);
      setError(null);
      return EMPTY_MFA_STATUS;
    }

    setLoading(true);
    try {
      const [factorsResult, assuranceResult] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      if (factorsResult.error) {
        throw factorsResult.error;
      }

      if (assuranceResult.error) {
        throw assuranceResult.error;
      }

      const nextFactors = (factorsResult.data?.all ?? []) as MfaFactorSummary[];
      const hasVerifiedMfa = nextFactors.some(
        (factor) => factor.factor_type === "totp" && factor.status === "verified",
      );
      const nextStatus = {
        assuranceLevel: assuranceResult.data?.currentLevel ?? null,
        factors: nextFactors,
        hasVerifiedMfa,
      };

      setFactors(nextFactors);
      setAssuranceLevel(nextStatus.assuranceLevel);
      setError(null);

      return nextStatus;
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "We could not load your MFA status right now.";
      setError(message);
      return EMPTY_MFA_STATUS;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const verifiedTotpFactors = useMemo(
    () => factors.filter((factor) => factor.factor_type === "totp" && factor.status === "verified"),
    [factors],
  );

  return {
    assuranceLevel,
    error,
    factors,
    hasVerifiedMfa: verifiedTotpFactors.length > 0,
    loading,
    refresh: loadStatus,
    verifiedTotpFactors,
  };
}
