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
import { getOrCreatePublicUserId } from "@/lib/publicUser";

type PublicUserContextValue = {
  publicUserId: string;
  bootstrap: BootstrapData;
  loading: boolean;
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

export function PublicUserProvider({ children }: { children: ReactNode }) {
  const publicUserId = useMemo(() => getOrCreatePublicUserId(), []);
  const [bootstrap, setBootstrap] = useState<BootstrapData>(() => getEmptyBootstrap());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBootstrap();
      setBootstrap(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(async (callback: () => Promise<BootstrapData>) => {
    setSaving(true);
    try {
      const data = await callback();
      setBootstrap(data);
    } finally {
      setSaving(false);
    }
  }, []);

  const value = useMemo<PublicUserContextValue>(() => ({
    publicUserId,
    bootstrap,
    loading,
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
