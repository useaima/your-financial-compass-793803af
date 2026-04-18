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
  signUpWithPassword: (payload: SignUpPayload) => Promise<SignUpResult>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
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
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const authResolutionId = useRef(0);

  const authProfileSeed = useMemo(() => getAuthProfileSeed(user), [user]);
  const requiresPasswordSetup = useMemo(
    () => Boolean(user) && !hasPasswordSetup(user, bootstrap.profile),
    [bootstrap.profile, user],
  );

  const applyBootstrap = useCallback((data: BootstrapData) => {
    setBootstrap(data);
    writeCachedBootstrap(data);
  }, []);

  const resetWorkspace = useCallback((nextUser: User | null) => {
    if (!nextUser) {
      clearCachedBootstrap();
      setBootstrap(getEmptyBootstrap());
      return;
    }

    const cached = readCachedBootstrap(nextUser.id);
    setBootstrap(cached ?? getEmptyBootstrap(nextUser.id, nextUser.email ?? null));
  }, []);

  const handleRefreshFailure = useCallback((targetUser: User | null, error: unknown) => {
    if (targetUser) {
      const cached = readCachedBootstrap(targetUser.id);
      if (cached) {
        setBootstrap(cached);
      } else {
        setBootstrap(getEmptyBootstrap(targetUser.id, targetUser.email ?? null));
      }
    } else {
      setBootstrap(getEmptyBootstrap());
    }

    const message =
      error instanceof Error
        ? error.message
        : handleAppError(error, "We could not load your workspace. Please try again.").message;
    console.warn(message);
  }, []);

  const syncAuthState = useCallback(async (nextSession: Session | null) => {
    const resolutionId = authResolutionId.current + 1;
    authResolutionId.current = resolutionId;

    if (!nextSession) {
      setSession(null);
      setUser(null);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);

    try {
      const trusted = await resolveTrustedSession(nextSession, {
        attempts: 3,
        waitMs: 1500,
      });

      if (authResolutionId.current !== resolutionId) {
        return;
      }

      if (!trusted.session || !trusted.user) {
        await supabase.auth.signOut().catch(() => undefined);
        setSession(null);
        setUser(null);
        return;
      }

      setSession(trusted.session);
      setUser(trusted.user);
    } catch {
      if (authResolutionId.current !== resolutionId) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession.user ?? null);
    } finally {
      if (authResolutionId.current === resolutionId) {
        setAuthLoading(false);
      }
    }
  }, []);

  const initialize = useCallback(
    async (activeUser: User | null) => {
      if (!activeUser) {
        resetWorkspace(null);
        setWorkspaceLoading(false);
        return;
      }

      setWorkspaceLoading(true);
      try {
        const data = await fetchBootstrap({ legacyPublicUserId });
        applyBootstrap(data);
      } catch (error) {
        handleRefreshFailure(activeUser, error);
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
    if (authLoading) {
      return;
    }

    resetWorkspace(user);
    void initialize(user);
  }, [authLoading, initialize, resetWorkspace, user]);

  const refresh = useCallback(async () => {
    if (!user) {
      return;
    }

    setRefreshing(true);
    try {
      const data = await fetchBootstrap({ legacyPublicUserId });
      applyBootstrap(data);
    } catch (error) {
      handleRefreshFailure(user, error);
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
    setBootstrap(getEmptyBootstrap());
  }, []);

  const loading = authLoading || workspaceLoading;

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
      signUpWithPassword,
      signInWithPassword,
      resendVerificationEmail,
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
