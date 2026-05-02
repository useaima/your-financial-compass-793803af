import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  supabase,
  hasSupabaseConfig,
  SUPABASE_SETUP_MESSAGE,
} from "@/integrations/supabase/client";
import {
  analyzeReceiptImage as analyzeWorkspaceReceiptImage,
  checkAffordability as requestAffordabilityCheck,
  completeOnboarding,
  deleteBudgetLimit,
  deleteFinancialEntry,
  deleteGoal,
  deleteSubscription,
  approveRequest as approveWorkspaceRequest,
  dispatchApprovedRequest as dispatchWorkspaceApprovedRequest,
  getReceiptForwardingAddress as getWorkspaceReceiptForwardingAddress,
  importCsvTransactions as importWorkspaceCsvTransactions,
  markNotificationRead as markWorkspaceNotificationRead,
  proposeBillAction as proposeWorkspaceBillAction,
  proposeSubscriptionAction as proposeWorkspaceSubscriptionAction,
  reconcileExecutionResult as reconcileWorkspaceExecutionResult,
  rejectRequest as rejectWorkspaceRequest,
  requestSensitiveActionCode as requestWorkspaceSensitiveActionCode,
  reviewDraftTransaction as reviewWorkspaceDraftTransaction,
  runAgentPlanner as runWorkspaceAgentPlanner,
  saveBudgetLimit,
  saveFinancialEntry,
  saveGoal,
  saveSubscription,
  updateAgentMode as updateWorkspaceAgentMode,
  updateProfile as updateWorkspaceProfile,
  verifySensitiveActionCode as verifyWorkspaceSensitiveActionCode,
} from "@/lib/workspaceData";
import { getStoredPublicUserId } from "@/lib/publicUser";
import {
  getAuthErrorMessage,
  getAuthProfileSeed,
  hasPasswordSetup,
  splitFullName,
} from "@/lib/authProfile";
import { resolveTrustedSession } from "@/lib/authSession";
import type {
  PublicUserContextValue,
  SignUpPayload,
  SignUpResult,
} from "./publicUserTypes";
import { useWorkspaceBootstrap } from "./useWorkspaceBootstrap";

const PublicUserContext = createContext<PublicUserContextValue | undefined>(undefined);

function getAuthRedirectTo() {
  return typeof window === "undefined" ? undefined : `${window.location.origin}/auth`;
}

export function PublicUserProvider({ children }: { children: ReactNode }) {
  const legacyPublicUserId = useMemo(() => getStoredPublicUserId(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const authResolutionId = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);

  const authProfileSeed = useMemo(() => getAuthProfileSeed(user), [user]);
  const {
    bootstrap,
    loading,
    refreshing,
    saving,
    workspaceError,
    refresh,
    runMutation,
    clearWorkspaceState,
  } = useWorkspaceBootstrap({
    user,
    authLoading,
    legacyPublicUserId,
  });
  const requiresPasswordSetup = useMemo(
    () => Boolean(user) && !hasPasswordSetup(user, bootstrap.profile),
    [bootstrap.profile, user],
  );

  const syncAuthState = useCallback(async (nextSession: Session | null) => {
    const resolutionId = authResolutionId.current + 1;
    authResolutionId.current = resolutionId;

    if (!nextSession) {
      currentUserIdRef.current = null;
      setSession(null);
      setUser(null);
      setAuthLoading(false);
      return;
    }

    const nextUserId = nextSession.user?.id ?? null;
    const isSameUserRefresh =
      Boolean(nextUserId) && Boolean(currentUserIdRef.current) && currentUserIdRef.current === nextUserId;

    if (!isSameUserRefresh) {
      setAuthLoading(true);
    }

    try {
      const trusted = await resolveTrustedSession(nextSession, {
        attempts: 3,
        waitMs: 1500,
      });

      if (authResolutionId.current !== resolutionId) {
        return;
      }

      if (!trusted.session || !trusted.user) {
        setSession(nextSession);
        setUser(nextSession.user ?? null);
        currentUserIdRef.current = nextSession.user?.id ?? null;
        return;
      }

      setSession(trusted.session);
      setUser(trusted.user);
      currentUserIdRef.current = trusted.user.id;
    } catch {
      if (authResolutionId.current !== resolutionId) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession.user ?? null);
      currentUserIdRef.current = nextSession.user?.id ?? null;
    } finally {
      if (authResolutionId.current === resolutionId) {
        setAuthLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) {
          return;
        }

        return syncAuthState(data.session ?? null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthState(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncAuthState]);

  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const signUpWithPassword = useCallback(
    async ({
      full_name,
      email,
      country,
      phone_number,
      password,
      updates_opt_in,
    }: SignUpPayload): Promise<SignUpResult> => {
      if (!hasSupabaseConfig) {
        throw new Error(SUPABASE_SETUP_MESSAGE);
      }

      const { first_name, last_name } = splitFullName(full_name);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectTo(),
          data: {
            full_name: full_name.trim(),
            first_name,
            last_name,
            country: country.trim(),
            phone_number: phone_number.trim(),
            updates_opt_in,
            password_setup_completed: true,
          },
        },
      });

      if (error) {
        throw new Error(
          getAuthErrorMessage(error, "We could not create your account. Please try again."),
        );
      }

      return {
        requiresEmailVerification: !data.session,
      };
    },
    [],
  );

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!hasSupabaseConfig) {
      throw new Error(SUPABASE_SETUP_MESSAGE);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(getAuthErrorMessage(error, "We could not sign you in. Please try again."));
    }
  }, []);

  const resendVerificationEmail = useCallback(async (email: string) => {
    if (!hasSupabaseConfig) {
      throw new Error(SUPABASE_SETUP_MESSAGE);
    }

    const { error } = await supabase.auth.resend({
      email,
      type: "signup",
      options: {
        emailRedirectTo: getAuthRedirectTo(),
      },
    });

    if (error) {
      throw new Error(
        getAuthErrorMessage(
          error,
          "We could not resend the verification email. Please try again.",
        ),
      );
    }
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    if (!hasSupabaseConfig) {
      throw new Error(SUPABASE_SETUP_MESSAGE);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedCode,
      type: "signup",
      options: {
        redirectTo: getAuthRedirectTo(),
      },
    });

    if (error) {
      throw new Error(
        getAuthErrorMessage(error, "We could not verify that code. Please try again."),
      );
    }
  }, []);

  const sendLegacyMagicLink = useCallback(async (email: string) => {
    if (!hasSupabaseConfig) {
      throw new Error(SUPABASE_SETUP_MESSAGE);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthRedirectTo(),
        shouldCreateUser: false,
      },
    });

    if (error) {
      throw new Error(
        getAuthErrorMessage(error, "We could not send the magic link. Please try again."),
      );
    }
  }, []);

  const completeLegacyPasswordSetup = useCallback(
    async (password: string) => {
      if (!user) {
        throw new Error("Sign in to continue.");
      }

      const { error: authError } = await supabase.auth.updateUser({
        password,
        data: {
          ...(user.user_metadata ?? {}),
          password_setup_completed: true,
        },
      });

      if (authError) {
        throw new Error(
          getAuthErrorMessage(
            authError,
            "We could not finish setting your password. Please try again.",
          ),
        );
      }

      await runMutation(() =>
        updateWorkspaceProfile({
          first_name: bootstrap.profile?.first_name || authProfileSeed.first_name,
          last_name: bootstrap.profile?.last_name || authProfileSeed.last_name,
          country: bootstrap.profile?.country || authProfileSeed.country,
          phone_number: bootstrap.profile?.phone_number || authProfileSeed.phone_number,
          updates_opt_in:
            bootstrap.profile?.updates_opt_in ?? authProfileSeed.updates_opt_in,
          user_type:
            bootstrap.profile?.user_type === "business" ? "business" : "personal",
          password_setup_completed: true,
        }),
      );
    },
    [authProfileSeed, bootstrap.profile, runMutation, user],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error("We could not sign you out. Please try again.");
    }

    clearWorkspaceState();
  }, [clearWorkspaceState]);

  const value = useMemo<PublicUserContextValue>(
    () => ({
      session,
      user,
      userId: user?.id ?? "",
      legacyPublicUserId,
      isAuthenticated: Boolean(user),
      authLoading,
      authProfileSeed,
      requiresPasswordSetup,
      bootstrap,
      loading,
      refreshing,
      saving,
      workspaceError,
      signUpWithPassword,
      signInWithPassword,
      resendVerificationEmail,
      verifyEmailCode,
      sendLegacyMagicLink,
      completeLegacyPasswordSetup,
      signOut,
      refresh,
      completeOnboarding: async (payload) =>
        runMutation(() => completeOnboarding(payload, { legacyPublicUserId })),
      updateProfile: async (payload) => runMutation(() => updateWorkspaceProfile(payload)),
      updateAgentMode: async (input) => runMutation(() => updateWorkspaceAgentMode(input)),
      runAgentPlanner: async () => runMutation(() => runWorkspaceAgentPlanner()),
      saveGoal: async (goal) => runMutation(() => saveGoal(goal)),
      deleteGoal: async (goalId) => runMutation(() => deleteGoal(goalId)),
      saveBudgetLimit: async (limit) => runMutation(() => saveBudgetLimit(limit)),
      deleteBudgetLimit: async (limitId) => runMutation(() => deleteBudgetLimit(limitId)),
      saveSubscription: async (subscription) => runMutation(() => saveSubscription(subscription)),
      deleteSubscription: async (subscriptionId) =>
        runMutation(() => deleteSubscription(subscriptionId)),
      saveFinancialEntry: async (entry) => runMutation(() => saveFinancialEntry(entry)),
      deleteFinancialEntry: async (entryId) =>
        runMutation(() => deleteFinancialEntry(entryId)),
      checkAffordability: async (input) => requestAffordabilityCheck(input),
      importCsvTransactions: async (csvText, fileName) =>
        runMutation(() => importWorkspaceCsvTransactions(csvText, fileName)),
      analyzeReceiptImage: async (imageDataUrl, fileName) =>
        runMutation(() => analyzeWorkspaceReceiptImage(imageDataUrl, fileName)),
      requestSensitiveActionCode: async (action) =>
        requestWorkspaceSensitiveActionCode(action),
      verifySensitiveActionCode: async (input) =>
        verifyWorkspaceSensitiveActionCode(input),
      getReceiptForwardingAddress: async (securityVerificationId) =>
        getWorkspaceReceiptForwardingAddress(securityVerificationId),
      proposeSubscriptionAction: async (input) =>
        runMutation(() => proposeWorkspaceSubscriptionAction(input)),
      proposeBillAction: async (input) =>
        runMutation(() => proposeWorkspaceBillAction(input)),
      approveRequest: async (input) =>
        runMutation(() => approveWorkspaceRequest(input)),
      rejectRequest: async (input) =>
        runMutation(() => rejectWorkspaceRequest(input)),
      dispatchApprovedRequest: async (approvalRequestId) =>
        runMutation(() => dispatchWorkspaceApprovedRequest(approvalRequestId)),
      reconcileExecutionResult: async (input) =>
        runMutation(() => reconcileWorkspaceExecutionResult(input)),
      reviewDraftTransaction: async (input) =>
        runMutation(() => reviewWorkspaceDraftTransaction(input)),
      markNotificationRead: async (notificationId) =>
        runMutation(() => markWorkspaceNotificationRead(notificationId)),
    }),
    [
      authLoading,
      authProfileSeed,
      bootstrap,
      completeLegacyPasswordSetup,
      legacyPublicUserId,
      loading,
      refresh,
      refreshing,
      resendVerificationEmail,
      requiresPasswordSetup,
      runMutation,
      saving,
      sendLegacyMagicLink,
      session,
      signInWithPassword,
      signOut,
      signUpWithPassword,
      user,
      verifyEmailCode,
      workspaceError,
    ],
  );

  return <PublicUserContext.Provider value={value}>{children}</PublicUserContext.Provider>;
}

export function usePublicUser() {
  const context = useContext(PublicUserContext);
  if (!context) {
    throw new Error("usePublicUser must be used inside PublicUserProvider");
  }
  return context;
}
