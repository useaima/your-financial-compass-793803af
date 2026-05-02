import type { Session, User } from "@supabase/supabase-js";
import type {
  AffordabilityResult,
  AgentMode,
  BootstrapData,
  BudgetLimit,
  DraftTransaction,
  FinancialEntry,
  MediaAnalysisRequest,
  MediaAnalysisResult,
  OnboardingPayload,
  ReceiptForwardingDetails,
  SensitiveActionCodeRequest,
  SensitiveActionId,
  SensitiveActionVerificationResult,
  Subscription,
  UserGoal,
  UserProfile,
} from "@/lib/evaContracts";
import type { AuthProfileSeed } from "@/lib/authProfile";

export type SignUpPayload = {
  full_name: string;
  email: string;
  country: string;
  phone_number: string;
  password: string;
  updates_opt_in: boolean;
};

export type SignUpResult = {
  requiresEmailVerification: boolean;
};

export type WorkspaceUser = {
  id: string;
  email: string | null;
};

export type PublicUserContextValue = {
  session: Session | null;
  user: User | null;
  userId: string;
  legacyPublicUserId: string;
  isAuthenticated: boolean;
  authLoading: boolean;
  authProfileSeed: AuthProfileSeed;
  requiresPasswordSetup: boolean;
  isAdmin: boolean;
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
  updateAgentMode: (input: {
    agentMode: AgentMode;
    autopilotHighRiskEnabled?: boolean;
  }) => Promise<void>;
  runAgentPlanner: () => Promise<void>;
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
  analyzeReceiptImage: (imageDataUrl: string, fileName: string) => Promise<void>;
  analyzeMedia: (request: MediaAnalysisRequest) => Promise<MediaAnalysisResult>;
  requestSensitiveActionCode: (
    action: SensitiveActionId,
  ) => Promise<SensitiveActionCodeRequest>;
  verifySensitiveActionCode: (input: {
    action: SensitiveActionId;
    verificationId: string;
    code: string;
  }) => Promise<SensitiveActionVerificationResult>;
  getReceiptForwardingAddress: (
    securityVerificationId: string,
  ) => Promise<ReceiptForwardingDetails>;
  proposeSubscriptionAction: (input: {
    subscriptionId: string;
    proposalAction: "cancel" | "review";
    reason?: string | null;
  }) => Promise<void>;
  proposeBillAction: (input: {
    merchant: string;
    amount?: number;
    dueDate?: string | null;
    note?: string | null;
    proposalAction: "bill_reminder" | "merchant_follow_up";
  }) => Promise<void>;
  approveRequest: (input: {
    approvalRequestId: string;
    securityVerificationId: string;
  }) => Promise<void>;
  rejectRequest: (input: {
    approvalRequestId: string;
    reason?: string | null;
  }) => Promise<void>;
  dispatchApprovedRequest: (approvalRequestId: string) => Promise<void>;
  reconcileExecutionResult: (input: {
    executionReceiptId: string;
    outcome: "completed" | "failed" | "cancelled";
    note?: string | null;
  }) => Promise<void>;
  reviewDraftTransaction: (input: {
    draftTransactionId: string;
    decision: "approve" | "reject" | "edit";
    updates?: Partial<DraftTransaction>;
    securityVerificationId?: string | null;
  }) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
};
