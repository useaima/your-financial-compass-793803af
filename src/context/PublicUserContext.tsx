import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  completeOnboarding,
  deleteBudgetLimit,
  deleteFinancialEntry,
  deleteGoal,
  deleteSubscription,
  fetchBootstrap,
  getEmptyBootstrap,
  saveBudgetLimit,
  saveFinancialEntry,
  saveGoal,
  saveSubscription,
  updateProfile,
  type BootstrapData,
  type BudgetLimit,
  type FinancialEntry,
  type OnboardingPayload,
  type Subscription,
  type UserGoal,
  type UserProfile,
} from "@/lib/publicData";
import { handleAppError, normalizeAppError } from "@/lib/appErrors";
import { getOrCreatePublicUserId } from "@/lib/publicUser";

type PublicUserContextValue = {
  publicUserId: string;
  bootstrap: BootstrapData;
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
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
};

const PublicUserContext = createContext<PublicUserContextValue | undefined>(undefined);
const BOOTSTRAP_CACHE_KEY = "eva-bootstrap-cache";

function readCachedBootstrap(publicUserId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as BootstrapData;
    return cached.public_user_id === publicUserId ? cached : null;
  } catch {
    return null;
  }
}

function writeCachedBootstrap(bootstrap: BootstrapData) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(bootstrap));
}

export function PublicUserProvider({ children }: { children: ReactNode }) {
  const publicUserId = useMemo(() => getOrCreatePublicUserId(), []);
  const [bootstrap, setBootstrap] = useState<BootstrapData>(
    () => readCachedBootstrap(publicUserId) ?? getEmptyBootstrap(),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const applyBootstrap = useCallback((data: BootstrapData) => {
    setBootstrap(data);
    writeCachedBootstrap(data);
  }, []);

  const handleRefreshFailure = useCallback((error: unknown) => {
    const cached = readCachedBootstrap(publicUserId);
    if (cached) {
      setBootstrap(cached);
    }

    const message =
      error instanceof Error
        ? error.message
        : handleAppError(error, "We could not load your workspace. Please try again.").message;
    console.warn(message);
  }, [publicUserId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchBootstrap();
      applyBootstrap(data);
    } catch (error) {
      handleRefreshFailure(error);
    } finally {
      setRefreshing(false);
    }
  }, [applyBootstrap, handleRefreshFailure]);

  const initialize = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBootstrap();
      applyBootstrap(data);
    } catch (error) {
      handleRefreshFailure(error);
    } finally {
      setLoading(false);
    }
  }, [applyBootstrap, handleRefreshFailure]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const runMutation = useCallback(async (callback: () => Promise<BootstrapData>) => {
    setSaving(true);
    try {
      const data = await callback();
      setBootstrap(data);
      writeCachedBootstrap(data);
    } catch (error) {
      throw error instanceof Error
        ? error
        : normalizeAppError(error, "We could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }, []);

  const value = useMemo<PublicUserContextValue>(() => ({
    publicUserId,
    bootstrap,
    loading,
    refreshing,
    saving,
    refresh,
    completeOnboarding: async (payload) => runMutation(() => completeOnboarding(payload)),
    updateProfile: async (payload) => runMutation(() => updateProfile(payload)),
    saveGoal: async (goal) => runMutation(() => saveGoal(goal)),
    deleteGoal: async (goalId) => runMutation(() => deleteGoal(goalId)),
    saveBudgetLimit: async (limit) => runMutation(() => saveBudgetLimit(limit)),
    deleteBudgetLimit: async (limitId) => runMutation(() => deleteBudgetLimit(limitId)),
    saveSubscription: async (subscription) => runMutation(() => saveSubscription(subscription)),
    deleteSubscription: async (subscriptionId) => runMutation(() => deleteSubscription(subscriptionId)),
    saveFinancialEntry: async (entry) => runMutation(() => saveFinancialEntry(entry)),
    deleteFinancialEntry: async (entryId) => runMutation(() => deleteFinancialEntry(entryId)),
  }), [
    bootstrap,
    loading,
    publicUserId,
    refreshing,
    refresh,
    runMutation,
    saving,
  ]);

  return (
    <PublicUserContext.Provider value={value}>
      {children}
    </PublicUserContext.Provider>
  );
}

export function usePublicUser() {
  const context = useContext(PublicUserContext);
  if (!context) {
    throw new Error("usePublicUser must be used inside PublicUserProvider");
  }
  return context;
}
