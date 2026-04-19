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
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile as updateFirebaseProfile,
  type User,
} from "firebase/auth";
import {
  firebaseAuth,
  hasFirebaseConfig,
  FIREBASE_SETUP_MESSAGE,
} from "@/integrations/firebase/client";
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
  clearSignupSeed,
  type AuthProfileSeed,
  getAuthErrorMessage,
  getAuthProfileSeed,
  persistSignupSeed,
} from "@/lib/authProfile";
import { resolveTrustedSession, type AuthSession } from "@/lib/authSession";

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
  session: AuthSession | null;
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
  sendPasswordReset: (email: string) => Promise<void>;
  refreshAuthUser: () => Promise<boolean>;
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
  return typeof window === "undefined" ? undefined : `${window.location.origin}/auth?mode=signin`;
}

function getActionCodeSettings() {
  const redirect = getAuthRedirectTo();
  return redirect ? { url: redirect, handleCodeInApp: false } : undefined;
}

export function PublicUserProvider({ children }: { children: ReactNode }) {
  const legacyPublicUserId = useMemo(() => getStoredPublicUserId(), []);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<BootstrapData>(getEmptyBootstrap());
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const authResolutionId = useRef(0);

  const authProfileSeed = useMemo(() => getAuthProfileSeed(user), [user]);
  const requiresPasswordSetup = false;

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

    const cached = readCachedBootstrap(nextUser.uid);
    setBootstrap(cached ?? getEmptyBootstrap(nextUser.uid, nextUser.email ?? null));
  }, []);

  const handleRefreshFailure = useCallback((targetUser: User | null, error: unknown) => {
    if (targetUser) {
      const cached = readCachedBootstrap(targetUser.uid);
      if (cached) {
        setBootstrap(cached);
      } else {
        setBootstrap(getEmptyBootstrap(targetUser.uid, targetUser.email ?? null));
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

  const syncAuthState = useCallback(async (nextUser: User | null) => {
    const resolutionId = authResolutionId.current + 1;
    authResolutionId.current = resolutionId;

    if (!nextUser) {
      setSession(null);
      setUser(null);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);

    try {
      const trusted = await resolveTrustedSession(nextUser, {
        attempts: 3,
        waitMs: 800,
      });

      if (authResolutionId.current !== resolutionId) {
        return;
      }

      setSession(trusted.session);
      setUser(trusted.user ?? nextUser);
    } catch {
      if (authResolutionId.current !== resolutionId) {
        return;
      }

      setSession(null);
      setUser(nextUser);
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

      if (!activeUser.emailVerified) {
        resetWorkspace(activeUser);
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
    if (!firebaseAuth) {
      setAuthLoading(false);
      setWorkspaceLoading(false);
      return;
    }

    void syncAuthState(firebaseAuth.currentUser);

    const unsubscribe = onIdTokenChanged(firebaseAuth, (nextUser) => {
      void syncAuthState(nextUser);
    });

    return () => {
      unsubscribe();
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
    if (!user?.emailVerified) {
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
      if (!user?.emailVerified) {
        throw new Error("Sign in and verify your email to continue.");
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
      if (!hasFirebaseConfig || !firebaseAuth) {
        throw new Error(FIREBASE_SETUP_MESSAGE);
      }

      try {
        const normalizedEmail = email.trim().toLowerCase();
        const trimmedName = full_name.trim();
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          normalizedEmail,
          password,
        );

        if (trimmedName) {
          await updateFirebaseProfile(credential.user, {
            displayName: trimmedName,
          });
        }

        persistSignupSeed(credential.user.uid, {
          country: country.trim() || "United States",
          phone_number: phone_number.trim(),
          updates_opt_in,
          password_setup_completed: true,
        });

        await sendEmailVerification(credential.user, getActionCodeSettings());
        await syncAuthState(firebaseAuth.currentUser ?? credential.user);

        return {
          requiresEmailVerification: true,
        };
      } catch (error) {
        throw new Error(
          getAuthErrorMessage(error, "We could not create your account. Please try again."),
        );
      }
    },
    [syncAuthState],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!hasFirebaseConfig || !firebaseAuth) {
        throw new Error(FIREBASE_SETUP_MESSAGE);
      }

      try {
        const credential = await signInWithEmailAndPassword(
          firebaseAuth,
          email.trim().toLowerCase(),
          password,
        );
        await syncAuthState(credential.user);

        if (!credential.user.emailVerified) {
          const verificationError = new Error(
            "Verify your email before signing in. You can resend the verification email below.",
          ) as Error & { code?: string };
          verificationError.code = "email_not_confirmed";
          throw verificationError;
        }
      } catch (error) {
        throw new Error(getAuthErrorMessage(error, "We could not sign you in. Please try again."));
      }
    },
    [syncAuthState],
  );

  const resendVerificationEmail = useCallback(async (email: string) => {
    if (!hasFirebaseConfig || !firebaseAuth) {
      throw new Error(FIREBASE_SETUP_MESSAGE);
    }

    const activeUser = firebaseAuth.currentUser;
    if (!activeUser) {
      throw new Error("Sign in first so eva can resend the verification email.");
    }

    if ((activeUser.email ?? "").trim().toLowerCase() !== email.trim().toLowerCase()) {
      throw new Error("Sign in with that email first, then resend the verification email.");
    }

    try {
      await sendEmailVerification(activeUser, getActionCodeSettings());
      await syncAuthState(activeUser);
    } catch (error) {
      throw new Error(
        getAuthErrorMessage(
          error,
          "We could not resend the verification email. Please try again.",
        ),
      );
    }
  }, [syncAuthState]);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!hasFirebaseConfig || !firebaseAuth) {
      throw new Error(FIREBASE_SETUP_MESSAGE);
    }

    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase(), getActionCodeSettings());
    } catch (error) {
      throw new Error(
        getAuthErrorMessage(error, "We could not send the password reset email right now."),
      );
    }
  }, []);

  const refreshAuthUser = useCallback(async () => {
    if (!firebaseAuth?.currentUser) {
      return false;
    }

    await firebaseAuth.currentUser.reload();
    const refreshedUser = firebaseAuth.currentUser;
    await syncAuthState(refreshedUser);
    return Boolean(refreshedUser?.emailVerified);
  }, [syncAuthState]);

  const completeLegacyPasswordSetup = useCallback(
    async (password: string) => {
      if (!firebaseAuth?.currentUser) {
        throw new Error("Sign in to continue.");
      }

      try {
        await updatePassword(firebaseAuth.currentUser, password);
      } catch (error) {
        throw new Error(
          getAuthErrorMessage(
            error,
            "We could not finish setting your password. Please try again.",
          ),
        );
      }

      persistSignupSeed(firebaseAuth.currentUser.uid, {
        country: bootstrap.profile?.country || authProfileSeed.country,
        phone_number: bootstrap.profile?.phone_number || authProfileSeed.phone_number,
        updates_opt_in: bootstrap.profile?.updates_opt_in ?? authProfileSeed.updates_opt_in,
        password_setup_completed: true,
      });

      if (firebaseAuth.currentUser.emailVerified && user?.emailVerified) {
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
      }
    },
    [authProfileSeed, bootstrap.profile, runMutation, user],
  );

  const signOut = useCallback(async () => {
    if (firebaseAuth) {
      await firebaseSignOut(firebaseAuth);
    }

    clearSignupSeed(user?.uid);
    clearCachedBootstrap();
    setBootstrap(getEmptyBootstrap());
  }, [user?.uid]);

  const loading = authLoading || workspaceLoading;

  const value = useMemo<PublicUserContextValue>(
    () => ({
      session,
      user,
      userId: user?.uid ?? "",
      legacyPublicUserId,
      isAuthenticated: Boolean(user?.emailVerified),
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
      sendPasswordReset,
      refreshAuthUser,
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
      refreshAuthUser,
      refreshing,
      resendVerificationEmail,
      requiresPasswordSetup,
      runMutation,
      saving,
      sendPasswordReset,
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
