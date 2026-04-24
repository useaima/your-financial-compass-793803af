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
  checkAffordability as requestAffordabilityCheck,
  completeOnboarding,
  deleteBudgetLimit,
  deleteFinancialEntry,
  deleteGoal,
  deleteSubscription,
  fetchBootstrap,
  getEmptyBootstrap,
  importCsvTransactions as importWorkspaceCsvTransactions,
  markNotificationRead as markWorkspaceNotificationRead,
  reviewDraftTransaction as reviewWorkspaceDraftTransaction,
  saveBudgetLimit,
  saveFinancialEntry,
  saveGoal,
  saveSubscription,
  updateProfile as updateWorkspaceProfile,
} from "@/lib/workspaceData";
import type {
  AffordabilityResult,
  BootstrapData,
  BudgetLimit,
  DraftTransaction,
  FinancialEntry,
  OnboardingPayload,
  Subscription,
  UserGoal,
  UserProfile,
} from "@/lib/evaContracts";
import { handleAppError, normalizeAppError } from "@/lib/appErrors";
import { getStoredPublicUserId } from "@/lib/publicUser";
import {
  type AuthProfileSeed,
  getAuthErrorMessage,
  getAuthProfileSeed,
  hasPasswordSetup,
  splitFullName,
} from "@/lib/authProfile";
import { resolveTrustedSession } from "@/lib/authSession";

type SignUpPayload = {
  full_name: string;
  email: string;
  country: string;
  phone_number: string;
  password: string;
  updates_opt_in: boolean;
};

type SignUpResult = {
  requiresEmailVerification: boolean;
};

type WorkspaceUser = {
  id: string;
  email: string | null;
};

type PublicUserContextValue = {
  session: Session | null;
  user: User | null;
  userId: string;
  legacyPublicUserId: string;
  isAuthenticated: boolean;
  authLoading: boolean;
  authProfileSeed: AuthProfileSeed;
  requiresPasswordSetup: boolean;
  bootstrap: BootstrapData;
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  workspaceError: string | null;
  signUpWithPassword: (payload: SignUpPayload) => Promise<SignUpResult>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  sendLegacyMagicLink: (email: string) => Promise<void>;
  completeLegacyPasswordSetup: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  completeOnboarding: (payload: OnboardingPayload) => Promise<void>;
  updateProfile: (payload: Partial<UserProfile>) => Promise<void>;
  saveGoal: (goal: Partial<UserGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  saveBudgetLimit: (limit: Partial<BudgetLimit>) => Promise<void>;
  deleteBudgetLimit: (limitId: string) => Promise<void>;
  saveSubscription: (subscription: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (subscriptionId: string) => Promise<void>;
  saveFinancialEntry: (entry: Partial<FinancialEntry>) => Promise<void>;
  deleteFinancialEntry: (entryId: string) => Promise<void>;
  checkAffordability: (input: {
    amount: number;
    category?: string | null;
    cadence?: "one_time" | "monthly";
  }) => Promise<AffordabilityResult>;
  importCsvTransactions: (csvText: string, fileName: string) => Promise<void>;
  reviewDraftTransaction: (input: {
    draftTransactionId: string;
    decision: "approve" | "reject" | "edit";
    updates?: Partial<DraftTransaction>;
  }) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
};

const PublicUserContext = createContext<PublicUserContextValue | undefined>(undefined);
const BOOTSTRAP_CACHE_KEY = "eva-workspace-cache";

function readCachedBootstrap(userId: string) {
  if (typeof window === "undefined" || !userId) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as BootstrapData;
    return cached.user_id === userId ? cached : null;
  } catch {
    return null;
  }
}

function writeCachedBootstrap(bootstrap: BootstrapData) {
  if (typeof window === "undefined" || !bootstrap.user_id) {
    return;
  }

  window.localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(bootstrap));
}

function clearCachedBootstrap() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
}

function getAuthRedirectTo() {
  return typeof window === "undefined" ? undefined : `${window.location.origin}/auth`;
}

export function PublicUserProvider({ children }: { children: ReactNode }) {
  const legacyPublicUserId = useMemo(() => getStoredPublicUserId(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<BootstrapData>(getEmptyBootstrap());
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceResolvedUserId, setWorkspaceResolvedUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const authResolutionId = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);
  const bootstrapRef = useRef<BootstrapData>(getEmptyBootstrap());
  const currentUserId = user?.id ?? null;
  const currentUserEmail = user?.email ?? null;

  const authProfileSeed = useMemo(() => getAuthProfileSeed(user), [user]);
  const activeWorkspaceUser = useMemo<WorkspaceUser | null>(
    () => (currentUserId ? { id: currentUserId, email: currentUserEmail } : null),
    [currentUserEmail, currentUserId],
  );
  const requiresPasswordSetup = useMemo(
    () => Boolean(user) && !hasPasswordSetup(user, bootstrap.profile),
    [bootstrap.profile, user],
  );

  const applyBootstrap = useCallback((data: BootstrapData) => {
    setBootstrap(data);
    bootstrapRef.current = data;
    setWorkspaceError(null);
    writeCachedBootstrap(data);
  }, []);

  const resetWorkspace = useCallback((nextUser: WorkspaceUser | null) => {
    if (!nextUser) {
      clearCachedBootstrap();
      const emptyBootstrap = getEmptyBootstrap();
      bootstrapRef.current = emptyBootstrap;
      setBootstrap(emptyBootstrap);
      setWorkspaceError(null);
      setWorkspaceResolvedUserId(null);
      return;
    }

    const cached = readCachedBootstrap(nextUser.id);
    const nextBootstrap = cached ?? getEmptyBootstrap(nextUser.id, nextUser.email ?? null);
    bootstrapRef.current = nextBootstrap;
    setBootstrap(nextBootstrap);
    setWorkspaceError(null);
  }, []);

  const handleRefreshFailure = useCallback((targetUser: WorkspaceUser | null, error: unknown) => {
    const activeBootstrap = bootstrapRef.current;

    if (targetUser) {
      const cached = readCachedBootstrap(targetUser.id);
      const canReuseActiveBootstrap =
        activeBootstrap.user_id === targetUser.id &&
        (activeBootstrap.has_onboarded ||
          Boolean(activeBootstrap.profile) ||
          activeBootstrap.goals.length > 0 ||
          activeBootstrap.budget_limits.length > 0 ||
          activeBootstrap.spending_events.length > 0 ||
          activeBootstrap.financial_entries.length > 0 ||
          activeBootstrap.subscriptions.length > 0);

      const fallbackBootstrap =
        cached ??
        (canReuseActiveBootstrap
          ? activeBootstrap
          : getEmptyBootstrap(targetUser.id, targetUser.email ?? null));

      bootstrapRef.current = fallbackBootstrap;
      setBootstrap(fallbackBootstrap);
    } else {
      const emptyBootstrap = getEmptyBootstrap();
      bootstrapRef.current = emptyBootstrap;
      setBootstrap(emptyBootstrap);
    }

    const message =
      error instanceof Error
        ? error.message
        : handleAppError(error, "We could not load your workspace. Please try again.").message;
    setWorkspaceError(message);
    console.warn(message);
  }, []);

  const syncAuthState = useCallback(async (nextSession: Session | null) => {
    const resolutionId = authResolutionId.current + 1;
    authResolutionId.current = resolutionId;

    if (!nextSession) {
      currentUserIdRef.current = null;
      setSession(null);
      setUser(null);
      setWorkspaceError(null);
      setWorkspaceResolvedUserId(null);
      setAuthLoading(false);
      return;
    }

    const nextUserId = nextSession.user?.id ?? null;
    const isSameUserRefresh =
      Boolean(nextUserId) && Boolean(currentUserIdRef.current) && currentUserIdRef.current === nextUserId;

    if (!isSameUserRefresh) {
      setAuthLoading(true);
      setWorkspaceResolvedUserId(null);
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

  const initialize = useCallback(
    async (activeUser: WorkspaceUser | null) => {
      if (!activeUser) {
        resetWorkspace(null);
        setWorkspaceLoading(false);
        setWorkspaceError(null);
        setWorkspaceResolvedUserId(null);
        return;
      }

      setWorkspaceLoading(true);
      try {
        const data = await fetchBootstrap({ legacyPublicUserId });
        applyBootstrap(data);
        setWorkspaceResolvedUserId(activeUser.id);
      } catch (error) {
        handleRefreshFailure(activeUser, error);
        setWorkspaceResolvedUserId(activeUser.id);
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [applyBootstrap, handleRefreshFailure, legacyPublicUserId, resetWorkspace],
  );

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

  useEffect(() => {
    if (authLoading) {
      return;
    }

    resetWorkspace(activeWorkspaceUser);
    void initialize(activeWorkspaceUser);
  }, [activeWorkspaceUser, authLoading, initialize, resetWorkspace]);

  const refresh = useCallback(async () => {
    if (!user) {
      return;
    }

    setRefreshing(true);
    setWorkspaceError(null);
    try {
      const data = await fetchBootstrap({ legacyPublicUserId });
      applyBootstrap(data);
      setWorkspaceResolvedUserId(user.id);
    } catch (error) {
      handleRefreshFailure(
        user ? { id: user.id, email: user.email ?? null } : null,
        error,
      );
      setWorkspaceResolvedUserId(user.id);
    } finally {
      setRefreshing(false);
    }
  }, [applyBootstrap, handleRefreshFailure, legacyPublicUserId, user]);

  const runMutation = useCallback(
    async (callback: () => Promise<BootstrapData>) => {
      if (!user) {
        throw new Error("Sign in to continue.");
      }

      setSaving(true);
      try {
        const data = await callback();
        applyBootstrap(data);
      } catch (error) {
        throw error instanceof Error
          ? error
          : normalizeAppError(error, "We could not save your changes. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [applyBootstrap, user],
  );

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
      throw normalizeAppError(error, "We could not sign you out. Please try again.");
    }

    clearCachedBootstrap();
    setWorkspaceError(null);
    setWorkspaceResolvedUserId(null);
    setBootstrap(getEmptyBootstrap());
  }, []);

  const loading =
    authLoading ||
    workspaceLoading ||
    (Boolean(user) && workspaceResolvedUserId !== user.id);

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
